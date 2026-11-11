/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Badge } from "../badge";

describe("Badge Component (UI Primitive)", () => {
  it("renders text content", () => {
    render(<Badge>Commercial Heavy</Badge>);
    expect(screen.getByText("Commercial Heavy")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<Badge>Default Badge</Badge>);
    const badge = screen.getByText("Default Badge");
    expect(badge.className).toContain("bg-primary");
  });

  it("applies destructive variant classes", () => {
    render(<Badge variant="destructive">Breakdown Alert</Badge>);
    const badge = screen.getByText("Breakdown Alert");
    expect(badge.className).toContain("text-destructive");
  });

  it("applies outline variant classes", () => {
    render(<Badge variant="outline">In Yard</Badge>);
    const badge = screen.getByText("In Yard");
    expect(badge.className).toContain("border-border");
  });
});
