import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@frontend": path.resolve(__dirname, "./src"),
		},
	},
	optimizeDeps: {
		include: ["react", "react-dom", "react-router-dom"],
	},
	server: {
		proxy: {
			"/api": {
				target: "https://dkutility.vercel.app/",
				changeOrigin: true,
				secure: false,
			},
		},
	},
	build: {
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("node_modules")) {
						if (["pdf-lib", "pdfjs-dist", "jspdf"].some((pkg) => id.includes(pkg))) {
							return "pdf-vendor";
						}
						if (["@radix-ui", "lucide-react"].some((pkg) => id.includes(pkg))) {
							return "ui-vendor";
						}
					}
				},
			},
		},
	},
});
