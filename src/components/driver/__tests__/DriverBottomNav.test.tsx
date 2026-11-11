/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import DriverBottomNav from "../DriverBottomNav";

let mockPathname = "/driver/home";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("DriverBottomNav Component", () => {
  it("renders all five navigation tabs for drivers", () => {
    render(<DriverBottomNav />);

    expect(screen.getByText("My Shift")).toBeInTheDocument();
    expect(screen.getByText("Dispatches")).toBeInTheDocument();
    expect(screen.getByText("Log Fuel")).toBeInTheDocument();
    expect(screen.getByText("Portal")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("highlights active tab matching current pathname", () => {
    mockPathname = "/driver/home";
    render(<DriverBottomNav />);

    const shiftLink = screen.getByRole("link", { name: /My Shift/i });
    expect(shiftLink.className).toContain("bg-cyan-500/15");
    expect(shiftLink.className).toContain("text-cyan-400");
  });

  it("updates highlight when on dispatches tab", () => {
    mockPathname = "/driver/dispatches";
    render(<DriverBottomNav />);

    const dispatchesLink = screen.getByRole("link", { name: /Dispatches/i });
    expect(dispatchesLink.className).toContain("bg-cyan-500/15");
  });
});
