export const DKU_BRAND = "dkutils";
export const DKU_WATERMARK = "dkutils";

export const capabilityGroups = {
	image: [
		"convert",
		"compress",
		"resize",
		"crop",
		"grayscale",
		"flip",
		"remove-bg",
		"to-pdf",
		"to-base64",
		"from-base64",
		"png-to-jpg",
	],
	pdf: [
		"merge",
		"split",
		"compress",
		"rotate",
		"delete-pages",
		"to-text",
		"to-word",
		"to-excel",
		"text-to-pdf",
	],
	media: ["mov-to-mp4", "to-png"],
	youtube: ["download"],
} as const;

/**
 * Returns the default banner shown when the `dkutils` CLI is invoked without arguments.
 */
export function renderCliBanner(): string {
	const totalCommands = Object.values(capabilityGroups).reduce(
		(count, commands) => count + commands.length,
		0,
	);

	const groupLines = Object.entries(capabilityGroups).map(
		([group, commands]) => `  ${group.padEnd(7)} ${commands.length} tools`,
	);

	const logo = `
██████╗ ██╗  ██╗██╗   ██╗████████╗██╗██╗     ███████╗
██╔══██╗██║ ██╔╝██║   ██║╚══██╔══╝██║██║     ██╔════╝
██║  ██║█████╔╝ ██║   ██║   ██║   ██║██║     ███████╗
██║  ██║██╔═██╗ ██║   ██║   ██║   ██║██║     ╚════██║
██████╔╝██║  ██╗╚██████╔╝   ██║   ██║███████╗███████║
╚═════╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝╚══════╝╚══════╝
`;

	return [
		logo,
		`Interactive utility toolkit with ${totalCommands} operations across ${Object.keys(capabilityGroups).length} groups.`,
		"",
		"Tool groups:",
		...groupLines,
		"",
		"Primary usage:",
		"  npx dkutils",
		"  dkutils --help",
		"  dkutils <group> --help",
		"",
		"Run without arguments to open the interactive terminal UI.",
	].join("\n");
}
