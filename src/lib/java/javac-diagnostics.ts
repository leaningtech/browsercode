/**
 * Reads `javac`'s console output back into diagnostics. javac has no machine-readable mode here,
 * so this parses what it prints for people: a `<file>:<line>: <severity>: <message>` header, the
 * offending source line, a caret under the column, then any detail lines, indented.
 */

/** `path` is the file as javac was given it; lines and columns count from 1. */
export type JavacDiagnostic = {
	path: string;
	line: number;
	column: number;
	severity: 'error' | 'warning';
	message: string;
};

/** The message may hold colons of its own, as `incompatible types: …` does. */
const HEADER = /^(.+?\.java):(\d+): (error|warning): (.*)$/;
/** javac pads the caret with the source line's own tabs, so its index is the column. */
const CARET = /^[ \t]*\^$/;
const DETAIL = /^ {2,}\S/;

export function parseJavacOutput(text: string): JavacDiagnostic[] {
	const lines = text.split(/\r?\n/);
	const diagnostics: JavacDiagnostic[] = [];
	for (let i = 0; i < lines.length; i++) {
		const header = lines[i].match(HEADER);
		if (!header) continue;
		const [, path, line, severity, message] = header;
		// The caret follows the echoed source line, which may itself look like anything.
		const caretAt = lines[i + 2]?.match(CARET) ? i + 2 : -1;
		const details: string[] = [];
		if (caretAt >= 0) {
			for (let j = caretAt + 1; j < lines.length && DETAIL.test(lines[j]); j++) {
				details.push(lines[j].slice(2));
			}
		}
		diagnostics.push({
			path,
			line: Number(line),
			column: caretAt >= 0 ? lines[caretAt].indexOf('^') + 1 : 1,
			severity: severity as JavacDiagnostic['severity'],
			message: [message, ...details].join('\n')
		});
	}
	return diagnostics;
}
