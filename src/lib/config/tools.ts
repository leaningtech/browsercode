import type { BrowserPod } from '@leaningtech/browserpod';
import {
	codexEnv,
	getCodexApiKey,
	prepareCodexPod,
	setCodexApiKey,
	CODEX_BIN_PATH
} from '$lib/agents/codex';

export type ToolId = 'claude' | 'antigravity' | 'codex' | 'opencode';

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
		// Original brand colors, not the app's accent palette — kept recognizable at a glance.
		accentClass: 'bg-orange-500/10 text-orange-400',
		dotClass: 'bg-orange-400'
	},
	{
		id: 'codex',
		icon: 'hugeicons:chat-gpt',
		label: 'Codex CLI',
		disabled: false,
		accentClass: 'bg-bc-orchid/10 text-bc-orchid',
		dotClass: 'bg-bc-orchid'
	},
	{
		id: 'antigravity',
		icon: 'bxl:google-antigravity',
		label: 'Antigravity',
		disabled: true,
		accentClass: 'bg-blue-500/10 text-blue-400',
		dotClass: 'bg-blue-400'
	},
	{
		id: 'opencode',
		icon: null,
		label: 'OpenCode',
		disabled: true,
		accentClass: 'bg-bc-coral/10 text-bc-coral',
		dotClass: 'bg-bc-coral'
	}
];

/** Where an unknown or not-yet-shipped tool id falls back to. */
export const defaultToolId: ToolId = toolItems.find((item) => !item.disabled)?.id ?? 'claude';

/** A disabled tool has nothing to boot, so it is not a routable id either. */
export function isEnabledTool(id: string | undefined): id is ToolId {
	return toolItems.some((item) => item.id === id && !item.disabled);
}

/** Route params are user input, so an id that cannot boot resolves to the default instead. */
export function resolveToolId(param: string | undefined): ToolId {
	return isEnabledTool(param) ? param : defaultToolId;
}

/**
 * A secret the CLI can only be handed at process launch, so declaring one switches the tool to a
 * gated boot: an overlay blocks until it is stored. Copy lives here as data, so the cards render
 * any provider without knowing which.
 */
export type CredentialSpec = {
	label: string;
	placeholder: string;
	/** Where the user creates one, not where it is documented. */
	consoleUrl: string;
	/** Quoted from the provider's own console so it is findable there. */
	createLabel: string;
	/** Why the usual sign-in is unavailable. */
	signInReason: string;
	/** Where the value is kept and how it is billed. */
	rationale: string;
	get: () => string | null;
	set: (value: string) => void;
};

export type CLIConfig = {
	/** Prebuilt disk image, mounted at /home. */
	userImage?: string;
	storageKey: string;
	command: string;
	args: string[];
	projectFile?: string;
	openCallback?: (urlOrPath: string) => void;
	/** Runs after the pod boots, before the CLI launches. */
	prepare?: (pod: BrowserPod) => Promise<void>;
	/** Extra env for the CLI process, resolved at launch. */
	env?: () => string[];
	credential?: CredentialSpec;
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
	codex: {
		userImage: 'wss://disks.browserpod.io/rust-post-demos-2.ext2',
		storageKey: 'rust-post-demos-2',
		command: CODEX_BIN_PATH,
		args: [],
		projectFile: '/project/codex/AGENTS.md',
		prepare: prepareCodexPod,
		env: codexEnv,
		credential: {
			label: 'OpenAI API key',
			placeholder: 'sk-proj-…',
			consoleUrl: 'https://platform.openai.com/api-keys',
			createLabel: 'Create new secret key',
			signInReason: "ChatGPT sign-in isn't available here, so an API key is required.",
			rationale:
				"It's saved in this browser so you only paste it once, and sent to OpenAI when Codex runs. " +
				'Usage is billed per token to your OpenAI account, not to a ChatGPT plan.',
			get: getCodexApiKey,
			set: setCodexApiKey
		}
	}
};
