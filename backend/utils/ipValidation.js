// Shared utility for IP validation
// Function to check if IP is private/reserved
const isPrivateIP = (ip) => {
  const privateRanges = [
    /^0\.0\.0\./, // 0.0.0.0/8
    /^10\./, // 10.0.0.0/8
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^127\./, // 127.0.0.0/8
    /^169\.254\./, // 169.254.0.0/16
    /^::1$/, // IPv6 loopback
    /^fc00:/, // IPv6 unique local address (fc00::/7)
    /^fd00:/, // IPv6 unique local address (fd00::/8)
    /^fe80:/, // IPv6 link-local address
  ];

  return privateRanges.some((range) => range.test(ip));
};

module.exports = { isPrivateIP };
