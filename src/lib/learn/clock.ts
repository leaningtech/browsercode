/**
 * Time for a lesson replay. Nothing in a replay reads the wall clock: it waits on this one, which
 * the page advances in real time for a visitor and a recorder advances one video frame at a time,
 * so a recording comes out the same however fast the machine or Java happens to be.
 */
type Timer = { at: number; resolve: () => void };
type Animation = { start: number; duration: number; update: (progress: number) => void };

/** Lets the code a timer resumed run up to its next wait before time moves on. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export class Clock {
	/** Milliseconds since the replay started. */
	now = 0;
	private timers: Timer[] = [];
	private animations = new Set<Animation>();

	wait(ms: number): Promise<void> {
		return new Promise((resolve) => this.timers.push({ at: this.now + Math.max(0, ms), resolve }));
	}

	/** Calls `update` with progress from 0 to 1 as time passes over `ms`, ending on exactly 1. */
	async animate(ms: number, update: (progress: number) => void): Promise<void> {
		const animation = { start: this.now, duration: Math.max(1, ms), update };
		this.animations.add(animation);
		update(0);
		await this.wait(ms);
		this.animations.delete(animation);
		update(1);
	}

	/** Moves time on by `ms`, firing every timer due on the way in order. */
	async advance(ms: number): Promise<void> {
		const target = this.now + ms;
		for (;;) {
			const due = this.timers.filter((timer) => timer.at <= target).sort((a, b) => a.at - b.at)[0];
			if (!due) break;
			this.timers.splice(this.timers.indexOf(due), 1);
			this.now = due.at;
			this.updateAnimations();
			due.resolve();
			await settle();
		}
		this.now = target;
		this.updateAnimations();
	}

	private updateAnimations(): void {
		for (const { start, duration, update } of this.animations) {
			update(Math.min(1, (this.now - start) / duration));
		}
	}
}
