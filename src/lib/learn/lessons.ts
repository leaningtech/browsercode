/**
 * The lessons `/learn` serves: short scripted Java lessons, each replayed as it was recorded for
 * social media and then handed to the visitor to run and change. They are written elsewhere and
 * exported here, one JSON file each, so only finished lessons reach the site.
 */
import type { JavaVersion } from '$lib/java/versions';

export type LineRange = [from: number, to: number];

/** `hold` is how long the step stays on screen, in seconds; `highlight` marks lines of code. */
type StepTiming = { hold?: number; highlight?: LineRange };

/** Words between `*stars*` are set in the emphasis colour. */
export type SayStep = StepTiming & { say: string };
/** Types `lines` of `file` (all of it when absent) into the editor, as they are in `files`. */
export type TypeStep = StepTiming & { type: { file: string; lines?: LineRange } };
/** `answer` indexes `options`; the next `run` reveals it. */
export type QuizStep = StepTiming & {
	quiz: { question: string; options: string[]; answer: number; seconds?: number };
};
/** Retypes the one occurrence of `find` in `file` as `replace`. */
export type EditStep = StepTiming & { edit: { file: string; find: string; replace: string } };
/**
 * Compiles and runs the files as they stand. `stdin` is typed into the console when the program
 * reads; `display` is for a program that opens a window instead of exiting.
 */
export type RunStep = StepTiming & { run: { expect?: string; stdin?: string; display?: boolean } };

export type Step = SayStep | TypeStep | QuizStep | EditStep | RunStep;

export type Series = 'guess-the-output' | 'bug-hunt' | 'build-it' | 'cheat-sheet';

export type Lesson = {
	/** Three digits; also the number the post shows. */
	id: string;
	series: Series;
	title: string;
	topic: string;
	difficulty: number;
	java: JavaVersion;
	main: string;
	/** The code the lesson starts from, before any step types or edits it. */
	files: { path: string; content: string }[];
	script: Step[];
};

export const SERIES_LABELS: Record<Series, string> = {
	'guess-the-output': 'Guess the output',
	'bug-hunt': 'Bug hunt',
	'build-it': 'Build it',
	'cheat-sheet': 'Cheat sheet'
};

/** A caption in parts, `em` for the words that were between `*stars*`. */
export function emphasis(text: string): { text: string; em: boolean }[] {
	return text
		.split(/\*([^*]+)\*/)
		.map((part, i) => ({ text: part, em: i % 2 === 1 }))
		.filter((part) => part.text);
}

const modules = import.meta.glob<Lesson>('./lessons/*.json', { eager: true, import: 'default' });

/** Newest first, the order the hub lists them in. */
export const lessons: readonly Lesson[] = Object.values(modules).sort((a, b) =>
	b.id.localeCompare(a.id)
);

export function findLesson(id: string): Lesson | undefined {
	return lessons.find((lesson) => lesson.id === id);
}
