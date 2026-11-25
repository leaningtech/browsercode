/**
 * Plays a lesson's script: types the code, asks the quiz, runs the program for real and explains
 * it, then hands the code to the visitor. The same replay is the video: in record mode a recorder
 * drives the clock frame by frame through `window.__lesson`.
 */
import { Clock } from './clock';
import { LessonJava, type OutputKind } from './java';
import type { EditStep, Lesson, LineRange, QuizStep, RunStep, Step, TypeStep } from './lessons';

export type Mode = 'live' | 'record';

export type QuizState = QuizStep['quiz'] & {
	/** Milliseconds left on the countdown; a visitor gets no countdown. */
	remaining: number | null;
	picked: number | null;
	revealed: boolean;
};

export type OutputChunk = { text: string; kind: OutputKind };

/** Something the soundtrack marks: a keystroke, the quiz, a run starting, the answer, the end. */
export type CueKind = 'key' | 'quiz' | 'run' | 'reveal' | 'card';
export type Cue = { t: number; kind: CueKind };

/** Characters per second for code; indentation appears at once and line ends pause. */
const TYPING_CPS = 40;
const NEWLINE_PAUSE = 3;
/** Long enough to read: a base plus a reading speed, never shorter than the step's `hold`. */
const sayDuration = (text: string) => 1100 + 48 * [...text].length;
const AFTER_TYPING = 500;
const AFTER_RUN = 1400;
const SELECTION_HOLD = 450;
const END_CARD = 3200;
/** A window appears before Swing has painted into it. */
const PAINT_DELAY = 900;

class Cancelled extends Error {}

type ProjectFile = { path: string; content: string };

export class LessonPlayer {
	readonly lesson: Lesson;
	readonly mode: Mode;
	readonly clock = new Clock();
	readonly java: LessonJava;

	/** The file on screen. */
	file = $state('');
	/** The editor's text: the file as far as it has been typed. */
	code = $state('');
	caption = $state('');
	highlight = $state<LineRange | null>(null);
	cursor = $state<number | null>(null);
	selection = $state<[number, number] | null>(null);
	quiz = $state<QuizState | null>(null);
	output = $state<OutputChunk[]>([]);
	javaStatus = $state<'loading' | 'ready' | 'compiling' | 'running' | 'blocked'>('loading');
	/** True while the program waits for input nobody has queued. */
	waiting = $state(false);
	windowOpen = $state(false);
	/** Whether the program's window is shown in place of the console. */
	showDisplay = $state(false);
	/** Index of the step playing; `script.length` once it's over. */
	stepIndex = $state(0);
	/** The script is over and the code is the visitor's. */
	finished = $state(false);
	endCard = $state(false);
	/** True while the recorder must not advance the clock: Java is busy in real time. */
	busy = $state(false);
	done = $state(false);
	readonly cues: Cue[] = [];

	/** Every file as it stands, edits included; `code` shows a prefix of the one on screen. */
	private files: Record<string, string> = {};
	private typed: Record<string, number> = {};
	/** When the caption on screen has had its reading time; typing may run until then. */
	private readUntil = 0;
	private generation = 0;
	private windowListeners: (() => void)[] = [];
	private waitingListeners: (() => void)[] = [];
	/** Set while a visitor's quiz waits for their pick. */
	private quizAnswered: (() => void) | null = null;

	constructor(lesson: Lesson, mode: Mode) {
		this.lesson = lesson;
		this.mode = mode;
		this.java = new LessonJava(lesson.java);
		this.java.onOutput = (text, kind) => this.print(text, kind);
		this.java.onWaiting = (waiting) => {
			this.waiting = waiting;
			if (waiting) this.waitingListeners.splice(0).forEach((listener) => listener());
		};
		this.reset();
	}

	get step(): Step | undefined {
		return this.lesson.script[this.stepIndex];
	}

	/** Starts Java in the background; resolves false when another tab holds it. */
	async loadJava(): Promise<boolean> {
		const ok = await this.java.load();
		if (this.javaStatus === 'loading') this.javaStatus = ok ? 'ready' : 'blocked';
		return ok;
	}

