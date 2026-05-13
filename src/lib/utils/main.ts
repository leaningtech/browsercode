import { cliConfigs, toolItems } from '$lib/config/tools';
import { trackEvent } from './useLazyTracking';

type PortalUpdate = { port: number; url: string | null; active: boolean };

export async function bootCLI(
	onPortalUpdate?: (update: PortalUpdate) => void,
	tool: keyof typeof cliConfigs = 'gemini'
) {
	const { BrowserPod } = await import('@leaningtech/browserpod');

	const config = cliConfigs[tool] ?? cliConfigs.gemini;
	const toolLabel = toolItems.find((item) => item.id === tool)?.label ?? tool;

	const consoleElement = document.querySelector('#console') as HTMLElement;

	const ua = navigator.userAgent;
	const isIos =
		/iPad|iPhone|iPod/.test(ua) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	if (isIos) {
		consoleElement.textContent = 'unsupported';
		return;
	}

	const pod = await BrowserPod.boot({
		apiKey: import.meta.env.VITE_API_KEY as string,
		userImage: config.userImage,
		storageKey: config.storageKey
	});
	const terminal = await pod.createDefaultTerminal(consoleElement);

	pod.onPortal((portal) => {
		const port = Number(portal?.port);
		const rawUrl = portal?.url;
		const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';

		if (!Number.isInteger(port) || port <= 0) {
			console.log('[portal] update', portal);
			return;
		}

		if (url.length > 0) {
			console.log(`[portal] active port=${port} url=${url}`);
			onPortalUpdate?.({ port, url, active: true });
		} else {
			console.log(`[portal] removed port=${port}`);
			onPortalUpdate?.({ port, url: null, active: false });
		}
	});

	if (config.openCallback) {
		pod.onOpen(config.openCallback);
	}

	const homePath = '/home/user/project';
	await pod.createDirectory(homePath, { recursive: true });

	if (config.projectFile) {
		const filename = config.projectFile.split('/').pop()!;
		await copyFile(pod, config.projectFile, homePath, filename);
	}

	terminal.write(`Starting ${toolLabel}...\n`);

	trackEvent('Booted', { tool: toolLabel });

	await pod.run(config.command, config.args, {
		env: ['COLORTERM=truecolor'],
		terminal,
		cwd: homePath
	});
}

export async function copyFile(
	pod: {
		createFile: (
			path: string,
			mode: 'binary' | 'text'
		) => Promise<{
			write: (data: ArrayBuffer | string) => Promise<void>;
			close: () => Promise<void>;
		}>;
	},
	path: string,
	prefix: string,
	destFilename?: string
) {
	const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
	const dest = destFilename ? `${normalizedPrefix}/${destFilename}` : `${normalizedPrefix}/${path}`;

	const file = await pod.createFile(dest, 'binary');
	const resp = await fetch(path);

	if (!resp.ok) {
		throw new Error(`Failed to fetch "${path}" (${resp.status} ${resp.statusText})`);
	}

	const buf = await resp.arrayBuffer();
	await file.write(buf);
	await file.close();
}
