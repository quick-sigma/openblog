import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	main: {
		build: {
			externalizeDeps: true,
			lib: {
				entry: 'electron/main.ts',
			},
			outDir: 'dist/main',
			rollupOptions: {
				output: {
					entryFileNames: '[name].js',
				},
			},
		},
	},
	preload: {
		build: {
			externalizeDeps: true,
			lib: {
				entry: 'electron/preload.ts',
			},
			outDir: 'dist/preload',
			rollupOptions: {
				output: {
					format: 'cjs',
					entryFileNames: '[name].js',
				},
			},
		},
	},
	renderer: {
		root: 'src/renderer',
		publicDir: '../../public',
		plugins: [react()],
		build: {
			outDir: 'dist',
			emptyOutDir: false,
			rollupOptions: {
				input: 'src/renderer/index.html',
			},
		},
	},
})
