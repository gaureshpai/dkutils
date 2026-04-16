import { capabilityGroups } from "@package/constants/index.js";

/**
 * Returns the default banner shown when the `dkutils` CLI is invoked without arguments.
 *
 * This banner contains information about the toolkit, such as the total number of operations and the number of groups.
 *
 * The banner is formatted as a multi-line string with the following structure:
 *   - A logo made up of ASCII art
 *   - A short description of the toolkit
 *   - A list of the tool groups
 *   - A list of the primary usage of the toolkit
 *   - A message about running the toolkit without arguments to open the interactive terminal UI
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
