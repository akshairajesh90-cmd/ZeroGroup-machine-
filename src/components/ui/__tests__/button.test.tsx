/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Button } from "../button";

describe("Button Component (UI Primitive)", () => {
  it("renders with children text", () => {
    render(<Button>Click Plant Action</Button>);
    const button = screen.getByRole("button", { name: /Click Plant Action/i });
    expect(button).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<Button>Default Button</Button>);
    const button = screen.getByRole("button", { name: /Default Button/i });
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button.className).toContain("bg-zinc-100");
  });

  it("applies destructive variant classes", () => {
    render(<Button variant="destructive">Delete Dispatch</Button>);
    const button = screen.getByRole("button", { name: /Delete Dispatch/i });
    expect(button.className).toContain("bg-red-600");
  });

  it("applies outline variant classes", () => {
    render(<Button variant="outline">Secondary Outline</Button>);
    const button = screen.getByRole("button", { name: /Secondary Outline/i });
    expect(button.className).toContain("border-zinc-700");
  });

  it("fires onClick handler when clicked", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Trigger Dispatch</Button>);
    const button = screen.getByRole("button", { name: /Trigger Dispatch/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("respects disabled state and prevents click", () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled Machine</Button>);
    const button = screen.getByRole("button", { name: /Disabled Machine/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders different sizes correctly", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toContain("h-8");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button").className).toContain("h-11");
  });
});
