import type { Config } from 'tailwindcss';

export default {
	theme: {
		extend: {
			width: {
				sidebar: '3.5rem',
				panel: '15rem'
			},
			colors: {
				bc: {
					sidebar: '#0a0a0b',
					panel: '#111113',
					terminal: '#0d0d0f',
					topbar: '#111113',
					statusbar: '#0a0a0b'
				}
			}
		}
	}
} satisfies Config;
