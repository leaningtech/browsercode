/**
 * Finds the class a Java project starts from. Reads the sources rather than compiling them: a
 * run needs the name before `javac` has produced anything to inspect.
 */

/** Comments and literals, which may hold anything that looks like a declaration. */
const NOISE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g;
const PACKAGE = /^\s*package\s+([\w.\s]+?)\s*;/;
/** The lookbehind keeps a `Foo.class` literal and an `@interface` from reading as types. */
const TOKEN = /(?<![\w.@])(?:class|interface|enum|record)\s+(\w+)|\bvoid\s+main\s*\(|[{}]/g;

/**
 * The binary name of the first class that declares a `main` method, qualified by its package.
 * `preferred` goes first, then the rest in file order. With none, JavaFiddle's rule: the first
 * `.java` file's name. Null when there are no `.java` files at all.
 */
export function findMainClass(
	files: readonly { path: string; content: string }[],
	preferred?: string
): string | null {
	const sources = files
		.filter((file) => file.path.endsWith('.java'))
		.sort((a, b) => Number(b.path === preferred) - Number(a.path === preferred));
	for (const file of sources) {
		const mainClass = declaredMain(file.path, file.content);
		if (mainClass) return mainClass;
	}
	return sources[0] ? qualify(sources[0].content, fileClass(sources[0].path)) : null;
}

function declaredMain(path: string, content: string): string | null {
	const code = content.replace(NOISE, (match) => match.replace(/[^\n]/g, ' '));
	const open: { name: string; depth: number }[] = [];
	let pending: string | null = null;
	let depth = 0;
	for (const [token, name] of code.matchAll(TOKEN)) {
		if (name) pending = name;
		else if (token === '{') {
			depth++;
			if (pending) open.push({ name: pending, depth });
			pending = null;
		} else if (token === '}') {
			if (open.at(-1)?.depth === depth) open.pop();
			depth--;
		} else {
			// Outside any type is a compact source file, whose class Java names after the file.
			const names = open.length ? open.map((type) => type.name) : [fileClass(path)];
			return qualify(code, names.join('$'));
		}
	}
	return null;
}

function fileClass(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1, -'.java'.length);
}

function qualify(code: string, name: string): string {
	const pkg = code.replace(NOISE, '').match(PACKAGE)?.[1].replace(/\s+/g, '');
	return pkg ? `${pkg}.${name}` : name;
}
