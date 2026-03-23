import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const builtCliPath = path.resolve("dist/dkutils-cli.js");
const publishedCliPath = path.resolve("dist/bin/dkutils.js");
const shebang = "#!/usr/bin/env node\n";

try {
	await mkdir(path.dirname(publishedCliPath), { recursive: true });
	await readFile(builtCliPath, "utf8");
	const wrapper = `${shebang}import "../dkutils-cli.js";\n`;
	await writeFile(publishedCliPath, wrapper, "utf8");
	await chmod(publishedCliPath, 0o755);
} catch {
	// Ignore missing CLI variants.
}

const typeCopies = [
	[path.resolve("dist/src/index.d.ts"), path.resolve("dist/DKUTILS.d.ts")],
	[path.resolve("dist/src/cli.d.ts"), path.resolve("dist/bin/dkutils.d.ts")],
];

for (const [sourcePath, destinationPath] of typeCopies) {
	try {
		await copyFile(sourcePath, destinationPath);
	} catch {
		// Ignore missing declarations.
	}
}
