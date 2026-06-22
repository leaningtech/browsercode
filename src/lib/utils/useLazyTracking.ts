type PlausibleProps = Record<string, string | number | boolean>;

declare global {
	interface Window {
		plausible?: (eventName: string, options?: { props?: PlausibleProps }) => void;
	}
}

export function trackEvent(eventName: string, props: PlausibleProps = {}) {
	if (typeof window !== 'undefined' && window.plausible) {
		window.plausible(eventName, { props });
	}
}
