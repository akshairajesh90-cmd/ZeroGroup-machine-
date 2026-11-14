/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PublicLandingClient from "../PublicLandingClient";

const mockSettings = {
  storeName: "Zero Group Machinery Rentals",
  storeAddress: "Central Machinery Yard, Pala - Ponkunnam Road, Kottayam, Kerala",
  storeLatitude: 9.5916,
  storeLongitude: 76.5222,
  companyPhone: "+91 98471 11000",
  whatsappNumber: "+919847111000",
  companyEmail: "dispatch@zerogroup.in",
  gstinNumber: "32AAAAZ0000A1Z5",
  heroHeadline: "Heavy Construction Equipment & Precision Plant Logistics",
  heroSubheadline: "Commercial concrete mixers, vertical material hoists, and heavy de-watering plant.",
  publicNotice: "Central Yard operational",
  maintenanceMode: false,
  maintenanceNotice: "",
};

describe("PublicLandingClient Component", () => {
  beforeEach(() => {
    window.open = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Brand & Header Rendering", () => {
    it("renders Zero Group branding and contact information", () => {
      render(<PublicLandingClient settings={mockSettings} />);

      expect(screen.getAllByText("ZERO GROUP").length).toBeGreaterThan(0);
      expect(screen.getAllByText("MACHINERY").length).toBeGreaterThan(0);
      expect(screen.getAllByText("+91 98471 11000").length).toBeGreaterThan(0);
    });

    it("renders Crew Login link when user is unauthenticated", () => {
      render(<PublicLandingClient settings={mockSettings} sessionUser={null} />);
      const loginLinks = screen.getAllByRole("link", { name: /Crew Login/i });
      expect(loginLinks.length).toBeGreaterThan(0);
      expect(loginLinks[0]).toHaveAttribute("href", "/login");
    });

    it("renders Role Portal link when user is logged in", () => {
      render(
        <PublicLandingClient
          settings={mockSettings}
          sessionUser={{ name: "Admin Manager", role: "ADMIN" }}
        />
      );
      const dashLinks = screen.getAllByRole("link", { name: /ADMIN Portal/i });
      expect(dashLinks.length).toBeGreaterThan(0);
      expect(dashLinks[0]).toHaveAttribute("href", "/admin/dashboard");
    });

    it("renders customized dynamic titles and operating hours from CMS settings", () => {
      const customSettings = {
        ...mockSettings,
        headerSubtitle: "Kerala Heavy Civil & Concrete Machinery Rentals",
        catalogHeading: "Specialized Plant Fleet Inventory",
        catalogSubheading: "Inspected and delivered with certified operators.",
        inquiryHeading: "Direct Project Booking Desk",
        inquirySubheading: "Mobilize plant machinery with flatbed transport.",
        operatingHours: "24/7 Mon – Sun Emergency Dispatch Active",
      };

      render(<PublicLandingClient settings={customSettings} />);

      expect(screen.getByText("Kerala Heavy Civil & Concrete Machinery Rentals")).toBeInTheDocument();
      expect(screen.getByText("Specialized Plant Fleet Inventory")).toBeInTheDocument();
      expect(screen.getByText("Inspected and delivered with certified operators.")).toBeInTheDocument();
      expect(screen.getByText("Direct Project Booking Desk")).toBeInTheDocument();
      expect(screen.getByText("Mobilize plant machinery with flatbed transport.")).toBeInTheDocument();
      expect(screen.getByText(/24\/7 Mon – Sun Emergency Dispatch Active/i)).toBeInTheDocument();
    });
  });

  describe("Search & Machinery Filtering", () => {
    it("renders live search bar with initial machine count", () => {
      render(<PublicLandingClient settings={mockSettings} />);
      const searchInput = screen.getByPlaceholderText(/Search machinery/i);
      expect(searchInput).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
      expect(screen.getByText(/available units/i)).toBeInTheDocument();
    });

    it("filters machinery when typing into search bar", () => {
      render(<PublicLandingClient settings={mockSettings} />);
      const searchInput = screen.getByPlaceholderText(/Search machinery/i);

      fireEvent.change(searchInput, { target: { value: "Reversible" } });

      expect(screen.getByText("Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)")).toBeInTheDocument();
      expect(screen.queryByText("Portable Cantilever Rope Winch Hoist (300 - 500 kg)")).not.toBeInTheDocument();
    });

    it("clears search query when clicking Clear button", () => {
      render(<PublicLandingClient settings={mockSettings} />);
      const searchInput = screen.getByPlaceholderText(/Search machinery/i);

      fireEvent.change(searchInput, { target: { value: "Reversible" } });
      const clearBtn = screen.getByRole("button", { name: "Clear" });
      fireEvent.click(clearBtn);

      expect((searchInput as HTMLInputElement).value).toBe("");
      expect(screen.getByText("Portable Cantilever Rope Winch Hoist (300 - 500 kg)")).toBeInTheDocument();
    });

    it("shows empty state and reset button when search has no matches", () => {
      render(<PublicLandingClient settings={mockSettings} />);
      const searchInput = screen.getByPlaceholderText(/Search machinery/i);

      fireEvent.change(searchInput, { target: { value: "unknown-space-rocket" } });

      expect(screen.getByText("No equipment matches your search query")).toBeInTheDocument();
      const resetBtn = screen.getByRole("button", { name: /Reset Search Filter/i });
      expect(resetBtn).toBeInTheDocument();

      fireEvent.click(resetBtn);
      expect((searchInput as HTMLInputElement).value).toBe("");
    });

    it("filters by category button selection", () => {
      render(<PublicLandingClient settings={mockSettings} />);
      const concreteBtn = screen.getByRole("button", { name: "Concrete" });
      fireEvent.click(concreteBtn);

      expect(screen.getByText("Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)")).toBeInTheDocument();
      expect(screen.queryByText("Builder's Heavy Material Hoist (1 Ton / 100+ Feet)")).not.toBeInTheDocument();

      const allBtn = screen.getByRole("button", { name: "All Fleet" });
      fireEvent.click(allBtn);
      expect(screen.getByText("Builder's Heavy Material Hoist (1 Ton / 100+ Feet)")).toBeInTheDocument();
    });
    it("toggles category filter back to ALL when clicked again", () => {
      render(<PublicLandingClient settings={mockSettings} />);
      const concreteBtn = screen.getByRole("button", { name: "Concrete" });
      
      // Click Concrete
      fireEvent.click(concreteBtn);
      expect(screen.queryByText("Builder's Heavy Material Hoist (1 Ton / 100+ Feet)")).not.toBeInTheDocument();

      // Click Concrete again to toggle back to ALL
      fireEvent.click(concreteBtn);
      expect(screen.getByText("Builder's Heavy Material Hoist (1 Ton / 100+ Feet)")).toBeInTheDocument();
    });

    it("resets search when clicking 'Reset search' in search count banner", () => {
      render(<PublicLandingClient settings={mockSettings} />);
      const searchInput = screen.getByPlaceholderText(/Search machinery/i);

      fireEvent.change(searchInput, { target: { value: "Diesel" } });
      expect(screen.getByRole("button", { name: /Reset search/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Reset search/i }));
      expect((searchInput as HTMLInputElement).value).toBe("");
    });
  });

  describe("Quotation Selection & Inquiry Form", () => {
    it("updates selected equipment and triggers scroll when 'Select for Quotation' is clicked", () => {
      const scrollIntoViewMock = jest.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      render(<PublicLandingClient settings={mockSettings} />);
      const selectButtons = screen.getAllByRole("link", { name: /Select for Quotation/i });
      expect(selectButtons.length).toBeGreaterThan(0);

      fireEvent.click(selectButtons[0]);
      const selects = screen.getAllByRole("combobox");
      const machineSelect = selects.find((s) => (s as HTMLSelectElement).value.includes("Mixer")) as HTMLSelectElement;
      expect(machineSelect).toBeDefined();
      expect(machineSelect.value).toContain("Hydraulic Reversible");
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it("submits inquiry and opens WhatsApp with formatted message", () => {
      render(<PublicLandingClient settings={mockSettings} />);

      const contractorInput = screen.getByPlaceholderText(/Thomas Mathew/i);
      const phoneInput = screen.getByPlaceholderText(/10-digit mobile number/i);

      fireEvent.change(contractorInput, { target: { value: "Suresh Kumar" } });
      fireEvent.change(phoneInput, { target: { value: "9847123456" } });

      const submitBtn = screen.getByRole("button", { name: /Submit Quotation Request via WhatsApp Desk/i });
      fireEvent.click(submitBtn);

      expect(window.open).toHaveBeenCalledTimes(1);
      const openedUrl = (window.open as jest.Mock).mock.calls[0][0];
      expect(openedUrl).toContain("https://wa.me/919847111000");
      expect(openedUrl).toContain("Suresh Kumar");
      expect(screen.getByText(/Inquiry prepared/i)).toBeInTheDocument();
    });
  });

  describe("Cinematic Atmospheric Enhancements & Metrics Ticker", () => {
    it("renders horizontal operational metrics ticker bar with key fleet metrics", () => {
      render(<PublicLandingClient settings={mockSettings} />);

      expect(screen.getByText(/Kerala Districts Covered/i)).toBeInTheDocument();
      expect(screen.getByText(/Certified Fleet Units/i)).toBeInTheDocument();
      expect(screen.getByText(/Rapid Mobilization Speed/i)).toBeInTheDocument();
      expect(screen.getByText(/Operator Certified & Safe/i)).toBeInTheDocument();
    });
  });

  describe("Quick-Spec Inspection Modal / Drawer", () => {
    it("opens spec modal on 'View Specs' click and displays technical details", () => {
      render(<PublicLandingClient settings={mockSettings} />);

      const viewSpecsButtons = screen.getAllByRole("button", { name: /View Specs/i });
      expect(viewSpecsButtons.length).toBeGreaterThan(0);

      fireEvent.click(viewSpecsButtons[0]);

      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
      expect(screen.getByText(/Full Engineering & Operational Specs/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero Group Certified Operator Protocol/i)).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByRole("button", { name: /Close specification modal/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes modal on Escape key press", () => {
      render(<PublicLandingClient settings={mockSettings} />);

      const viewSpecsButtons = screen.getAllByRole("button", { name: /View Specs/i });
      fireEvent.click(viewSpecsButtons[0]);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("selects machine for quotation directly from inside the spec modal", () => {
      const scrollIntoViewMock = jest.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      render(<PublicLandingClient settings={mockSettings} />);

      const viewSpecsButtons = screen.getAllByRole("button", { name: /View Specs/i });
      fireEvent.click(viewSpecsButtons[0]);

      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();

      const selectBtnInModal = screen.getByRole("button", { name: /Select for Quotation/i });
      fireEvent.click(selectBtnInModal);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  describe("Interactive Rental Estimator Widget", () => {
    it("renders estimator with duration slider and operator toggle", () => {
      render(<PublicLandingClient settings={mockSettings} />);

      expect(screen.getByText(/Interactive Rental & Mobilization Estimator/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Rental duration in days/i)).toBeInTheDocument();
      expect(screen.getByText(/With Certified Operator/i)).toBeInTheDocument();
      expect(screen.getByText(/Dry Lease \(Machinery Only\)/i)).toBeInTheDocument();
    });

    it("updates duration and reflects in inquiry form when preset chips are clicked", () => {
      render(<PublicLandingClient settings={mockSettings} />);

      const oneMonthPreset = screen.getByRole("button", { name: /1 Month \+ \(Contract\)/i });
      fireEvent.click(oneMonthPreset);

      const durationSelect = screen.getByDisplayValue(/1 Month or Long Term/i);
      expect(durationSelect).toBeInTheDocument();
    });

    it("toggles operator mode and includes selection in WhatsApp payload", () => {
      render(<PublicLandingClient settings={mockSettings} />);

      // Switch to Dry Lease
      const dryLeaseCard = screen.getByText(/Dry Lease \(Machinery Only\)/i);
      fireEvent.click(dryLeaseCard);

      const contractorInput = screen.getByPlaceholderText(/Thomas Mathew/i);
      const phoneInput = screen.getByPlaceholderText(/10-digit mobile number/i);
      fireEvent.change(contractorInput, { target: { value: "Mathew George" } });
      fireEvent.change(phoneInput, { target: { value: "9847999888" } });

      const submitBtn = screen.getByRole("button", { name: /Submit Quotation Request via WhatsApp Desk/i });
      fireEvent.click(submitBtn);

      const openedUrl = (window.open as jest.Mock).mock.calls[0][0];
      expect(openedUrl).toContain("NO (Machinery Only)");
      expect(openedUrl).toContain("Mathew George");
      expect(openedUrl).toContain("Within 2 Hours");
    });
  });
});
