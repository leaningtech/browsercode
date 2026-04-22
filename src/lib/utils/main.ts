export async function bootCLI(onPortalUrl?: (url: string) => void) {
	const { BrowserPod } = await import('@leaningtech/browserpod');

	const consoleElement = document.querySelector('#console');
	const pod = await BrowserPod.boot({ apiKey: import.meta.env.VITE_BP_APIKEY });
	const terminal = await pod.createDefaultTerminal(consoleElement);

	const homePath = '/home/user';
	const projectPath = `${homePath}/project`;
	await pod.createDirectory(projectPath);
	await copyFile(pod, `project/package.json`, homePath);

	let unsubscribe: (() => void) | undefined;

	unsubscribe = pod.onPortal((portal) => {
		if (portal?.url) {
			console.log(`[portal] port=${portal.port} url=${portal.url}`);
			onPortalUrl?.(portal.url);
		} else {
			console.log('[portal] update', portal);
			onPortalUrl?.('');
		}
	});

	await pod.run('npm', ['install', '--ignore-scripts'], {
		echo: true,
		terminal: terminal,
		cwd: projectPath
	});

	await pod.run('npm', ['run', 'gemini'], {
		echo: true,
		terminal: terminal,
		cwd: projectPath
	});
}

export async function copyFile(pod, path, prefix) {
	const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
	console.log(path);
	const f = await pod.createFile(`${normalizedPrefix}/${path}`, 'binary');
	const resp = await fetch(path);
	const buf = await resp.arrayBuffer();
	await f.write(buf);
	await f.close();
}
