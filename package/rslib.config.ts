import { defineConfig } from "@rslib/core";

export default defineConfig({
	lib: [
		{
			format: "esm",
			dts: true,
			syntax: "es2022",
		},
	],
	source: {
		entry: {
			DKUTILS: "./src/index.ts",
			"dkutils-cli": "./src/cli.ts",
		},
		tsconfigPath: "./tsconfig.json",
	},
	output: {
		target: "node",
		sourceMap: false,
		minify: true,
		cleanDistPath: true,
		legalComments: "none",
	},
	tools: {
		rspack: {
			externals: ["sharp", "@imgly/background-removal-node", "ffmpeg-static", "yt-dlp-static"],
			optimization: {
				splitChunks: false,
			},
			output: {
				filename: "[name].js",
				chunkFilename: "[name].js",
			},
		},
	},
});
