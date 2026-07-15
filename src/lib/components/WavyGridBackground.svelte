<script lang="ts">
	// Animated grid backdrop for the landing page hero: an ambient "water" wave motion plus a
	// cursor-reactive bulge, tinted by two radial gradients (azure top-left, orchid bottom-right)
	// standing in for the static .bc-page-bg glow used on other pages. Sized to, and interactive
	// within, its parent element — the parent must be `position: relative` (and typically
	// `overflow: hidden`).
	type Props = {
		gridSpacing?: number;
		waveIntensity?: number;
		cursorStrength?: number;
		patchiness?: number;
		lineColor?: string;
	};

	let {
		gridSpacing = 46,
		waveIntensity = 1,
		cursorStrength = 1,
		patchiness = 0.45,
		lineColor = '#c73da6'
	}: Props = $props();

	let canvas = $state<HTMLCanvasElement>();

	function hexToRgb(hex: string) {
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

		// smoothed cursor position (starts off-screen)
		let tx = -9999,
			ty = -9999;
		let cx = -9999,
			cy = -9999;
		let cursorActive = false;

		function resize() {
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

		function onMove(e: MouseEvent) {
			const r = parent!.getBoundingClientRect();
			tx = e.clientX - r.left;
			ty = e.clientY - r.top;
			if (!cursorActive) {
				cx = tx;
				cy = ty;
				cursorActive = true;
			}
		}
		function onLeave() {
			cursorActive = false;
			tx = -9999;
			ty = -9999;
		}
		parent.addEventListener('mousemove', onMove);
		parent.addEventListener('mouseleave', onLeave);

		const cursorR = 64; // radius of cursor disturbance
		const cursorPush = 30 * cursorStrength;

		// how deeply patches fade out (0 = always fully visible, 1 = fully vanish)
		const smoothstep = (a: number, b: number, x: number) => {
			const tt = Math.min(1, Math.max(0, (x - a) / (b - a)));
			return tt * tt * (3 - 2 * tt);
		};

		const start = performance.now();
		let raf = 0;

		function draw(now: number) {
			const t = (now - start) / 1000;
			ctx!.clearRect(0, 0, W, H);

			// ease smoothed cursor toward target — the "follows like water" lag
			cx += (tx - cx) * 0.08;
			cy += (ty - cy) * 0.08;

			const px: Float32Array[] = new Array(rows);
			const py: Float32Array[] = new Array(rows);
			const glow: Float32Array[] = new Array(rows);
			const vis: Float32Array[] = new Array(rows);
			for (let j = 0; j < rows; j++) {
				px[j] = new Float32Array(cols);
				py[j] = new Float32Array(cols);
				glow[j] = new Float32Array(cols);
				vis[j] = new Float32Array(cols);
				for (let i = 0; i < cols; i++) {
					const bx = ox + i * gridSpacing;
					const by = oy + j * gridSpacing;

					// ambient water motion — layered sines
					let dx =
						(Math.sin(by * 0.021 + t * 0.9) * 6 + Math.sin((bx + by) * 0.015 + t * 0.6) * 4) *
						waveIntensity;
					let dy =
						(Math.cos(bx * 0.02 + t * 0.8) * 6 +
							Math.cos((bx - by) * 0.018 + t * 0.7) * 4 +
							Math.sin(bx * 0.03 + t * 1.1) * 3) *
						waveIntensity;

					// cursor bulge — push outward, decaying with distance
					let g = 0;
					if (cursorActive) {
						const ddx = bx - cx,
							ddy = by - cy;
						const d2 = ddx * ddx + ddy * ddy;
						const infl = Math.exp(-d2 / (2 * cursorR * cursorR));
						const d = Math.sqrt(d2) || 1;
						dx += (ddx / d) * cursorPush * infl;
						dy += (ddy / d) * cursorPush * infl;
						g = infl;
					}

					px[j][i] = bx + dx;
					py[j][i] = by + dy;
					glow[j][i] = g;

					// slow-drifting visibility field — large blobs fade fully out and back
					const n =
						Math.sin(bx * 0.0055 + t * 0.22) * Math.cos(by * 0.006 - t * 0.17) +
						0.6 * Math.sin((bx - by) * 0.004 + t * 0.11);
					vis[j][i] = 1 - patchiness + patchiness * smoothstep(-0.25, 0.7, n);
				}
			}

			const baseA = 0.11;
			ctx!.lineWidth = 1;

			// segment visibility = the dimmer of its two endpoints
			const segVisH = (j: number, i: number) => Math.min(vis[j][i], vis[j][i + 1]);
			const segVisV = (j: number, i: number) => Math.min(vis[j][i], vis[j + 1][i]);

			// 1) base grid — dim, faded by vis; cursor glow ignores fade so hover always reveals
			ctx!.globalCompositeOperation = 'source-over';
			ctx!.strokeStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
			for (let j = 0; j < rows; j++) {
				for (let i = 0; i < cols - 1; i++) {
					ctx!.globalAlpha = baseA * segVisH(j, i) + Math.max(glow[j][i], glow[j][i + 1]) * 0.18;
					ctx!.beginPath();
					ctx!.moveTo(px[j][i], py[j][i]);
					ctx!.lineTo(px[j][i + 1], py[j][i + 1]);
					ctx!.stroke();
				}
			}
			for (let i = 0; i < cols; i++) {
				for (let j = 0; j < rows - 1; j++) {
					ctx!.globalAlpha = baseA * segVisV(j, i) + Math.max(glow[j][i], glow[j + 1][i]) * 0.18;
					ctx!.beginPath();
					ctx!.moveTo(px[j][i], py[j][i]);
					ctx!.lineTo(px[j + 1][i], py[j + 1][i]);
					ctx!.stroke();
				}
			}

			// 2) gradient glow tinting the grid (additive), per-segment so it fades with vis
			ctx!.globalCompositeOperation = 'lighter';
			const drawGradLines = (grad: CanvasGradient) => {
				ctx!.strokeStyle = grad;
				for (let j = 0; j < rows; j++) {
					for (let i = 0; i < cols - 1; i++) {
						ctx!.globalAlpha = segVisH(j, i);
						ctx!.beginPath();
						ctx!.moveTo(px[j][i], py[j][i]);
						ctx!.lineTo(px[j][i + 1], py[j][i + 1]);
						ctx!.stroke();
					}
				}
				for (let i = 0; i < cols; i++) {
					for (let j = 0; j < rows - 1; j++) {
						ctx!.globalAlpha = segVisV(j, i);
						ctx!.beginPath();
						ctx!.moveTo(px[j][i], py[j][i]);
						ctx!.lineTo(px[j + 1][i], py[j + 1][i]);
						ctx!.stroke();
					}
				}
			};
			drawGradLines(azureGrad!);
			drawGradLines(orchidGrad!);

			// node dots — dim base then gradient tint, all faded by vis
			ctx!.globalCompositeOperation = 'source-over';
			for (let j = 0; j < rows; j++) {
				for (let i = 0; i < cols; i++) {
					const g = glow[j][i];
					ctx!.globalAlpha = 0.18 * vis[j][i] + g * 0.28;
					const rad = 1 + g * 0.9;
					ctx!.fillStyle = 'rgb(183,205,255)';
					ctx!.beginPath();
					ctx!.arc(px[j][i], py[j][i], rad, 0, Math.PI * 2);
					ctx!.fill();
				}
			}
			ctx!.globalCompositeOperation = 'lighter';
			const drawGradDots = (grad: CanvasGradient) => {
				ctx!.fillStyle = grad;
				for (let j = 0; j < rows; j++) {
					for (let i = 0; i < cols; i++) {
						ctx!.globalAlpha = vis[j][i] * 0.55;
						const rad = 1 + glow[j][i] * 0.9;
						ctx!.beginPath();
						ctx!.arc(px[j][i], py[j][i], rad, 0, Math.PI * 2);
						ctx!.fill();
					}
				}
			};
			drawGradDots(azureGrad!);
			drawGradDots(orchidGrad!);

			ctx!.globalCompositeOperation = 'source-over';
			ctx!.globalAlpha = 1;

			if (!reduceMotion) raf = requestAnimationFrame(draw);
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
	class="pointer-events-none absolute inset-0 z-0 h-full w-full fade-edges"
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
