import {
  parseGoogleMapsUrl,
  isValidCoordinate,
} from "../geo";
import {
  isAllowedHost,
  isPrivateOrReservedIp,
  resolveGoogleMapsLink,
} from "../geo-server";
import * as dns from "dns";
import * as https from "https";
import { EventEmitter } from "events";

describe("Geo Utility & URL Parsing Tests", () => {
  describe("parseGoogleMapsUrl - Priority Hierarchy", () => {
    test("Priority 1: Prefers !3d..!4d.. pin coordinates over @lat,lng viewport coordinates", () => {
      // Modern Google Maps URL having both @viewport and !3d..!4d.. pin
      const modernUrl =
        "https://www.google.com/maps/place/Zero+Group+Base+Yard/@9.700000,76.600000,15z/data=!4m6!3m5!1s0x3b07b30:0x123!8m2!3d9.591600!4d76.522200!16s%2Fg%2F11";

      const parsed = parseGoogleMapsUrl(modernUrl);
      expect(parsed).not.toBeNull();
      // MUST match the !3d..!4d.. pin (9.5916, 76.5222), NOT the @ viewport (9.7, 76.6)
      expect(parsed?.lat).toBeCloseTo(9.5916, 4);
      expect(parsed?.lng).toBeCloseTo(76.5222, 4);
    });

    test("Priority 2: Parses ?q= query parameter", () => {
      const qUrl = "https://maps.google.com/?q=9.591600,76.522200";
      const parsed = parseGoogleMapsUrl(qUrl);
      expect(parsed).toEqual({ lat: 9.5916, lng: 76.5222 });
    });

    test("Priority 2: Parses &query= and ll= query parameters", () => {
      const queryUrl = "https://www.google.com/maps/search/?api=1&query=9.5916,76.5222";
      expect(parseGoogleMapsUrl(queryUrl)).toEqual({ lat: 9.5916, lng: 76.5222 });

      const llUrl = "https://maps.google.com/?ll=9.5916,76.5222&z=16";
      expect(parseGoogleMapsUrl(llUrl)).toEqual({ lat: 9.5916, lng: 76.5222 });
    });

    test("Priority 3: Falls back to @lat,lng camera viewport when !3d..!4d.. is absent", () => {
      const viewportOnlyUrl = "https://www.google.com/maps/@9.591600,76.522200,16z";
      const parsed = parseGoogleMapsUrl(viewportOnlyUrl);
      expect(parsed).toEqual({ lat: 9.5916, lng: 76.5222 });
    });

    test("Priority 4: Parses plain comma-separated coordinates string", () => {
      const rawString = "9.591600, 76.522200";
      expect(parseGoogleMapsUrl(rawString)).toEqual({ lat: 9.5916, lng: 76.5222 });

      const negativeCoords = "-12.046374, -77.042793";
      expect(parseGoogleMapsUrl(negativeCoords)).toEqual({
        lat: -12.046374,
        lng: -77.042793,
      });
    });

    test("Unnests google.com/url?q=... redirect wrappers", () => {
      const wrappedUrl =
        "https://www.google.com/url?q=https%3A%2F%2Fmaps.google.com%2F%3Fq%3D9.591600%2C76.522200&sa=D&sntz=1";
      const parsed = parseGoogleMapsUrl(wrappedUrl);
      expect(parsed).toEqual({ lat: 9.5916, lng: 76.5222 });
    });

    test("Returns null for invalid inputs or out-of-range coordinates", () => {
      expect(parseGoogleMapsUrl("")).toBeNull();
      expect(parseGoogleMapsUrl("not-a-map-url")).toBeNull();
      expect(parseGoogleMapsUrl("91.0000, 76.0000")).toBeNull(); // Latitude > 90
      expect(parseGoogleMapsUrl("9.0000, 185.0000")).toBeNull(); // Longitude > 180
    });
  });

  describe("SSRF Security & Hostname Validation", () => {
    test("isAllowedHost accepts exact allowed Google Maps hosts", () => {
      expect(isAllowedHost("maps.google.com")).toBe(true);
      expect(isAllowedHost("maps.app.goo.gl")).toBe(true);
      expect(isAllowedHost("goo.gl")).toBe(true);
      expect(isAllowedHost("www.google.com", "/maps/place/Zero")).toBe(true);
      expect(isAllowedHost("www.google.com", "/maps")).toBe(true);
    });

    test("isAllowedHost strictly rejects non-map paths on www.google.com", () => {
      expect(isAllowedHost("www.google.com", "/search")).toBe(false);
      expect(isAllowedHost("www.google.com", "/")).toBe(false);
      expect(isAllowedHost("www.google.com", "/url")).toBe(false);
    });

    test("isAllowedHost rejects subdomain attacks and typo-squatting hosts", () => {
      expect(isAllowedHost("maps.google.com.evil.com")).toBe(false);
      expect(isAllowedHost("evilgoogle.com")).toBe(false);
      expect(isAllowedHost("google.com.attacker.com")).toBe(false);
      expect(isAllowedHost("localhost")).toBe(false);
      expect(isAllowedHost("127.0.0.1")).toBe(false);
      expect(isAllowedHost("169.254.169.254")).toBe(false);
    });

    test("isPrivateOrReservedIp detects all private, loopback, link-local, and cloud metadata ranges", () => {
      // Loopback
      expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("127.255.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("::1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);

      // AWS / GCP / Azure Cloud Metadata service
      expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedIp("169.254.1.1")).toBe(true);

      // RFC 1918 Private Ranges
      expect(isPrivateOrReservedIp("10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("10.255.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("172.31.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.1.1")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.0.254")).toBe(true);

      // Broadcast and Current Network
      expect(isPrivateOrReservedIp("0.0.0.0")).toBe(true);
      expect(isPrivateOrReservedIp("255.255.255.255")).toBe(true);

      // Public Valid IPs
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false); // Google Public DNS
      expect(isPrivateOrReservedIp("142.250.190.46")).toBe(false); // Google Maps public IP
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false); // Cloudflare DNS
    });
  });

  describe("resolveGoogleMapsLink - Security & Redirect Enforcement", () => {
    test("Rejects plain http:// protocol", async () => {
      await expect(
        resolveGoogleMapsLink("http://maps.google.com/?q=test")
      ).rejects.toThrow("Only HTTPS URLs are allowed");
    });

    test("Rejects URLs with credentials (@-sign trick: https://maps.google.com@evil.com)", async () => {
      await expect(
        resolveGoogleMapsLink("https://maps.google.com@evil.com/path")
      ).rejects.toThrow("URLs with authentication credentials are not permitted");
    });

    test("Rejects disallowed host directly", async () => {
      await expect(
        resolveGoogleMapsLink("https://evilgoogle.com/maps/test")
      ).rejects.toThrow("Hostname 'evilgoogle.com' is not permitted");
    });

    test("Rejects Hop-2 redirect from allowed host to disallowed host (SSRF Protection)", async () => {
      // Mock dns.promises.lookup to return a public IP for maps.app.goo.gl
      const originalLookup = dns.promises.lookup;
      // @ts-expect-error Mocking overload for { all: true }
      jest.spyOn(dns.promises, "lookup").mockImplementation(async (hostname) => {
        if (hostname === "maps.app.goo.gl") {
          return [{ address: "142.250.190.46", family: 4 }] as dns.LookupAddress[];
        }
        return originalLookup(hostname as string, { all: true });
      });

      // Custom requester simulating a 302 redirect from maps.app.goo.gl to evil.com
      const mockRequester = jest.fn().mockResolvedValue("https://evil.com/stolen-token?lat=12&lng=34");

      await expect(
        resolveGoogleMapsLink("https://maps.app.goo.gl/shortId123", 3, mockRequester)
      ).rejects.toThrow("Hostname 'evil.com' is not permitted");

      expect(mockRequester).toHaveBeenCalledTimes(1);
      jest.restoreAllMocks();
    });

    test("Rejects when DNS resolves to a private IP (DNS Rebinding protection)", async () => {
      // Mock dns.promises.lookup to return a loopback IP for maps.app.goo.gl
      // @ts-expect-error Mocking overload for { all: true }
      jest.spyOn(dns.promises, "lookup").mockResolvedValue([
        { address: "127.0.0.1", family: 4 },
      ] as dns.LookupAddress[]);

      await expect(
        resolveGoogleMapsLink("https://maps.app.goo.gl/maliciousRebind")
      ).rejects.toThrow("Security violation: Resolved IP 127.0.0.1 is in a private or reserved range");

      jest.restoreAllMocks();
    });

    test("Rejects when DNS resolves to cloud metadata IP 169.254.169.254", async () => {
      // @ts-expect-error Mocking overload for { all: true }
      jest.spyOn(dns.promises, "lookup").mockResolvedValue([
        { address: "169.254.169.254", family: 4 },
      ] as dns.LookupAddress[]);

      await expect(
        resolveGoogleMapsLink("https://maps.app.goo.gl/cloudMetadataAttack")
      ).rejects.toThrow("Security violation: Resolved IP 169.254.169.254 is in a private or reserved range");

      jest.restoreAllMocks();
    });
  });
});
