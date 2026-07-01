<script lang="ts">
	import { onMount } from 'svelte';
	import bgUrl from '$lib/assets/preview-background.png';
	import markUrl from '$lib/assets/favicon.svg';

	// `label` names what is booting (framework label, or owner/repo in GitHub mode).
	// `active` is true while still loading; flipping it to false cues the closing splash.
	let { label = 'preview', active = true }: { label?: string; active?: boolean } = $props();

	let canvas: HTMLCanvasElement | null = $state(null);
	// If WebGL2 is unavailable we fall back to the static image.
	let webglFailed = $state(false);

	// Assigned once the render loop is live; injects a final ripple from center.
	let splash: (() => void) | null = null;
	$effect(() => {
		if (!active) splash?.();
	});

	// ── Effect tuning ─────────────────────────────────────────────────────────
	// Runtime dials fed to the shader and animation loop.
	const TUNING = {
		displacement: 0.035, // overall ripple/refraction strength
		metalness: 0.75, // 0 = matte, 1 = fully metallic reflection
		roughness: 0.25, // 0 = sharp mirror highlight, 1 = soft
		mouseEnergyGain: 4.5, // how much a cursor move feeds the ripple
		mouseEnergyDecay: 0.92 // per-frame fade of that energy (higher = longer trail)
	};

	const VERT = `#version 300 es
	in vec2 aPos;
	out vec2 vUv;
	void main() {
		vUv = aPos * 0.5 + 0.5;
		gl_Position = vec4(aPos, 0.0, 1.0);
	}`;

	// Screen-space liquid: a procedural height field ripples a textured quad and adds a
	// metallic specular/reflection response. The ripple is masked toward the floor so it
	// reads as a reflective liquid plane, not a wobbling photo.
	const FRAG = `#version 300 es
	precision highp float;
	in vec2 vUv;
	out vec4 outColor;
	uniform sampler2D uTex;
	uniform float uTime;
	uniform vec2 uRes;
	uniform vec2 uImg;
	uniform float uDisp;
	uniform float uMetal;
	uniform float uRough;
	uniform vec2 uMouse;
	uniform float uMouseStrength;

	// ── Ripple shape (edit here; material dials are the JS TUNING object) ──
	const float FLOOR_BASE = 0.28;    // baseline ripple away from the floor
	const float FLOOR_GAIN = 0.72;    // extra ripple on the reflective floor
	const float MOUSE_LIFT = 1.0;     // how much the pointer lifts displacement off-floor
	const float RIPPLE_FREQ = 9.0;    // pointer ripple ring spacing
	const float RIPPLE_SPEED = 7.0;   // pointer ripple travel speed
	const float RIPPLE_FALLOFF = 2.4; // how tightly the pointer ripple stays local
	const float RIPPLE_AMP = 0.7;     // pointer ripple height

	// Cover-fit the image to the canvas (like background-size: cover).
	vec2 coverUv(vec2 uv) {
		float canvasAspect = uRes.x / uRes.y;
		float imgAspect = uImg.x / uImg.y;
		vec2 scale = canvasAspect > imgAspect
			? vec2(1.0, imgAspect / canvasAspect)
			: vec2(canvasAspect / imgAspect, 1.0);
		return (uv - 0.5) * scale + 0.5;
	}

	// Sum of flowing waves + one domain-warped term for organic, non-repeating motion.
	float wave(vec2 p, float t) {
		float v = 0.0;
		v += sin(p.x * 3.0 + t * 0.55) * 0.50;
		v += sin(p.y * 4.2 - t * 0.42) * 0.42;
		v += sin((p.x + p.y) * 2.6 + t * 0.66) * 0.34;
		v += sin(p.x * 6.5 + sin(p.y * 3.2 + t * 0.40) * 1.6 - t * 0.85) * 0.22;
		return v;
	}

	// Pointer position mapped into the same aspect-corrected field space as p.
	vec2 mousePoint() {
		return uMouse * vec2(uRes.x / uRes.y, 1.0) * 3.0;
	}

	// Concentric ripple emanating from the pointer, folded into the height field so it
	// refracts and catches specular exactly like the ambient waves.
	float mouseRipple(vec2 pp) {
		if (uMouseStrength <= 0.0) return 0.0;
		float d = distance(pp, mousePoint());
		return sin(d * RIPPLE_FREQ - uTime * RIPPLE_SPEED) * exp(-d * RIPPLE_FALLOFF) * uMouseStrength * RIPPLE_AMP;
	}

	void main() {
		vec2 uv = coverUv(vUv);
		float t = uTime;

		// Aspect-corrected field coordinates so ripples stay circular.
		vec2 p = vUv * vec2(uRes.x / uRes.y, 1.0) * 3.0;

		// vUv.y is 0 at the bottom (canvas is drawn with a flipped texture upload), so the
		// floor gets the strongest displacement and the arches/sky only shimmer faintly.
		float floorMask = smoothstep(0.6, 0.0, vUv.y);

		// Cursor "activity" envelope lifts displacement near the pointer even off the floor,
		// so the whole surface — not just the reflective floor — responds to the mouse.
		float mouseEnv = uMouseStrength * exp(-distance(p, mousePoint()) * RIPPLE_FALLOFF);
		float amp = (FLOOR_BASE + FLOOR_GAIN * floorMask + mouseEnv * MOUSE_LIFT) * uDisp;

		float e = 0.0018;
		float hR = wave(p + vec2(e, 0.0), t) + mouseRipple(p + vec2(e, 0.0));
		float hL = wave(p - vec2(e, 0.0), t) + mouseRipple(p - vec2(e, 0.0));
		float hU = wave(p + vec2(0.0, e), t) + mouseRipple(p + vec2(0.0, e));
		float hD = wave(p - vec2(0.0, e), t) + mouseRipple(p - vec2(0.0, e));
		float dx = (hR - hL) / (2.0 * e);
		float dy = (hU - hD) / (2.0 * e);
		vec3 n = normalize(vec3(-dx, -dy, 6.0));

		vec2 disp = n.xy * amp;
		vec3 base = texture(uTex, uv + disp).rgb;
		vec3 refl = texture(uTex, uv + disp * 3.2 + vec2(0.0, 0.02)).rgb;

		vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
		vec3 V = vec3(0.0, 0.0, 1.0);
		vec3 H = normalize(L + V);
		float shininess = mix(12.0, 240.0, 1.0 - uRough);
		float spec = pow(max(dot(n, H), 0.0), shininess);
		float fresnel = pow(1.0 - max(dot(n, V), 0.0), 4.0);

		// Metalness tints the reflection/specular by the surface colour and drops diffuse.
		vec3 metalTint = mix(vec3(1.0), base, uMetal);
		vec3 col = base;
		col = mix(col, refl * metalTint, uMetal * (0.35 + 0.4 * fresnel) * floorMask);
		col += spec * metalTint * mix(0.4, 1.1, uMetal);
		col += fresnel * 0.12 * vec3(1.0, 0.75, 0.85) * floorMask;

		float vig = smoothstep(1.25, 0.35, length(vUv - 0.5));
		col *= mix(0.82, 1.0, vig);

		outColor = vec4(col, 1.0);
	}`;

	onMount(() => {
		const el = canvas;
		if (!el) return;

		const glCtx = el.getContext('webgl2', { antialias: false, alpha: false });
		if (!glCtx) {
			webglFailed = true;
			return;
		}
		// Bind to a non-null local so the hoisted render closures below keep the narrowed type.
		const gl: WebGL2RenderingContext = glCtx;

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const STATIC_PHASE = 2.4;

		function compile(type: number, src: string): WebGLShader | null {
			const shader = gl.createShader(type);
			if (!shader) return null;
			gl.shaderSource(shader, src.replace(/\t/g, ''));
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.error('PreviewLoader shader error:', gl.getShaderInfoLog(shader));
				gl.deleteShader(shader);
				return null;
			}
			return shader;
		}

		const vs = compile(gl.VERTEX_SHADER, VERT);
		const fs = compile(gl.FRAGMENT_SHADER, FRAG);
		const program = gl.createProgram();
		if (!vs || !fs || !program) {
			webglFailed = true;
			return;
		}
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('PreviewLoader link error:', gl.getProgramInfoLog(program));
			webglFailed = true;
			return;
		}
		gl.useProgram(program);

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		// Two triangles covering clip space.
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
			gl.STATIC_DRAW
		);
		const aPos = gl.getAttribLocation(program, 'aPos');
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		const uTime = gl.getUniformLocation(program, 'uTime');
		const uRes = gl.getUniformLocation(program, 'uRes');
		const uImg = gl.getUniformLocation(program, 'uImg');
		const uDisp = gl.getUniformLocation(program, 'uDisp');
		const uMetal = gl.getUniformLocation(program, 'uMetal');
		const uRough = gl.getUniformLocation(program, 'uRough');
		const uMouse = gl.getUniformLocation(program, 'uMouse');
		const uMouseStrength = gl.getUniformLocation(program, 'uMouseStrength');

		gl.uniform1f(uDisp, TUNING.displacement);
		gl.uniform1f(uMetal, TUNING.metalness);
		gl.uniform1f(uRough, TUNING.roughness);
		gl.uniform2f(uImg, 1, 1);
		gl.uniform2f(uMouse, 0.5, 0.5);
		gl.uniform1f(uMouseStrength, 0);

		// On-brand placeholder until the image decodes (the PNG is a few MB).
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			1,
			1,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			new Uint8Array([40, 12, 34, 255])
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		let disposed = false;
		let imgLoaded = false;
		let raf = 0;
		const start = performance.now();

		// Pointer reactivity is driven by movement, not presence: each move feeds "energy"
		// that decays every frame, so a moving cursor makes ripples and a still one settles.
		let mouseX = 0.5;
		let mouseY = 0.5;
		let lastX = 0.5;
		let lastY = 0.5;
		let hasLast = false;
		let mouseEnergy = 0;

		function onPointerMove(ev: PointerEvent) {
			if (!el) return;
			const rect = el.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return;
			mouseX = (ev.clientX - rect.left) / rect.width;
			// Flip Y to match the shader's bottom-origin vUv.
			mouseY = 1 - (ev.clientY - rect.top) / rect.height;
			// Add energy proportional to how far the cursor travelled (a flick splashes more).
			if (hasLast)
				mouseEnergy = Math.min(
					1,
					mouseEnergy + Math.hypot(mouseX - lastX, mouseY - lastY) * TUNING.mouseEnergyGain
				);
			lastX = mouseX;
			lastY = mouseY;
			hasLast = true;
		}

		// Closing flourish: a full-strength ripple from center, driven by the same energy
		// channel as the pointer, so it breaks the surface once as the loader fades out.
		if (!reduce)
			splash = () => {
				mouseX = 0.5;
				mouseY = 0.5;
				mouseEnergy = 1;
			};

		// Re-entering shouldn't register the gap as one huge jump.
		function onPointerLeave() {
			hasLast = false;
		}

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		function resize() {
			if (!el) return;
			const w = Math.max(1, Math.round(el.clientWidth * dpr));
			const h = Math.max(1, Math.round(el.clientHeight * dpr));
			if (el.width === w && el.height === h) return;
			el.width = w;
			el.height = h;
			gl.viewport(0, 0, w, h);
			gl.uniform2f(uRes, w, h);
			if (reduce && imgLoaded) draw(STATIC_PHASE);
		}

		function draw(t: number) {
			gl.uniform1f(uTime, t);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}

		function loop(now: number) {
			if (disposed) return;
			// Decay the ripple energy each frame so motion fades out shortly after stopping.
			mouseEnergy *= TUNING.mouseEnergyDecay;
			gl.uniform2f(uMouse, mouseX, mouseY);
			gl.uniform1f(uMouseStrength, mouseEnergy);
			draw((now - start) / 1000);
			raf = requestAnimationFrame(loop);
		}

		const img = new Image();
		img.onload = () => {
			if (disposed) return;
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
			gl.uniform2f(uImg, img.naturalWidth, img.naturalHeight);
			imgLoaded = true;
			if (reduce) draw(STATIC_PHASE);
		};
		img.src = bgUrl;

		const ro = new ResizeObserver(() => resize());
		ro.observe(el);
		resize();

		// Reduced motion: render a single frozen frame, and skip pointer reactivity entirely.
		if (reduce) {
			draw(STATIC_PHASE);
		} else {
			el.addEventListener('pointermove', onPointerMove);
			el.addEventListener('pointerleave', onPointerLeave);
			raf = requestAnimationFrame(loop);
		}

		return () => {
			disposed = true;
			splash = null;
			cancelAnimationFrame(raf);
			ro.disconnect();
			el.removeEventListener('pointermove', onPointerMove);
			el.removeEventListener('pointerleave', onPointerLeave);
			img.onload = null;
			gl.deleteTexture(tex);
			gl.deleteBuffer(buffer);
			gl.deleteVertexArray(vao);
			gl.deleteProgram(program);
			gl.deleteShader(vs);
			gl.deleteShader(fs);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		};
	});
