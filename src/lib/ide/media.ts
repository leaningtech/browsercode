/**
 * Image tabs: pod files have no URL an `<img>` can reach, so the bytes are read once and
 * republished as an object URL, owned by the tab that holds it.
 */
import type { BrowserPod } from '@leaningtech/browserpod';
import { readPodBinaryFile } from '$lib/pod/fs';

/** `url` stays valid until {@link releaseImage}. */
export type ImagePayload = { url: string; bytes: number };

/** Extensions a browser renders in an `<img>`. SVG is absent so it stays editable as text; */
const IMAGE_MIME: Record<string, string> = {
	png: 'image/png',
	apng: 'image/apng',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	jpe: 'image/jpeg',
	jif: 'image/jpeg',
	jfif: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	avif: 'image/avif',
	bmp: 'image/bmp',
	ico: 'image/x-icon'
};

const extensionOf = (path: string): string => path.slice(path.lastIndexOf('.') + 1).toLowerCase();

/** True when `path` opens as an image tab rather than in the text editor. */
export function isImagePath(path: string): boolean {
	return extensionOf(path) in IMAGE_MIME;
}

/** Reads an image out of the pod and publishes it as an object URL. */
export async function loadPodImage(pod: BrowserPod, absPath: string): Promise<ImagePayload> {
	const bytes = await readPodBinaryFile(pod, absPath);
	const blob = new Blob([bytes], { type: IMAGE_MIME[extensionOf(absPath)] });
	return { url: URL.createObjectURL(blob), bytes: bytes.byteLength };
}

/** Releases the object URL; a leaked one pins the whole image in memory. */
export function releaseImage(image: ImagePayload | undefined): void {
	if (image) URL.revokeObjectURL(image.url);
}

const BYTE_UNITS = ['B', 'KB', 'MB'];

/** Byte count for the viewer's status line, e.g. `24.1 KB`. */
export function formatBytes(bytes: number): string {
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${unit === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[unit]}`;
}