	mountDisplay(el: HTMLElement): Promise<void> {
		return this.java.mountDisplay(el, (open) => {
			this.windowOpen = open;
			if (open) this.windowListeners.splice(0).forEach((listener) => listener());
		});
	}

	/** Plays from the start. Resolves when the script is over, or never if it's replaced. */
	async play(): Promise<void> {
		const generation = ++this.generation;
		this.reset();
		try {
			for (let i = 0; i < this.lesson.script.length; i++) {
				this.check(generation);
				this.stepIndex = i;
				await this.playStep(this.lesson.script[i], this.lesson.script[i + 1], generation);
			}
			this.check(generation);
			this.stepIndex = this.lesson.script.length;
			this.highlight = null;
			this.cursor = null;
			if (this.mode === 'record') {
				this.endCard = true;
				this.cue('card');
				await this.clock.wait(END_CARD);
				this.done = true;
			} else {
				this.handOver();
			}
		} catch (error) {
			if (!(error instanceof Cancelled)) throw error;
		}
	}

	/** Ends the replay at once on the code as the script leaves it. */
	skip(): void {
		this.generation++;
		this.quiz = null;
		this.selection = null;
		this.handOver();
	}

	/** A visitor's answer; the next run reveals whether it's right. */
	pick(option: number): void {
		if (!this.quiz || this.quiz.revealed || this.quiz.picked !== null) return;
		this.quiz.picked = option;
		this.quizAnswered?.();
	}

	/** The visitor's own run, of the code as they've changed it. */
	async runNow(): Promise<void> {
		if (this.javaStatus === 'compiling') return;
		this.files[this.file] = this.code;
		await this.runFiles({});
	}

	/** Typed into the console by the visitor while the program waits. */
	sendInput(text: string): void {
		this.print(`${text}\n`, 'input');
		this.java.send(`${text}\n`);
	}

	/** Back to the code the lesson starts from, for the visitor to try again. */
	resetCode(): void {
		const start = this.lesson.files.find((f) => f.path === this.file);
		if (start) this.code = start.content;
	}

	/** The project as it stands, for the Java Playground. */
	currentFiles(): ProjectFile[] {
		if (this.finished) this.files[this.file] = this.code;
		return this.lesson.files.map(({ path }) => ({ path, content: this.files[path] ?? '' }));
	}

	dispose(): void {
		this.generation++;
		this.java.dispose();
	}

	private reset(): void {
		this.files = Object.fromEntries(this.lesson.files.map(({ path, content }) => [path, content]));
		this.typed = Object.fromEntries(this.lesson.files.map(({ path }) => [path, 0]));
		this.readUntil = 0;
		this.file = this.lesson.files[0]?.path ?? '';
		this.code = '';
		this.caption = '';
		this.highlight = null;
		this.cursor = null;
		this.selection = null;
		this.quiz = null;
		this.output = [];
		this.showDisplay = false;
		this.stepIndex = 0;
		this.finished = false;
		this.endCard = false;
		this.done = false;
		this.cues.length = 0;
	}

	private handOver(): void {
		for (const { path } of this.lesson.files) this.typed[path] = this.files[path].length;
		this.code = this.files[this.file] ?? '';
		this.stepIndex = this.lesson.script.length;
		this.caption = '*Your turn:* change the code and press Run.';
		this.highlight = null;
		this.cursor = null;
		this.finished = true;
	}

	private check(generation: number): void {
		if (generation !== this.generation) throw new Cancelled();
	}

