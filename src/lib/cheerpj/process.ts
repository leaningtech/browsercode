/**
 * Starts Java processes. Each call is its own process, sharing the one console, and nothing
 * waits for an earlier one: CheerpJ can't stop a program, so one may keep running for good.
 */
import { cheerpj } from './cheerpj';

const JAVAC_MAIN = 'com.sun.tools.javac.Main';

/**
 * Java 8's `javac` lives in `tools.jar`, which CheerpJ doesn't ship, so the site serves one (`/app/`
 * is the site root). Later versions have it in the runtime.
 */
const JAVAC_CLASS_PATH: Partial<Record<number, string>> = { 8: '/app/cheerpj/tools.jar' };

/** Resolves with `javac`'s exit code; `version` is the one CheerpJ was loaded with. */
export function runJavac(version: number, args: string[]): Promise<number> {
	return cheerpj.cheerpjRunMain(JAVAC_MAIN, JAVAC_CLASS_PATH[version] ?? '', ...args);
}

/** Resolves with the exit code; a program that keeps running may never resolve. */
export function runJava(mainClass: string, classPath: string, args: string[]): Promise<number> {
	return cheerpj.cheerpjRunMain(mainClass, classPath, ...args);
}
