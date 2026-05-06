import { cliConfigs } from '$lib/config/tools';

type PortalUpdate = { port: number; url: string | null; active: boolean };

type Pod = Parameters<typeof copyFile>[0] & {
	createDirectory: (path: string) => Promise<void>;
};

export async function bootCLI(
	onPortalUpdate?: (update: PortalUpdate) => void,
	tool: keyof typeof cliConfigs = 'gemini'
) {
	const { BrowserPod } = await import('@leaningtech/browserpod');

	const config = cliConfigs[tool] ?? cliConfigs.gemini;

	const consoleElement = document.querySelector('#console') as HTMLElement;
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

	if(config.openCallback) {
		pod.onOpen(config.openCallback);
	}

	await pod.run(config.command, config.args, {
		echo: true,
		env: ['COLORTERM=truecolor'],
		terminal,
		cwd: '/home/user'
	});
}
