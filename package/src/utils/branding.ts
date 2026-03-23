import { capabilityGroups } from "../constants/index.js";

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
