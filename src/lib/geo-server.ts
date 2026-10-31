import * as dns from "dns";
import * as https from "https";
import { URL } from "url";
import { parseGoogleMapsUrl, type Coordinates } from "./geo";

export type HttpRedirectFollower = (
  url: URL,
  pinnedIp: string,
  ipFamily: number
) => Promise<string | null>;

/**
 * Checks if an IPv4 or IPv6 address is private, loopback, link-local, or cloud metadata.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip) return true;

  // IPv6 loopback
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;

  // IPv6 mapped IPv4 (e.g. ::ffff:127.0.0.1)
  const mappedIpv4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedIpv4) {
    return isPrivateOrReservedIp(mappedIpv4[1]);
  }

  // IPv6 Unique Local (fc00::/7) and Link-Local (fe80::/10)
  if (/^f[cd][0-9a-f]{2}:/i.test(ip) || /^fe[89ab][0-9a-f]:/i.test(ip)) {
    return true;
  }

  // Check IPv4 format
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    // If not standard IPv4, and not already accepted standard IPv6, reject
    return true;
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 255.255.255.255/32 (Broadcast)
  if (parts.every((p) => p === 255)) return true;

  return false;
}

const ALLOWED_EXACT_HOSTS = new Set([
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
]);

/**
 * Validates that a URL's hostname is in our exact allowlist.
 * www.google.com is ONLY allowed if pathname starts with /maps.
 */
export function isAllowedHost(hostname: string, pathname?: string): boolean {
  if (!hostname) return false;
  const lowerHost = hostname.toLowerCase();

  if (ALLOWED_EXACT_HOSTS.has(lowerHost)) {
    return true;
  }

  if (lowerHost === "www.google.com") {
    // Strictly restrict www.google.com to /maps*
    return !!pathname && (pathname === "/maps" || pathname.startsWith("/maps/"));
  }

  return false;
}

/**
 * Resolves short Google Maps URLs safely with SSRF protections:
 * - Requires https:
 * - Strictly checks exact hostname allowlist
 * - Blocks embedded userinfo (user:pass@host)
 * - Resolves DNS and blocks private/loopback/cloud metadata IPs
 * - Pins the resolved IP during connection to eliminate DNS rebinding
 * - Follows redirects manually up to maxHops with re-verification on every hop
 * - Unnests google.com/url?q=... wrappers
 * - Returns ONLY { lat, lng }, never raw URL or body
 */
export async function resolveGoogleMapsLink(
  rawUrl: string,
  maxHops: number = 3,
  customRequester?: HttpRedirectFollower
): Promise<Coordinates> {
  let currentUrlString = rawUrl.trim();

  // First, check if the raw link already contains coordinates directly without network calls
  const directCoords = parseGoogleMapsUrl(currentUrlString);
  if (directCoords) {
    return directCoords;
  }

  let hop = 0;

  while (hop <= maxHops) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrlString);
    } catch {
      throw new Error("Invalid URL format");
    }

    // Protocol check: HTTPS only
    if (parsedUrl.protocol !== "https:") {
      throw new Error("Only HTTPS URLs are allowed");
    }

    // Reject userinfo (@ symbol / username / password)
    if (parsedUrl.username || parsedUrl.password) {
      throw new Error("URLs with authentication credentials are not permitted");
    }

    // Hostname check
    if (!isAllowedHost(parsedUrl.hostname, parsedUrl.pathname)) {
      throw new Error(`Hostname '${parsedUrl.hostname}' is not permitted`);
    }

    // DNS Resolution & IP verification
    let resolvedAddresses: dns.LookupAddress[];
    try {
      resolvedAddresses = await dns.promises.lookup(parsedUrl.hostname, {
        all: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`DNS resolution failed for ${parsedUrl.hostname}: ${msg}`);
    }

    if (!resolvedAddresses || resolvedAddresses.length === 0) {
      throw new Error(`DNS resolution returned no addresses for ${parsedUrl.hostname}`);
    }

    // Validate that none of the resolved IPs are private or link-local
    for (const addr of resolvedAddresses) {
      if (isPrivateOrReservedIp(addr.address)) {
        throw new Error(
          `Security violation: Resolved IP ${addr.address} is in a private or reserved range`
        );
      }
    }

    const pinnedIp = resolvedAddresses[0].address;
    const ipFamily = resolvedAddresses[0].family;

    // Perform manual HTTP HEAD request with pinned IP agent (or custom requester in tests)
    const redirectLocation = customRequester
      ? await customRequester(parsedUrl, pinnedIp, ipFamily)
      : await new Promise<string | null>((resolve, reject) => {
          const agent = new https.Agent({
            lookup: (_hostname, _options, callback) => {
              // Pin to the exact IP already verified, preventing DNS rebinding
              callback(null, pinnedIp, ipFamily);
            },
          });

          const req = https.request(
            {
              hostname: parsedUrl.hostname,
              port: 443,
              path: parsedUrl.pathname + parsedUrl.search,
              method: "HEAD",
              agent,
              timeout: 5000,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              },
            },
            (res) => {
              const statusCode = res.statusCode || 0;
              if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
                resolve(res.headers.location);
              } else {
                resolve(null);
              }
            }
          );

          req.on("timeout", () => {
            req.destroy(new Error("Request timed out after 5000ms"));
          });

          req.on("error", (err) => {
            reject(err);
          });

          req.end();
        });

    if (!redirectLocation) {
      // No redirect found; attempt one last parse on the current URL
      const finalCoords = parseGoogleMapsUrl(currentUrlString);
      if (finalCoords) {
        return finalCoords;
      }
      throw new Error("Could not extract coordinates from link");
    }

    // Resolve relative or absolute redirect location
    let nextUrl: URL;
    try {
      nextUrl = new URL(redirectLocation, currentUrlString);
    } catch {
      throw new Error("Invalid redirect location returned by server");
    }

    // Check if the redirect location contains coordinates directly
    const coordsInLocation = parseGoogleMapsUrl(nextUrl.toString());
    if (coordsInLocation) {
      return coordsInLocation;
    }

    currentUrlString = nextUrl.toString();
    hop++;

    if (hop > maxHops) {
      throw new Error("Exceeded maximum redirect hops limit");
    }
  }

  throw new Error("Could not extract coordinates from link");
}
