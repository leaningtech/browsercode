<script lang="ts">
	import { untrack } from 'svelte';
	import markUrl from '$lib/assets/browserpod.svg';

	let {
		lines = [],
		activeLine = -1,
		flash = false,
		onFlashComplete
	}: {
		/** Ordered boot-log messages, dmesg-style (lowercase). */
		lines?: readonly string[];
		/** Highest line index real progress justifies revealing (-1 before boot starts). */
		activeLine?: number;
		flash?: boolean;
		onFlashComplete?: () => void;
	} = $props();

	// Handoff to the preview fires at LAUNCH_MS
	const LAUNCH_MS = 620;
	const ARRIVAL_MS = 900;

	// Road-scene geometry, shared by the canvas and the rail's vertical placement.
	const CAM_H = 30; // camera height above the road (world units)
	const CELL = 34; // grid cell size (world units)
	const Z_FAR = 2200; // furthest road row drawn
	const MARK_W = 35; // mark width (world units)
	const MARK_ASPECT = 2199 / 2000; // browserpod.svg intrinsic aspect (height / width)
	const CRUISE_Z = 230; // how far ahead of the camera the mark rides
	const NEAR_Z = 70; // closest the pod gets on arrival (smaller z = bigger, perspective growth)
	const HORIZON_FRAC = 0.46; // horizon height as a fraction of the canvas
	const FOCAL_FRAC = 0.55; // focal length as a fraction of the longest side

	// Canvas size, tracked so the stage rail can sit right under where the mark rests on the road.
	let sceneW = $state(0);
	let sceneH = $state(0);
	let railTop = $derived.by(() => {
		if (!sceneH) return 0;
		const horizon = sceneH * HORIZON_FRAC;
		const focal = Math.max(sceneW, sceneH) * FOCAL_FRAC;
		const roadY = horizon + (focal * CAM_H) / CRUISE_Z; // the mark's bottom edge at rest
		return roadY + 14;
	});

	$effect(() => {
		if (!flash) return;
		const id = setTimeout(() => onFlashComplete?.(), LAUNCH_MS);
		return () => clearTimeout(id);
	});

	const reduceMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// Screen-reader status: the current step only, not the streaming log.
	let srStatus = $derived(activeLine >= 0 && activeLine < lines.length ? lines[activeLine] : '');

	// ── boot log (bottom-left) ──

	// Reveal lines one at a time up to what real progress justifies (activeLine + 1), and drop the
	// ones past it at once when a rebuild steps back. untrack keeps the effect keyed to activeLine,
	// not to its own writes to `revealed`.
	let revealed = $state(0);
	$effect(() => {
		const target = activeLine + 1;
		if (reduceMotion || untrack(() => revealed) > target) {
			revealed = target;
			return;
		}
		let id: ReturnType<typeof setTimeout>;
		const tick = () => {
			const current = untrack(() => revealed);
			if (current >= target) return;
			revealed = current + 1;
			id = setTimeout(tick, 380);
		};
		if (untrack(() => revealed) < target) id = setTimeout(tick, 380);
		return () => clearTimeout(id);
	});

	const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	let spin = $state(0);
	$effect(() => {
		if (reduceMotion) return;
		const id = setInterval(() => (spin = (spin + 1) % SPINNER.length), 90);
		return () => clearInterval(id);
	});
	let spinner = $derived(reduceMotion ? '⠿' : SPINNER[spin]);

	// Elapsed on the active step, so a long stage (pod boot, install) doesn't look frozen.
	let sinceStage = $state(0);
	$effect(() => {
		const stage = activeLine; // reading it resets the timer on each stage change
		sinceStage = 0;
		if (reduceMotion || stage < 0) return;
		const started = performance.now();
		const id = setInterval(() => {
			sinceStage = (performance.now() - started) / 1000;
		}, 250);
		return () => clearInterval(id);
	});

	let shown = $derived(lines.slice(0, revealed));

	// ── stage rail (below the logo) ──

	let elapsed = $state(0);
	$effect(() => {
		const started = performance.now();
		const id = setInterval(() => {
			elapsed = (performance.now() - started) / 1000;
		}, 100);
		return () => clearInterval(id);
	});

	// Canvas road scene. One perspective projection (screen size ∝ 1/z) drives grid, horizon and mark.
	function roadScene(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		// Non-null const so the type survives into the frame() closure.
		const scene: CanvasRenderingContext2D = ctx;

		// The mark asset is a raster (a base64 PNG wrapped in SVG). Drawing the full-res bitmap
		// heavily downscaled every frame makes its edges shimmer as it drifts, so bake a flat-white
		// copy (source-in keeps the shape's alpha) at roughly its on-screen size and draw that ~1:1.
		const mark = new Image();
		let whiteMark: HTMLCanvasElement | null = null;
		let whiteMarkPx = 0;

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		let w = 0;
		let h = 0;
		let raf = 0;
		let last: number | null = null;
		let scroll = 0;
		let launchAt: number | null = null;

		// Rebuild the white mark at the mark's cruise (resting) size in device pixels, so the
		// per-frame blit is ~1:1 and translates smoothly instead of shimmering.
		function buildWhiteMark() {
			if (!mark.complete || !mark.naturalWidth || !w || !h) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const focal = Math.max(w, h) * FOCAL_FRAC;
			const px = Math.max(1, Math.round(((focal * MARK_W) / CRUISE_Z) * dpr));
			if (whiteMark && whiteMarkPx === px) return;
			const oc = document.createElement('canvas');
			oc.width = px;
			oc.height = Math.max(1, Math.round(px * MARK_ASPECT));
			const octx = oc.getContext('2d');
			if (!octx) return;
			octx.imageSmoothingEnabled = true;
			octx.imageSmoothingQuality = 'high';
			octx.drawImage(mark, 0, 0, oc.width, oc.height);
			octx.globalCompositeOperation = 'source-in';
			octx.fillStyle = '#ffffff';
			octx.fillRect(0, 0, oc.width, oc.height);
			whiteMark = oc;
			whiteMarkPx = px;
		}
		mark.onload = buildWhiteMark;
		mark.src = markUrl;

		const ro = new ResizeObserver(() => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			w = canvas.clientWidth;
			h = canvas.clientHeight;
			sceneW = w;
			sceneH = h;
			canvas.width = Math.max(1, Math.round(w * dpr));
			canvas.height = Math.max(1, Math.round(h * dpr));
			scene.setTransform(dpr, 0, 0, dpr, 0, 0);
			// Setting canvas.width resets smoothing to the default low quality — restore it.
			scene.imageSmoothingEnabled = true;
			scene.imageSmoothingQuality = 'high';
			buildWhiteMark();
		});
		ro.observe(canvas);

		function frame(now: number) {
			raf = requestAnimationFrame(frame);
			if (!w || !h) return;
			const dt = last == null ? 0 : (now - last) / 1000;
			last = now;
			const t = now / 1000;

			const cx = w / 2;
			const horizon = h * HORIZON_FRAC;
			const roadH = h - horizon;
			const focal = Math.max(w, h) * FOCAL_FRAC;

			// Arrival: the pod accelerates toward the camera and blooms. `arrive` runs a little past
			// 1 so it's still moving when the overlay starts dissolving.
			let arrive = 0;
			if (flash) {
				if (launchAt == null) launchAt = now;
				arrive = Math.min(1.25, (now - launchAt) / ARRIVAL_MS);
			} else {
				launchAt = null;
			}
			const ease = arrive * arrive; // ease-in
			// Brightness follows the zoom (not elapsed time) so it peaks late, during the dissolve —
			// no early camera-flash white-out.
			const bloom = Math.min(1, ease);

			if (!reduceMotion) scroll += dt * (60 + ease * 1400); // road rushes as the pod accelerates in

			scene.fillStyle = '#050505';
			scene.fillRect(0, 0, w, h);

			// glow centred on the horizon, filled full-height so the haze fades on both sides of the
			// horizon instead of cutting off in a hard seam at y = horizon
			const sky = scene.createRadialGradient(cx, horizon, 0, cx, horizon, h * 0.55);
			sky.addColorStop(0, 'rgba(255,255,255,0.1)');
			sky.addColorStop(1, 'rgba(255,255,255,0)');
			scene.fillStyle = sky;
			scene.fillRect(0, 0, w, h);

			// grid rows, y = horizon + f·camH / z
			scene.lineWidth = 1;
			for (let z = CELL - (scroll % CELL); z < Z_FAR; z += CELL) {
				const y = horizon + (focal * CAM_H) / z;
				if (y > h + 20) continue;
				if (y < horizon + 0.5) break;
				const nearness = (y - horizon) / roadH; // 0 at horizon → 1 at bottom
				// alpha must reach zero at the horizon: far rows land sub-pixel apart there, and any
				// constant floor stacks them into a bright band with a hard cutoff at Z_FAR
				scene.strokeStyle = `rgba(255,255,255,${nearness * 0.32})`;
				scene.beginPath();
				scene.moveTo(0, y);
				scene.lineTo(w, y);
				scene.stroke();
			}

			// grid columns → vanishing point
			const spread = roadH / CAM_H; // bottom-edge px per world unit of x
			const cols = Math.ceil(cx / (CELL * spread)) + 1;
			for (let m = -cols; m <= cols; m++) {
				const xBottom = cx + m * CELL * spread;
				const g = scene.createLinearGradient(cx, horizon, xBottom, h);
				g.addColorStop(0, 'rgba(255,255,255,0)');
				g.addColorStop(1, 'rgba(255,255,255,0.22)');
				scene.strokeStyle = g;
				scene.beginPath();
				scene.moveTo(cx, horizon);
				scene.lineTo(xBottom, h);
				scene.stroke();
			}

			// the mark: gentle bob/sway while cruising; surges toward the camera and recenters on arrival
			const bob = reduceMotion ? 0 : Math.sin(t * 1.1) * 9;
			const sway = reduceMotion ? 0 : Math.sin(t * 0.6) * 5;
			const arriveZoom = reduceMotion ? 0 : ease;
			const z = Math.max(NEAR_Z, CRUISE_Z + bob - arriveZoom * (CRUISE_Z - NEAR_Z));
			const size = (focal * MARK_W) / z;
			const markH = size * MARK_ASPECT;
			const markX = cx + (focal * sway * (1 - Math.min(1, arrive))) / z;
			const roadY = horizon + (focal * CAM_H) / z;
			const centerY = roadY - markH / 2;

			if (whiteMark) {
				scene.drawImage(whiteMark, markX - size / 2, centerY - markH / 2, size, markH);
			}

			// arrival bloom: a soft radial light from the pod (no hard white slab) so the overlay
			// dissolves gently into the preview
			if (bloom > 0) {
				const br = Math.max(w, h) * (0.2 + bloom * 0.95);
				const glowWash = scene.createRadialGradient(markX, centerY, 0, markX, centerY, br);
				glowWash.addColorStop(0, `rgba(255,255,255,${0.92 * bloom})`);
				glowWash.addColorStop(0.5, `rgba(255,255,255,${0.55 * bloom})`);
				glowWash.addColorStop(1, 'rgba(255,255,255,0)');
				scene.fillStyle = glowWash;
				scene.fillRect(0, 0, w, h);
			}
		}
		raf = requestAnimationFrame(frame);

		return {
			destroy() {
				cancelAnimationFrame(raf);
				ro.disconnect();
			}
		};
	}
