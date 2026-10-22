/** Which parts of the IDE shell render. Embeds narrow this; the playground takes `FULL_SHELL`. */
export type ShellOptions = {
	header: boolean;
	fileTree: boolean;
	search: boolean;
	editor: boolean;
	terminal: boolean;
	preview: boolean;
	/** Settings, bug report and zen toggle. */
	tools: boolean;
	/** The BrowserCode badge — attribution an embed carries in place of the app's own chrome. */
	brand: boolean;
	/** The beforeunload prompt, which an embed would fire inside the host's page. */
	leaveGuard: boolean;
};

export const FULL_SHELL: ShellOptions = {
	header: true,
	fileTree: true,
	search: true,
	editor: true,
	terminal: true,
	preview: true,
	tools: true,
	brand: false,
	leaveGuard: true
};
