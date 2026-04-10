const { isIP } = require("node:net");

// Shared utility for IP validation
/**
 * Normalize IPv4-mapped IPv6 addresses to their IPv4 dotted-quad form.
 * Handles both dotted-quad mapped (::ffff:192.168.1.1) and hex-encoded mapped (::ffff:c0a8:101).
 * @param {string} ip - IP address to normalize
 * @returns {string} Normalized IP address (IPv4 if it was mapped, otherwise original)
 */
const normalizeIPv4Mapped = (ip) => {
	if (!ip || typeof ip !== "string") {
		return ip;
	}

	const normalized = ip.toLowerCase();

	// Check if it's an IPv6 address
	if (isIP(ip) !== 6) {
		return ip;
	}

	// Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x or ::ffff:xxxx:xxxx)
	if (normalized.startsWith("::ffff:")) {
		const suffix = ip.substring(7);

		// If already in dotted-quad form, return it
		if (suffix.includes(".")) {
			return suffix;
		}

		// Parse hex-encoded IPv4-mapped address (e.g., ::ffff:c0a8:101 or ::ffff:7f00:1)
		// Split on colons to get individual hextets
		const hextets = suffix.split(":");

		// Pad each hextet to 4 characters and concatenate
		let paddedHex;
		if (hextets.length === 2) {
			// Two hextets (e.g., c0a8:101 or 7f00:1)
			paddedHex = hextets[0].padStart(4, "0") + hextets[1].padStart(4, "0");
		} else if (hextets.length === 1) {
			// Single hextet, pad to 8 characters total
			paddedHex = hextets[0].padStart(8, "0");
		} else {
			// Fallback: just remove colons and pad
			paddedHex = suffix.replace(/:/g, "").padStart(8, "0");
		}

		// Convert to IPv4 dotted-quad
		const octet1 = Number.parseInt(paddedHex.substring(0, 2), 16);
		const octet2 = Number.parseInt(paddedHex.substring(2, 4), 16);
		const octet3 = Number.parseInt(paddedHex.substring(4, 6), 16);
		const octet4 = Number.parseInt(paddedHex.substring(6, 8), 16);

		return `${octet1}.${octet2}.${octet3}.${octet4}`;
	}

	return ip;
};

// Function to check if IP is private/reserved
const isPrivateIP = (ip) => {
	const privateRanges = [
		/^0\./, // 0.0.0.0/8
		/^10\./, // 10.0.0.0/8
		/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
		/^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
		/^192\.168\./, // 192.168.0.0/16
		/^127\./, // 127.0.0.0/8
		/^169\.254\./, // 169.254.0.0/16
		/^192\.0\.0\./, // 192.0.0.0/24 (IETF protocol assignments)
		/^192\.0\.2\./, // 192.0.2.0/24 (TEST-NET-1)
		/^198\.51\.100\./, // 198.51.100.0/24 (TEST-NET-2)
		/^203\.0\.113\./, // 203.0.113.0/24 (TEST-NET-3)
		/^(22[4-9]|23[0-9])\./, // 224.0.0.0/4 (Multicast)
		/^(24[0-9]|25[0-5])\./, // 240.0.0.0/4 (Reserved for future use)
		/^::1$/i, // IPv6 loopback
		/^f[cd][0-9a-f]{2}:/i, // IPv6 unique local address (fc00::/7)
		/^fe[89ab][0-9a-f]:/i, // IPv6 link-local address (fe80::/10)
		/^ff/i, // IPv6 multicast address
		/^2001:db8:/i, // IPv6 documentation prefix (2001:db8::/32)
	];

	if (!ip || typeof ip !== "string") {
		return false;
	}

	// Normalize IPv4-mapped IPv6 addresses first
	const normalizedIp = normalizeIPv4Mapped(ip);

	return privateRanges.some((range) => range.test(normalizedIp));
};

module.exports = { isPrivateIP, normalizeIPv4Mapped };
