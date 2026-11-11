/** The Java versions CheerpJ ships a runtime for. */
export const JAVA_VERSIONS = [8, 11, 17, 21, 25] as const;

export type JavaVersion = (typeof JAVA_VERSIONS)[number];

export function isJavaVersion(value: unknown): value is JavaVersion {
	return (JAVA_VERSIONS as readonly unknown[]).includes(value);
}
