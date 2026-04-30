type PortalUpdate = { port: number; url: string | null; active: boolean };

export async function bootCLI(onPortalUpdate?: (update: PortalUpdate) => void) {
	const { BrowserPod } = await import('@leaningtech/browserpod');

	const consoleElement = document.querySelector('#console') as HTMLElement;
	const pod = await BrowserPod.boot({
		apiKey: import.meta.env.VITE_API_KEY as string,
		userImage: 'wss://disks.browserpod.io/gemini_20260429_2.ext2',
		env: ['COLORTERM=truecolor']
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

	const homePath = '/home/user';
	const projectPath = `${homePath}/project`;

	await pod.createDirectory(projectPath);
	await copyFile(pod, 'project/package.json', homePath);

	// await pod.run('npm', ['install', '--ignore-scripts'], {
	// 	echo: true,
	// 	terminal,
	// 	cwd: projectPath
	// });

	await pod.run('npm', ['run', 'gemini'], {
		echo: true,
		terminal,
		cwd: projectPath
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
	prefix: string
) {
	const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;

	const file = await pod.createFile(`${normalizedPrefix}/${path}`, 'binary');
	const resp = await fetch(path);

	if (!resp.ok) {
		throw new Error(`Failed to fetch "${path}" (${resp.status} ${resp.statusText})`);
	}

	const buf = await resp.arrayBuffer();
	await file.write(buf);
	await file.close();
}
