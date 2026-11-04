/**
 * Starts Java processes. Each call is its own process, sharing the one console, and nothing
 * waits for an earlier one: CheerpJ can't stop a program, so one may keep running for good.
 */

const JAVAC_MAIN = 'com.sun.tools.javac.Main';

/** Resolves with `javac`'s exit code. */
export function runJavac(args: string[]): Promise<number> {
	return cheerpjRunMain(JAVAC_MAIN, '', ...args);
}

/** Resolves with the exit code; a program that keeps running may never resolve. */
export function runJava(mainClass: string, classPath: string, args: string[]): Promise<number> {
	return cheerpjRunMain(mainClass, classPath, ...args);
}
