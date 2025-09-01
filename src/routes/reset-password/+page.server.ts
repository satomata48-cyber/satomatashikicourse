import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// No server-side data needed for this page
	return {};
};