<script lang="ts">
	// Animated grid backdrop for the landing page hero: an ambient "water" wave motion plus a
	// cursor-reactive bulge, tinted by two radial gradients (azure top-left, orchid bottom-right)
	// standing in for the static .bc-page-bg glow used on other pages. Sized to, and interactive
	// within, its parent element. The parent must be `position: relative` (and typically
	// `overflow: hidden`).
	type Props = {
		gridSpacing?: number;
		waveIntensity?: number;
		cursorStrength?: number;
		patchiness?: number;
		lineColor?: string;
		paused?: boolean;
	};

	let {
		gridSpacing = 46,
		waveIntensity = 1,
		cursorStrength = 1,
		patchiness = 0.45,
		lineColor = '#c73da6',
		paused = false
	}: Props = $props();

	/** Holds the alpha step under 1/255. */
	const VIS_LEVELS = 32;

	const IDLE_INTERVAL_MS = 1000 / 30;
	const SETTLED_PX = 0.5;

	const CURSOR_R = 64;
	const CURSOR_CUTOFF = 3.5 * CURSOR_R;
	const GLOW_MIN = 0.004;

	/** Per 60Hz frame, rescaled to the observed frame time. */
	const CURSOR_EASE = 0.08;

	const DOT_R = 1;
	const TAU = Math.PI * 2;

	let canvas = $state<HTMLCanvasElement>();

	function hexToRgb(hex: string): { r: number; g: number; b: number } {
		const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return m
			? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
			: { r: 74, g: 125, b: 255 };
	}

	$effect(() => {
		const el = canvas;
		const parent = el?.parentElement;
		const ctx = el?.getContext('2d');
		if (!el || !parent || !ctx) return;

		const rgb = hexToRgb(lineColor);
		const stroke = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		let W = 0,
			H = 0,
			cols = 0,
			rows = 0,
			ox = 0,
			oy = 0;
		let azureGrad: CanvasGradient | null = null;
		let orchidGrad: CanvasGradient | null = null;

		let px = new Float32Array(0);
		let py = new Float32Array(0);
		let glow = new Float32Array(0);
		let visLevel = new Uint8Array(0);
		let litDots = new Int32Array(0);
		let litCount = 0;

		const visOf = new Float32Array(VIS_LEVELS);
		for (let l = 0; l < VIS_LEVELS; l++) {
			visOf[l] = 1 - patchiness + patchiness * (l / (VIS_LEVELS - 1));
		}

		// smoothed cursor position (starts off-screen)
		let tx = -9999,
			ty = -9999;
		let cx = -9999,
			cy = -9999;
		let cursorActive = false;

		function resize(): void {
			const r = parent!.getBoundingClientRect();
			W = r.width;
			H = r.height;
			el!.width = Math.round(W * dpr);
			el!.height = Math.round(H * dpr);
			ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
			cols = Math.ceil(W / gridSpacing) + 3;
			rows = Math.ceil(H / gridSpacing) + 3;
			// centre the grid so it bleeds past the edges
			ox = (W - (cols - 1) * gridSpacing) / 2;
			oy = (H - (rows - 1) * gridSpacing) / 2;

			const points = cols * rows;
			px = new Float32Array(points);
			py = new Float32Array(points);
			glow = new Float32Array(points);
			visLevel = new Uint8Array(points);
			litDots = new Int32Array(points);

			const az = ctx!.createRadialGradient(0.12 * W, 0.08 * H, 0, 0.12 * W, 0.08 * H, 0.6 * 680);
			az.addColorStop(0, 'rgba(74,125,255,0.32)');
			az.addColorStop(1, 'rgba(74,125,255,0)');
			const orc = ctx!.createRadialGradient(0.88 * W, 0.92 * H, 0, 0.88 * W, 0.92 * H, 0.6 * 560);
			orc.addColorStop(0, 'rgba(199,61,166,0.26)');
			orc.addColorStop(1, 'rgba(199,61,166,0)');
			azureGrad = az;
			orchidGrad = orc;
		}
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(parent);

		function onMove(e: MouseEvent): void {
			const r = parent!.getBoundingClientRect();
			tx = e.clientX - r.left;
			ty = e.clientY - r.top;
			if (!cursorActive) {
				cx = tx;
				cy = ty;
				cursorActive = true;
			}
		}
		function onLeave(): void {
			cursorActive = false;
			tx = -9999;
			ty = -9999;
		}
		parent.addEventListener('mousemove', onMove);
		parent.addEventListener('mouseleave', onLeave);

		const cursorPush = 30 * cursorStrength;

		// how deeply patches fade out (0 = always fully visible, 1 = fully vanish)
		const smoothstep = (a: number, b: number, x: number): number => {
			const tt = Math.min(1, Math.max(0, (x - a) / (b - a)));
			return tt * tt * (3 - 2 * tt);
		};

		const start = performance.now();
		// A rAF timestamp can predate `start`, so the first frame is due outright.
		let last = -Infinity;
		let raf = 0;

		function draw(now: number): void {
			const dt = now - last;
			const chasing =
				cursorActive && (Math.abs(tx - cx) > SETTLED_PX || Math.abs(ty - cy) > SETTLED_PX);
			const due = chasing || dt >= IDLE_INTERVAL_MS - 1;
			if (due) last = now;
			// Reduced motion gets one static frame, so stop only once one has been drawn.
			if (!reduceMotion || !due || paused) raf = requestAnimationFrame(draw);
			if (!due || paused) return;

			const t = (now - start) / 1000;
			ctx!.clearRect(0, 0, W, H);

			// ease smoothed cursor toward target. The "follows like water" lag
			const ease = 1 - Math.pow(1 - CURSOR_EASE, dt / (1000 / 60));
			cx += (tx - cx) * ease;
			cy += (ty - cy) * ease;

			const levelSpan = VIS_LEVELS - 1;
			for (let j = 0; j < rows; j++) {
				const by = oy + j * gridSpacing;
				const row = j * cols;
				for (let i = 0; i < cols; i++) {
					const bx = ox + i * gridSpacing;

					// ambient water motion; layered sines
					const dx =
						(Math.sin(by * 0.021 + t * 0.9) * 6 + Math.sin((bx + by) * 0.015 + t * 0.6) * 4) *
						waveIntensity;
					const dy =
						(Math.cos(bx * 0.02 + t * 0.8) * 6 +
							Math.cos((bx - by) * 0.018 + t * 0.7) * 4 +
							Math.sin(bx * 0.03 + t * 1.1) * 3) *
						waveIntensity;

					const k = row + i;
					px[k] = bx + dx;
					py[k] = by + dy;

					// slow-drifting visibility field; Large blobs fade fully out and back
					const n =
						Math.sin(bx * 0.0055 + t * 0.22) * Math.cos(by * 0.006 - t * 0.17) +
						0.6 * Math.sin((bx - by) * 0.004 + t * 0.11);
					visLevel[k] = Math.round(smoothstep(-0.25, 0.7, n) * levelSpan);
				}
			}

			// cursor bulge; push outward, decaying with distance
			glow.fill(0);
			litCount = 0;
			let gi0 = 0,
				gi1 = -1,
				gj0 = 0,
				gj1 = -1;
			if (cursorActive) {
				gi0 = Math.max(0, Math.floor((cx - CURSOR_CUTOFF - ox) / gridSpacing));
				gi1 = Math.min(cols - 1, Math.ceil((cx + CURSOR_CUTOFF - ox) / gridSpacing));
				gj0 = Math.max(0, Math.floor((cy - CURSOR_CUTOFF - oy) / gridSpacing));
				gj1 = Math.min(rows - 1, Math.ceil((cy + CURSOR_CUTOFF - oy) / gridSpacing));
				for (let j = gj0; j <= gj1; j++) {
					const by = oy + j * gridSpacing;
					for (let i = gi0; i <= gi1; i++) {
						const bx = ox + i * gridSpacing;
						const ddx = bx - cx,
							ddy = by - cy;
						const d2 = ddx * ddx + ddy * ddy;
						const infl = Math.exp(-d2 / (2 * CURSOR_R * CURSOR_R));
						const d = Math.sqrt(d2) || 1;
						const k = j * cols + i;
						px[k] += (ddx / d) * cursorPush * infl;
						py[k] += (ddy / d) * cursorPush * infl;
						glow[k] = infl;
						if (infl > GLOW_MIN) litDots[litCount++] = k;
					}
				}
			}

			const linePaths: Path2D[] = new Array(VIS_LEVELS);
			const dotPaths: Path2D[] = new Array(VIS_LEVELS);
			for (let l = 0; l < VIS_LEVELS; l++) {
				linePaths[l] = new Path2D();
				dotPaths[l] = new Path2D();
			}
			for (let j = 0; j < rows; j++) {
				const row = j * cols;
				for (let i = 0; i < cols; i++) {
					const k = row + i;
					const l = visLevel[k];
					const x = px[k],
						y = py[k];

					// A lit dot swells, so it cannot ride a batch built at one radius.
					if (glow[k] <= GLOW_MIN) {
						const dot = dotPaths[l];
						dot.moveTo(x + DOT_R, y);
						dot.arc(x, y, DOT_R, 0, TAU);
					}

					// segment visibility = the dimmer of its two endpoints
					if (i < cols - 1) {
						const right = linePaths[Math.min(l, visLevel[k + 1])];
						right.moveTo(x, y);
						right.lineTo(px[k + 1], py[k + 1]);
					}
					if (j < rows - 1) {
						const down = linePaths[Math.min(l, visLevel[k + cols])];
						down.moveTo(x, y);
						down.lineTo(px[k + cols], py[k + cols]);
					}
				}
			}

			const baseA = 0.11;
			ctx!.lineWidth = 1;

			// 1) base grid; dim, faded by vis
			ctx!.globalCompositeOperation = 'source-over';
			ctx!.strokeStyle = stroke;
			for (let l = 0; l < VIS_LEVELS; l++) {
				ctx!.globalAlpha = baseA * visOf[l];
				ctx!.stroke(linePaths[l]);
			}

			// cursor glow ignores the vis fade, so hover always reveals
			ctx!.globalCompositeOperation = 'lighter';
			for (let j = gj0; j <= gj1; j++) {
				const row = j * cols;
				for (let i = gi0; i <= gi1; i++) {
					const k = row + i;
					if (i < cols - 1) {
						const g = Math.max(glow[k], glow[k + 1]);
						if (g > GLOW_MIN) {
							ctx!.globalAlpha = g * 0.18;
							ctx!.beginPath();
							ctx!.moveTo(px[k], py[k]);
							ctx!.lineTo(px[k + 1], py[k + 1]);
							ctx!.stroke();
						}
					}
					if (j < rows - 1) {
						const g = Math.max(glow[k], glow[k + cols]);
						if (g > GLOW_MIN) {
							ctx!.globalAlpha = g * 0.18;
							ctx!.beginPath();
							ctx!.moveTo(px[k], py[k]);
							ctx!.lineTo(px[k + cols], py[k + cols]);
							ctx!.stroke();
						}
					}
				}
			}

			// 2) gradient glow tinting the grid (additive), per-level so it fades with vis
			const drawGradLines = (grad: CanvasGradient): void => {
				ctx!.strokeStyle = grad;
				for (let l = 0; l < VIS_LEVELS; l++) {
					ctx!.globalAlpha = visOf[l];
					ctx!.stroke(linePaths[l]);
				}
			};
			drawGradLines(azureGrad!);
			drawGradLines(orchidGrad!);

			// node dots; dim base then gradient tint, all faded by vis
			ctx!.globalCompositeOperation = 'source-over';
			ctx!.fillStyle = 'rgb(183,205,255)';
			for (let l = 0; l < VIS_LEVELS; l++) {
				ctx!.globalAlpha = 0.18 * visOf[l];
				ctx!.fill(dotPaths[l]);
			}

			for (let n = 0; n < litCount; n++) {
				const k = litDots[n];
				const g = glow[k];
				ctx!.globalAlpha = 0.18 * visOf[visLevel[k]] + g * 0.28;
				ctx!.beginPath();
				ctx!.arc(px[k], py[k], DOT_R + g * 0.9, 0, TAU);
				ctx!.fill();
			}

			ctx!.globalCompositeOperation = 'lighter';
			const drawGradDots = (grad: CanvasGradient): void => {
				ctx!.fillStyle = grad;
				for (let l = 0; l < VIS_LEVELS; l++) {
					ctx!.globalAlpha = visOf[l] * 0.55;
					ctx!.fill(dotPaths[l]);
				}
				for (let n = 0; n < litCount; n++) {
					const k = litDots[n];
					ctx!.globalAlpha = visOf[visLevel[k]] * 0.55;
					ctx!.beginPath();
					ctx!.arc(px[k], py[k], DOT_R + glow[k] * 0.9, 0, TAU);
					ctx!.fill();
				}
			};
			drawGradDots(azureGrad!);
			drawGradDots(orchidGrad!);

			ctx!.globalCompositeOperation = 'source-over';
			ctx!.globalAlpha = 1;
		}
		raf = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			parent.removeEventListener('mousemove', onMove);
			parent.removeEventListener('mouseleave', onLeave);
		};
	});
</script>

<canvas
	bind:this={canvas}
	aria-hidden="true"
	class="fade-edges pointer-events-none absolute inset-0 z-0 h-full w-full"
></canvas>

<style>
	/* Fades the grid out toward all four screen edges instead of cutting off hard. Two gradient
	   masks (one per axis) intersected together, so corners fade faster than edge midpoints. */
	.fade-edges {
		-webkit-mask-image:
			linear-gradient(to right, transparent, black 12%, black 88%, transparent),
			linear-gradient(to bottom, transparent, black 12%, black 88%, transparent);
		-webkit-mask-composite: source-in, source-over;
		mask-image:
			linear-gradient(to right, transparent, black 12%, black 88%, transparent),
			linear-gradient(to bottom, transparent, black 12%, black 88%, transparent);
		mask-composite: intersect;
	}
</style>
