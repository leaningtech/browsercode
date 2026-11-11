/**
 * Whether a route's URL opens a project, decided the way its own page decides it.
 *
 * The sidebar gates the leave warning on this, and the layout its landing chrome. Both used to
 * ask whether the URL carried a parameter rather than whether that parameter resolved, so a
 * `?framework=`, `?example=` or hash we can't read — which lands on the picker with nothing
 * running — counted as a live session and warned people they were about to lose work that was
 * never there. Shared so the two can't drift from each other, or from the routes.
 */
import { resolveExample, resolveFrameworkId } from '$lib/config/frameworks';
import { decodeSharedProject } from '$lib/java/shared-project';

export function opensProject(routeId: string | null | undefined, url: URL): boolean {
	// A cloned repo carries its owner and name in the path, so there is nothing to resolve.
	if (routeId?.startsWith('/ide/')) return true;
	if (routeId === '/ide') {
		return resolveFrameworkId(url.searchParams.get('framework')) !== undefined;
	}
	if (routeId !== '/java') return false;
	// As on the route: a shared link's hash stands in for `?example=` and wins over it, so a hash
	// we can't decode opens nothing even when an example is named alongside it.
	const hash = url.hash.slice(1);
	if (hash) return decodeSharedProject(hash) !== null;
	const example = url.searchParams.get('example');
	return example !== null && resolveExample('java', example) !== undefined;
}
