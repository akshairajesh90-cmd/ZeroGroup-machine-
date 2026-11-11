/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  SiteLocationButtons,
  getGoogleMapsDirectionsUrl,
} from "../SiteLocationButtons";

describe("SiteLocationButtons & Maps Directions Resolver", () => {
  describe("getGoogleMapsDirectionsUrl", () => {
    it("generates directions URL with exact numeric latitude and longitude", () => {
      const url = getGoogleMapsDirectionsUrl({
        latitude: 9.7117,
        longitude: 76.6853,
      });
      expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=9.7117,76.6853");
    });

    it("uses existing mapLink when provided as full http(s) URL", () => {
      const directUrl = "https://maps.app.goo.gl/AbCdEf123456";
      const url = getGoogleMapsDirectionsUrl({
        mapLink: directUrl,
      });
      expect(url).toBe(directUrl);
    });

    it("encodes address destination when coordinates are absent", () => {
      const url = getGoogleMapsDirectionsUrl({
        address: "Kakkanad InfoPark Phase 2, Kochi",
      });
      expect(url).toContain("https://www.google.com/maps/dir/?api=1&destination=");
      expect(url).toContain("Kakkanad%20InfoPark%20Phase%202%2C%20Kochi");
    });

    it("falls back to base maps URL if all inputs are empty", () => {
      const url = getGoogleMapsDirectionsUrl({});
      expect(url).toBe("https://www.google.com/maps");
    });
  });

  describe("SiteLocationButtons Component", () => {
    it("renders navigate and pin buttons for valid coordinates", () => {
      render(
        <SiteLocationButtons
          latitude={9.7117}
          longitude={76.6853}
          address="Pala Site"
          locationName="Site Alpha"
        />
      );

      const navLink = screen.getByRole("link", { name: /navigate|maps/i });
      expect(navLink).toBeInTheDocument();
      expect(navLink).toHaveAttribute("target", "_blank");
      expect(navLink).toHaveAttribute("href", expect.stringContaining("destination=9.7117,76.6853"));
    });

    it("renders driver variant with large touch target", () => {
      render(
        <SiteLocationButtons
          latitude={9.5916}
          longitude={76.5222}
          variant="driver"
          locationName="Kottayam Yard"
        />
      );

      const navLink = screen.getByRole("link");
      expect(navLink).toBeInTheDocument();
      expect(navLink.className).toContain("bg-emerald-600");
    });
  });
});
