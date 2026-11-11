/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../card";

describe("Card Component (UI Primitive)", () => {
  it("renders compound card structure properly", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Hydraulic Reversible Mixer</CardTitle>
          <CardDescription>10/14 Cu. Ft. Capacity</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Site dispatch details and engine specs.</p>
        </CardContent>
        <CardFooter>
          <span>Available at Central Yard</span>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText("Hydraulic Reversible Mixer")).toBeInTheDocument();
    expect(screen.getByText("10/14 Cu. Ft. Capacity")).toBeInTheDocument();
    expect(screen.getByText("Site dispatch details and engine specs.")).toBeInTheDocument();
    expect(screen.getByText("Available at Central Yard")).toBeInTheDocument();
  });

  it("supports small size variant", () => {
    render(
      <Card size="sm" data-testid="compact-card">
        <CardContent>Compact Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId("compact-card");
    expect(card).toHaveAttribute("data-size", "sm");
  });
});
