import { spawn } from "node:child_process";

import ffmpegStatic from "ffmpeg-static";

export const ffmpegPath = ffmpegStatic ?? "ffmpeg";

export async function runFfmpeg(args: string[]): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(ffmpegPath, args, {
			stdio: "ignore",
			windowsHide: true,
		});

		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`ffmpeg exited with code ${code ?? -1}`));
		});
	});
}
