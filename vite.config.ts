import { existsSync, readdirSync, readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { PNPM_WORKSPACE_FILE, patchPnpmOverrides } from './src/lib/ide/pnpm-workspace';

const TEMPLATES_DIR = 'static/templates';

/**
 * Templates ship their own copy of the wasm bundler overrides that cloned repos get written from
 * `WASM_BUNDLERS`; this fails dev and build when a copy stops matching.
 */
function templateOverrides(): Plugin {
	return {
		name: 'browsercode:template-overrides',
		buildStart() {
			for (const id of readdirSync(TEMPLATES_DIR)) {
				const path = `${TEMPLATES_DIR}/${id}/${PNPM_WORKSPACE_FILE}`;
				if (!existsSync(path)) continue;
				const drift = patchPnpmOverrides(readFileSync(path, 'utf8'));
				if (drift) this.error(`${path} does not match WASM_BUNDLERS: ${drift.notes.join('; ')}`);
			}
		}
	};
}

export default defineConfig({
	plugins: [templateOverrides(), tailwindcss(), sveltekit()],
	server: {
		port: Number(process.env.PORT) || 5173,
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Content-Security-Policy': "frame-ancestors 'self' https://browserpod.io"
		}
	}
});
