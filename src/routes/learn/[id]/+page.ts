import { error } from '@sveltejs/kit';
import { findLesson, lessons } from '$lib/learn/lessons';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => lessons.map(({ id }) => ({ id }));

export const load: PageLoad = ({ params }) => {
	const lesson = findLesson(params.id);
	if (!lesson) error(404, `There's no lesson ${params.id}.`);
	return { lesson };
};
