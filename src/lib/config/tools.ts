export type ToolId = 'claude' | 'gemini' | 'codex' | 'opencode';

export type ToolItem = {
	id: ToolId;
	icon: string | null;
	label: string;
	disabled: boolean;
	/** Tailwind classes for the icon badge when the tool is available (ignored while disabled). */
	accentClass: string;
	/** Solid Tailwind background class for the small "this one is running" status dot. */
	dotClass: string;
};

export const toolItems: ToolItem[] = [
	{
		id: 'claude',
		icon: 'mingcute:claude-line',
		label: 'Claude Code',
		disabled: false,
		accentClass: 'bg-orange-500/10 text-orange-400',
		dotClass: 'bg-orange-400'
	},
	{
		id: 'gemini',
		icon: 'simple-icons:googlegemini',
		label: 'Gemini CLI',
		disabled: false,
		accentClass: 'bg-blue-500/10 text-blue-400',
		dotClass: 'bg-blue-400'
	},
	{
		id: 'codex',
		icon: 'hugeicons:chat-gpt',
		label: 'Codex CLI',
		disabled: true,
		accentClass: 'bg-emerald-500/10 text-emerald-400',
		dotClass: 'bg-emerald-400'
	},
	{
		id: 'opencode',
		icon: null,
		label: 'OpenCode',
		disabled: true,
		accentClass: 'bg-fuchsia-500/10 text-fuchsia-400',
		dotClass: 'bg-fuchsia-400'
	}
];

export type CLIConfig = {
	userImage: string;
	storageKey: string;
	command: string;
	args: string[];
	projectFile?: string;
	openCallback?: (urlOrPath: string) => void;
};

export const cliConfigs: Record<string, CLIConfig> = {
	claude: {
		userImage: 'wss://disks.browserpod.io/claude_20260506.ext2',
		storageKey: 'claude_20260506',
		command: 'node',
		args: ['/home/user/claude-extracted/src/entrypoints/cli.js'],
		projectFile: '/project/claude/CLAUDE.md',
		openCallback: (urlOrPath: string) => {
			if (
				urlOrPath.startsWith('https://claude.com/cai/oauth/authorize') ||
				urlOrPath.startsWith('https://platform.claude.com/oauth/authorize')
			) {
				// Rewrite the localhost callback to the code-based exchange
				const fixedUrl = urlOrPath.replace(
					'http%3A%2F%2Flocalhost%3A0',
					'https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode'
				);
				window.open(fixedUrl, '_blank');
			}
		}
	},
	gemini: {
		userImage: 'wss://disks.browserpod.io/gemini_20260430_2.ext2',
		storageKey: 'gemini_20260430_2',
		command: 'node',
		args: ['/home/user/node_modules/@google/gemini-cli/bundle/gemini.js'],
		projectFile: '/project/gemini/GEMINI.md'
	}
};
