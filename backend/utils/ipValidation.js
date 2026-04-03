// Shared utility for IP validation
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

	// Check for IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
	if (!ip || typeof ip !== "string") {
		return false;
	}

	if (ip.toLowerCase().startsWith("::ffff:")) {
		const ipv4Part = ip.substring(7);
		return privateRanges.some((range) => range.test(ipv4Part));
	}

	return privateRanges.some((range) => range.test(ip));
};

module.exports = { isPrivateIP };
