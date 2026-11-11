/**
 * Reads a compiled `.class` file to tell whether `java` can start it, per the JVM specification's
 * class file format (chapter 4). Only declared methods count, not a `main` a class inherits.
 */
import type { JavaVersion } from './versions';

const MAGIC = 0xcafebabe;
const ACC_PUBLIC = 0x0001;
const ACC_PRIVATE = 0x0002;
const ACC_STATIC = 0x0008;
const ACC_INTERFACE = 0x0200;
const ACC_ABSTRACT = 0x0400;
const STRING_ARRAY_MAIN = '([Ljava/lang/String;)V';
const NO_ARGS = '()V';
/** Java 25 (JEP 512) also starts a non-public, instance or argument-less `main`. */
const FLEXIBLE_MAIN_SINCE = 25;

/** Byte sizes of the constant pool entries that hold no UTF-8 text, by tag. */
const CONSTANT_SIZE: Partial<Record<number, number>> = {
	3: 4,
	4: 4,
	5: 8,
	6: 8,
	7: 2,
	8: 2,
	9: 4,
	10: 4,
	11: 4,
	12: 4,
	15: 3,
	16: 2,
	17: 4,
	18: 4,
	19: 2,
	20: 2
};
const UTF8 = 1;
const CLASS = 7;
const LONG = 5;
const DOUBLE = 6;

type Member = { flags: number; name: string; descriptor: string };

/**
 * The class's binary name (`pkg.Outer$Inner`) when `java` on `version` can start it, else null.
 * Throws on bytes that aren't a class file.
 */
export function launchableClass(bytes: Uint8Array, version: JavaVersion): string | null {
	const { flags, name, methods } = parse(bytes);
	const isMain = (method: Member): boolean =>
		method.name === 'main' && !(method.flags & ACC_PRIVATE);
	if (version < FLEXIBLE_MAIN_SINCE) {
		const ok = methods.some(
			(method) =>
				isMain(method) &&
				method.descriptor === STRING_ARRAY_MAIN &&
				(method.flags & (ACC_PUBLIC | ACC_STATIC)) === (ACC_PUBLIC | ACC_STATIC)
		);
		return ok ? name : null;
	}
	const mains = methods.filter(
		(method) =>
			isMain(method) && (method.descriptor === STRING_ARRAY_MAIN || method.descriptor === NO_ARGS)
	);
	if (mains.some((method) => method.flags & ACC_STATIC)) return name;
	// An instance `main` needs an object, so the class must be one `java` can construct.
	const constructible =
		!(flags & (ACC_INTERFACE | ACC_ABSTRACT)) &&
		methods.some(
			(method) =>
				method.name === '<init>' && method.descriptor === NO_ARGS && !(method.flags & ACC_PRIVATE)
		);
	return mains.length > 0 && constructible ? name : null;
}

function parse(bytes: Uint8Array): { flags: number; name: string; methods: Member[] } {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let at = 0;
	const read = (size: 1 | 2 | 4): number => {
		const value =
			size === 1 ? view.getUint8(at) : size === 2 ? view.getUint16(at) : view.getUint32(at);
		at += size;
		return value;
	};

	if (read(4) !== MAGIC) throw new Error('Not a class file');
	// Skips the minor and major version.
	at += 4;
	// Modified UTF-8 differs from UTF-8 only for NUL and characters outside the BMP, neither of
	// which the names compared here contain.
	const decoder = new TextDecoder();
	const utf8: string[] = [];
	const classNames: number[] = [];
	const count = read(2);
	for (let index = 1; index < count; index++) {
		const tag = read(1);
		if (tag === UTF8) {
			const length = read(2);
			utf8[index] = decoder.decode(bytes.subarray(at, at + length));
			at += length;
			continue;
		}
		const size = CONSTANT_SIZE[tag];
		if (size === undefined) throw new Error(`Unknown constant pool tag ${tag}`);
		if (tag === CLASS) classNames[index] = view.getUint16(at);
		at += size;
		// The JVM spec gives these two slots each.
		if (tag === LONG || tag === DOUBLE) index++;
	}
	const flags = read(2);
	const name = utf8[classNames[read(2)]].replaceAll('/', '.');
	// Skips the superclass, then the interfaces. `at += read()` would drop the read's own advance.
	at += 2;
	const interfaces = read(2);
	at += 2 * interfaces;

	const members = (): Member[] => {
		const list: Member[] = [];
		for (let left = read(2); left > 0; left--) {
			const member = { flags: read(2), name: utf8[read(2)], descriptor: utf8[read(2)] };
			for (let attributes = read(2); attributes > 0; attributes--) {
				at += 2;
				const length = read(4);
				at += length;
			}
			list.push(member);
		}
		return list;
	};
	// Fields come first and share the methods' layout.
	members();
	return { flags, name, methods: members() };
}