</script>

<div class="pod-loader" role="status" aria-label="Loading preview for {label}">
	{#if webglFailed}
		<div class="fallback" style="background-image: url({bgUrl});"></div>
	{:else}
		<canvas bind:this={canvas} aria-hidden="true"></canvas>
	{/if}

	<div class="scrim" aria-hidden="true"></div>

	<div class="brand">
		<div class="lockup">
			<img src={markUrl} alt="" class="mark" />
			<span class="wordmark">BrowserCode</span>
		</div>
		<div class="status">
			<span class="status-text">Booting {label}</span><span class="dots" aria-hidden="true"
			></span><span class="cursor" aria-hidden="true"></span>
		</div>
	</div>
</div>

<style>
	.pod-loader {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: #08060d;
	}
	canvas,
	.fallback {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.fallback {
		background-size: cover;
		background-position: center;
	}

	/* Legibility scrim behind the bottom-left lockup only. */
	.scrim {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			120% 90% at 0% 100%,
			rgba(8, 6, 13, 0.72) 0%,
			rgba(8, 6, 13, 0.32) 32%,
			transparent 62%
		);
		pointer-events: none;
	}

	.brand {
		position: absolute;
		bottom: clamp(1rem, 4vh, 2.25rem);
		left: clamp(1rem, 3vw, 2.25rem);
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.lockup {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.mark {
		width: 32px;
		height: 32px;
		filter: drop-shadow(0 1px 6px rgba(0, 0, 0, 0.55));
	}
	.wordmark {
		font-family:
			ui-sans-serif,
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		font-size: 1.35rem;
		font-weight: 600;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: #f6e9f0;
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.55);
	}

	.status {
		display: flex;
		align-items: center;
		font-family: ui-monospace, 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
		font-size: 0.9rem;
		letter-spacing: 0.02em;
		color: rgba(246, 233, 240, 0.72);
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
	}
	/* Terminal-style animated ellipsis. */
	.dots::after {
		content: '';
		animation: dots 1.4s steps(4, end) infinite;
	}
	/* Blinking block cursor, coral to echo the rim light in the render. */
	.cursor {
		width: 0.5em;
		height: 1.05em;
		margin-left: 0.35em;
		background: #ff8a5c;
		box-shadow: 0 0 8px rgba(255, 138, 92, 0.6);
		animation: blink 1.05s steps(2, start) infinite;
	}

	@keyframes dots {
		0% {
			content: '';
		}
		25% {
			content: '.';
		}
		50% {
			content: '..';
		}
		75% {
			content: '...';
		}
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dots::after {
			content: '…';
			animation: none;
		}
		.cursor {
			animation: none;
			opacity: 0.7;
		}
	}
</style>