	private async playStep(step: Step, next: Step | undefined, generation: number): Promise<void> {
		const hold = (step.hold ?? 0) * 1000;
		// A window covers the code; going back to the code puts it away.
		if ('type' in step || 'edit' in step || ('say' in step && step.highlight)) {
			this.showDisplay = false;
		}
		// A revealed answer stays up through its explanation, until the code changes or runs again.
		if (('edit' in step || 'run' in step || 'type' in step) && this.quiz?.revealed)
			this.quiz = null;
		if ('say' in step) {
			this.caption = step.say;
			this.highlight = step.highlight ?? null;
			const reading = Math.max(hold, sayDuration(step.say));
			// A caption between blocks of code that points at none introduces the next block: it
			// shows while that types rather than stopping the typing. The opening one doesn't.
			const started = Object.values(this.typed).some((n) => n > 0);
			if (started && !step.highlight && next && 'type' in next) {
				this.readUntil = this.clock.now + reading;
			} else {
				await this.clock.wait(reading);
			}
		} else if ('type' in step) {
			this.highlight = step.highlight ?? null;
			await this.type(step, generation);
			await this.clock.wait(Math.max(hold, AFTER_TYPING, this.readUntil - this.clock.now));
		} else if ('edit' in step) {
			this.highlight = step.highlight ?? null;
			await this.edit(step, generation);
			await this.clock.wait(Math.max(hold, AFTER_TYPING));
		} else if ('quiz' in step) {
			await this.ask(step, generation);
		} else if ('run' in step) {
			if (step.highlight) this.highlight = step.highlight;
			this.cursor = null;
			await this.runFiles(step.run, generation);
			this.check(generation);
			if (this.quiz && !this.quiz.revealed) {
				this.quiz.revealed = true;
				this.cue('reveal');
			}
			await this.clock.wait(Math.max(hold, AFTER_RUN));
		}
	}

	private async type({ type }: TypeStep, generation: number): Promise<void> {
		this.showFile(type.file);
		const content = this.files[type.file];
		const from = this.typed[type.file];
		const to = type.lines ? endOfLine(content, type.lines[1]) : content.length;
		// Each character's weight in typing time: indentation is free, a line end is a pause.
		const weights: number[] = [];
		let lineStart = content.lastIndexOf('\n', from - 1) + 1;
		for (let i = from; i < to; i++) {
			const char = content[i];
			const indenting = char === ' ' && content.slice(lineStart, i).trim() === '';
			weights.push(char === '\n' ? NEWLINE_PAUSE : indenting ? 0 : 1);
			if (char === '\n') lineStart = i + 1;
		}
		const total = weights.reduce((a, b) => a + b, 0);
		let shown = from;
		await this.clock.animate((total / TYPING_CPS) * 1000, (progress) => {
			if (generation !== this.generation) return;
			let budget = progress * total;
			let end = from;
			while (end < to && (weights[end - from] <= budget || weights[end - from] === 0)) {
				budget -= weights[end - from];
				end++;
			}
			if (progress === 1) end = to;
			for (let i = shown; i < end; i++) if (weights[i - from] > 0) this.cue('key');
			shown = end;
			this.typed[type.file] = end;
			this.code = content.slice(0, end);
			this.cursor = end;
		});
		this.check(generation);
	}

	private async edit({ edit }: EditStep, generation: number): Promise<void> {
		this.showFile(edit.file);
		const content = this.files[edit.file];
		const start = content.indexOf(edit.find);
		if (start < 0) throw new Error(`Lesson ${this.lesson.id}: "${edit.find}" not in ${edit.file}`);
		// Edits come once the file is typed in full.
		this.code = content;
		this.selection = [start, start + edit.find.length];
		this.cursor = null;
		await this.clock.wait(SELECTION_HOLD);
		this.check(generation);
		this.selection = null;
		const before = content.slice(0, start);
		const after = content.slice(start + edit.find.length);
		let count = 0;
		this.cue('key');
		await this.clock.animate((edit.replace.length / TYPING_CPS) * 1000, (progress) => {
			if (generation !== this.generation) return;
			const next = Math.round(progress * edit.replace.length);
			for (let i = count; i < next; i++) this.cue('key');
			count = next;
			this.code = before + edit.replace.slice(0, next) + after;
			this.cursor = before.length + next;
		});
		this.check(generation);
		this.files[edit.file] = before + edit.replace + after;
		this.typed[edit.file] = before.length + edit.replace.length + after.length;
	}

