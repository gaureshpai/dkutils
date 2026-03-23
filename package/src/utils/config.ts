import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_PATH = join(homedir(), ".dkutils.json");

interface Config {
	watermark?: boolean;
}

export async function readConfig(): Promise<Config> {
	try {
		const data = await readFile(CONFIG_PATH, "utf-8");
		return JSON.parse(data);
	} catch {
		return {};
	}
}

export async function writeConfig(config: Config): Promise<void> {
	try {
		const currentConfig = await readConfig();
		const newConfig = { ...currentConfig, ...config };
		await writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
	} catch (error) {
		console.error("Failed to write config:", error);
	}
}
