import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_PATH = join(homedir(), ".dkutils.json");

interface Config {
	watermark?: boolean;
}

/**
 * Reads the configuration file at ${CONFIG_PATH} and returns its contents as a Promise.
 * If the file does not exist, an empty object is returned.
 * @returns {Promise<Config>}
 */
export async function readConfig(): Promise<Config> {
	try {
		const data = await readFile(CONFIG_PATH, "utf-8");
		return JSON.parse(data);
	} catch {
		return {};
	}
}

/**
 * Writes a configuration file at ${CONFIG_PATH} with the provided config object.
 * If the file does not exist, it will be created.
 * If the file already exists, it will be overwritten with the new configuration.
 * @param {Config} config - The configuration object to write to the file.
 * @returns {Promise<void>} - A promise that resolves when the configuration file has been written successfully.
 */
export async function writeConfig(config: Config): Promise<void> {
	try {
		const currentConfig = await readConfig();
		const newConfig = { ...currentConfig, ...config };
		await writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
	} catch (error) {
		console.error("Failed to write config:", error);
	}
}
