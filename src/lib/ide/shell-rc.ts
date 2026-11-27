import { POD_HOME } from '$lib/pod/fs';

export const BP_RC_PATH = `${POD_HOME}/.bp_rc`;

/** SGR color parameters shared by the prompt, LS_COLORS and the ANSI palette. */
const BLUE_SGR = '38;2;74;125;255';
const DIM_SGR = '38;5;240';

/** ANSI colours shared by the shell rc and the Output tab. */
export const ANSI = {
	dim: `\x1b[${DIM_SGR}m`,
	blue: `\x1b[${BLUE_SGR}m`,
	coral: '\x1b[38;2;255;97;97m',
	bold: '\x1b[1m',
	reset: '\x1b[0m'
};

/** Interactive-shell rc: branded prompt, ls colors, aliases and a welcome banner. Written into the pod at boot; extra bash tabs start with `--rcfile` pointing here. */
export const BP_RC =
	'[ -f ~/.bashrc ] && . ~/.bashrc\n' +
	`PS1="\\n\\[\\e[${DIM_SGR}m\\]╭─\\[\\e[0m\\] \\[\\e[1m\\]browsercode\\[\\e[0m\\] \\[\\e[${DIM_SGR}m\\]in\\[\\e[0m\\] \\[\\e[38;5;245m\\]\\w\\[\\e[0m\\]\\n\\[\\e[${DIM_SGR}m\\]╰─\\[\\e[0m\\]\\[\\e[${BLUE_SGR}m\\]❯\\[\\e[0m\\] "\n` +
	`PS2="\\[\\e[${DIM_SGR}m\\]··\\[\\e[0m\\]\\[\\e[${BLUE_SGR}m\\]❯\\[\\e[0m\\] "\n` +
	`export LS_COLORS="di=${BLUE_SGR}:ln=38;5;39:ex=38;5;46:*.md=38;5;245"\n` +
	'alias ls="ls --color=auto"\n' +
	'alias ll="ls -lah --color=auto"\n' +
	'alias la="ls -A --color=auto"\n' +
	'alias grep="grep --color=auto"\n' +
	'printf "  \\033[1mWelcome to BrowserPod\\033[0m\\n"\n' +
	`printf "  \\033[${DIM_SGR}mtype \\033[${BLUE_SGR}mhelp\\033[${DIM_SGR}m or hit Tab to explore.\\033[0m\\n"\n`;