	private async ask({ quiz, hold }: QuizStep, generation: number): Promise<void> {
		this.cursor = null;
		const seconds = quiz.seconds ?? 3;
		this.quiz = {
			...quiz,
			remaining: this.mode === 'record' ? seconds * 1000 : null,
			picked: null,
			revealed: false
		};
		this.cue('quiz');
		if (this.mode === 'record') {
			await this.clock.animate(seconds * 1000, (progress) => {
				if (this.quiz) this.quiz.remaining = (1 - progress) * seconds * 1000;
			});
		} else {
			await new Promise<void>((resolve) => (this.quizAnswered = resolve));
			this.quizAnswered = null;
		}
		this.check(generation);
		await this.clock.wait((hold ?? 0) * 1000);
	}

	/**
	 * Builds and runs the files as they stand. During a replay `generation` is set: a window or
	 * the program's exit ends the run, and the script's `stdin` is typed when it asks for input.
	 */
	private async runFiles(run: RunStep['run'], generation?: number): Promise<void> {
		this.busy = true;
		this.output = [];
		this.showDisplay = false;
		this.javaStatus = 'compiling';
		this.cue('run');
		try {
			const opened = run.display ? this.nextWindow() : null;
			const result = await this.java.run(this.currentFiles(), this.lesson.main);
			if (!result.ok) return;
			this.javaStatus = 'running';
			if (generation === undefined) {
				// A visitor's run shows a window when one opens and is otherwise done once started.
				void this.nextWindow().then(() => (this.showDisplay = true));
				void result.exit.then(() => (this.javaStatus = 'ready'));
				return;
			}
			if (opened) {
				await opened;
				await new Promise((resolve) => setTimeout(resolve, PAINT_DELAY));
				this.showDisplay = true;
				return;
			}
			let stdin = run.stdin;
			for (;;) {
				const next = await Promise.race([
					result.exit.then(() => 'exit' as const),
					this.nextRead().then(() => 'read' as const)
				]);
				this.check(generation);
				if (next === 'exit') break;
				if (stdin === undefined) {
					// Nothing scripted to type: a visitor types it, a recording can't go on.
					this.busy = false;
					await result.exit;
					break;
				}
				this.busy = false;
				await this.typeInput(stdin, generation);
				this.busy = true;
				this.java.send(stdin);
				stdin = undefined;
			}
		} finally {
			if (this.javaStatus !== 'running' || generation !== undefined) this.javaStatus = 'ready';
			this.busy = false;
		}
	}

	private async typeInput(text: string, generation: number): Promise<void> {
		const shown = text.replace(/\n$/, '');
		const chunk: OutputChunk = { text: '', kind: 'input' };
		this.output = [...this.output, chunk];
		const index = this.output.length - 1;
		let count = 0;
		await this.clock.animate((shown.length / TYPING_CPS) * 1000 * 1.4, (progress) => {
			if (generation !== this.generation) return;
			const next = Math.round(progress * shown.length);
			for (let i = count; i < next; i++) this.cue('key');
			count = next;
			this.output[index] = { text: shown.slice(0, next), kind: 'input' };
		});
		this.check(generation);
		await this.clock.wait(300);
		this.output[index] = { text: `${shown}\n`, kind: 'input' };
	}

	private nextWindow(): Promise<void> {
		return new Promise((resolve) => this.windowListeners.push(resolve));
	}

	private nextRead(): Promise<void> {
		if (this.waiting) return Promise.resolve();
		return new Promise((resolve) => this.waitingListeners.push(resolve));
	}

	private print(text: string, kind: OutputKind): void {
		const last = this.output.at(-1);
		if (last && last.kind === kind) {
			this.output[this.output.length - 1] = { text: last.text + text, kind };
		} else {
			this.output = [...this.output, { text, kind }];
		}
	}

	private showFile(path: string): void {
		if (this.file === path) return;
		this.file = path;
		this.code = (this.files[path] ?? '').slice(0, this.typed[path]);
	}

	private cue(kind: CueKind): void {
		this.cues.push({ t: this.clock.now, kind });
	}
}

/** The offset just past line `line` (1-based), its newline included. */
function endOfLine(content: string, line: number): number {
	let offset = 0;
	for (let i = 0; i < line; i++) {
		const next = content.indexOf('\n', offset);
		if (next < 0) return content.length;
		offset = next + 1;
	}
	return offset;
}
