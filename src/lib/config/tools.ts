export type ToolId = 'claude' | 'gemini' | 'codex' | 'opencode';

export type ToolItem = {
	id: ToolId;
	icon: string | null;
	label: string;
	disabled: boolean;
};

export const toolItems: ToolItem[] = [
	{ id: 'claude', icon: 'mingcute:claude-line', label: 'Claude Code', disabled: false },
	{ id: 'gemini', icon: 'simple-icons:googlegemini', label: 'Gemini', disabled: false },
	{ id: 'codex', icon: 'hugeicons:chat-gpt', label: 'Codex CLI', disabled: true },
	{ id: 'opencode', icon: null, label: 'OpenCode', disabled: true }
];

export type CLIConfig = {
	userImage: string;
	storageKey: string;
	command: string;
	args: string[];
};

export const cliConfigs: Record<string, CLIConfig> = {
	claude: {
		userImage: 'wss://disks.browserpod.io/claude_20260428.ext2',
		storageKey: 'claude_20260428',
		command: 'npm',
		args: ['run', 'claude']
	},
	gemini: {
		userImage: 'wss://disks.browserpod.io/gemini_20260430_2.ext2',
		storageKey: 'gemini_20260430_2',
		command: 'npm',
		args: ['run', 'gemini']
	}
};
