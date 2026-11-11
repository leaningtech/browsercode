import type { BootOptions, BrowserPod } from '@leaningtech/browserpod';

/** browsercode.io's own BrowserPod key, whitelisted for its domain. */
export const SITE_API_KEY = import.meta.env.VITE_API_KEY as string;

/** The keyless network API, which the published types do not include yet. */
type KeylessCapablePod = typeof BrowserPod & {
	createFetchNetwork(options: { fetch: unknown }): Promise<unknown>;
	opinionatedFetch: unknown;
};

/**
 * How a pod reaches the network: through BrowserPod's edge with a key, else through the browser's
 * own fetch, which serves no portals. `opinionatedFetch` drops the request headers that fail the
 * npm registry's CORS preflight, which the default keyless network does not.
 */
export async function podNetworkOptions(
	pod: typeof BrowserPod,
	apiKey: string | undefined
): Promise<BootOptions> {
	if (apiKey) return { apiKey };
	const keyless = pod as KeylessCapablePod;
	const network = await keyless.createFetchNetwork({ fetch: keyless.opinionatedFetch });
	// BootOptions still types `apiKey` as required and has no `network`.
	return { network } as unknown as BootOptions;
}
