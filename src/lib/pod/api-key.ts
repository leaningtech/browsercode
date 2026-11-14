import type { BootOptions, BrowserPod } from '@leaningtech/browserpod';

/** browsercode.io's own BrowserPod key, whitelisted for its domain. */
export const SITE_API_KEY = import.meta.env.VITE_API_KEY as string;

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
	return { network: await pod.createFetchNetwork({ fetch: pod.opinionatedFetch }) };
}
