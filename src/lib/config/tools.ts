export type ToolId = 'claude' | 'gemini' | 'codex' | 'opencode';

export type ToolItem = {
	id: ToolId;
	icon: string | null;
	label: string;
	disabled: boolean;
};

export const toolItems: ToolItem[] = [
	{ id: 'claude', icon: 'mingcute:claude-line', label: 'Claude Code', disabled: false },
	{ id: 'gemini', icon: 'simple-icons:googlegemini', label: 'Gemini CLI', disabled: false },
	{ id: 'codex', icon: 'hugeicons:chat-gpt', label: 'Codex CLI', disabled: true },
	{ id: 'opencode', icon: null, label: 'OpenCode', disabled: true }
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
		projectFile: 'project/claude/CLAUDE.md',
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
		projectFile: 'project/gemini/GEMINI.md'
	}
};