</script>

<div class="road-scene">
	<canvas class="road-canvas" use:roadScene aria-hidden="true"></canvas>

	<!-- Both readouts are aria-hidden; the polite status below carries the current step to screen readers. -->

	<!-- stage readout, just below where the mark rests on the road -->
	<div class="hud" class:hud-hide={flash} style="top: {railTop}px" aria-hidden="true">
		<div class="line">
			<span class="clock">[{elapsed.toFixed(1)}]</span>
			{#key srStatus}
				<span class="label">{srStatus}</span>
			{/key}
			<span class="cursor"></span>
		</div>
	</div>

	<!-- streaming boot log, bottom-left -->
	<div class="boot-log" class:boot-log-hide={flash} aria-hidden="true">
		{#each shown as line, i (line)}
			{@const done = i < activeLine}
			{@const active = i === activeLine}
			<div class="log-line" class:done>
				<span class="gate">[<span class="tok" class:ok={done}>{done ? 'OK' : spinner}</span>]</span>
				<span class="msg">{line}</span>
				{#if active && sinceStage >= 2}<span class="wait">{Math.floor(sinceStage)}s</span>{/if}
			</div>
		{/each}
	</div>

	<span class="sr-only" role="status" aria-live="polite">{srStatus}</span>
</div>

<style>
	.road-scene {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: #050505;
	}
	.road-canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}

	/* ── boot-log styles (bottom-left) ── */

	.boot-log {
		position: absolute;
		left: clamp(14px, 3vw, 28px);
		bottom: clamp(14px, 4vh, 26px);
		z-index: 3;
		display: flex;
		flex-direction: column;
		gap: 5px;
		/* Stack Sans Text must be self-hosted (same-origin @font-face): the page is cross-origin
		   isolated for SharedArrayBuffer, so Google Fonts API assets are off the table. */
		font-family: 'Stack Sans Text', system-ui, sans-serif;
		font-size: 12px;
		line-height: 1.3;
		transition: opacity 0.2s ease;
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7); /* legibility over the grid */
	}
	.boot-log-hide {
		opacity: 0;
	}

	.log-line {
		display: flex;
		align-items: center;
		gap: 9px;
		white-space: nowrap;
		animation: log-in 0.22s ease both;
	}

	.gate {
		color: rgba(255, 255, 255, 0.3);
	}
	.tok {
		display: inline-block;
		/* min-, not fixed, width: 'OK' can run wider than 2ch in a proportional face */
		min-width: 2ch;
		text-align: center;
		color: rgba(255, 255, 255, 0.9);
	}
	.tok.ok {
		color: #ffffff; /* completed step lands at full brightness */
		font-weight: 600;
	}

	/* active step reads bright; completed steps recede into history */
	.msg {
		color: rgba(255, 255, 255, 0.92);
	}
	.log-line.done .msg {
		color: rgba(255, 255, 255, 0.4);
	}
	.wait {
		color: rgba(255, 255, 255, 0.4);
		font-variant-numeric: tabular-nums;
	}

	@keyframes log-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ── stage readout styles (below the logo) ── */

	/* `top` is set inline to sit just below where the mark rests on the road. */
	.hud {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 16px;
		transition: opacity 0.2s ease;
	}
	.hud-hide {
		opacity: 0;
	}

	.line {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: 'Stack Sans Text', system-ui, sans-serif;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.clock {
		color: rgba(255, 255, 255, 0.4);
		font-variant-numeric: tabular-nums;
		/* fixed width so the ticking digit never nudges the label */
		min-width: 3.6em;
		text-align: right;
	}
	.label {
		color: rgba(255, 255, 255, 0.92);
		animation: label-in 0.22s ease both;
	}
	.cursor {
		width: 7px;
		height: 13px;
		background: #ffffff;
		box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
		animation: cursor-blink 1s steps(2, start) infinite;
	}
	@keyframes label-in {
		from {
			opacity: 0;
			transform: translateY(3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes cursor-blink {
		50% {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.log-line,
		.label {
			animation: none;
		}
		.cursor {
			animation: none;
			opacity: 0.7;
		}
	}
</style>
