/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Input } from "../input";

describe("Input Component (UI Primitive)", () => {
  it("renders with placeholder and data-slot", () => {
    render(<Input placeholder="Search heavy machinery..." />);
    const input = screen.getByPlaceholderText("Search heavy machinery...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("data-slot", "input");
  });

  it("handles typed input and triggers onChange", () => {
    const handleChange = jest.fn();
    render(<Input placeholder="Location" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Location");

    fireEvent.change(input, { target: { value: "Kakkanad Yard" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe("Kakkanad Yard");
  });

  it("handles disabled state properly", () => {
    render(<Input placeholder="Locked Input" disabled />);
    const input = screen.getByPlaceholderText("Locked Input");
    expect(input).toBeDisabled();
    expect(input.className).toContain("disabled:opacity-50");
  });

  it("supports type attribute (e.g. number, password, email)", () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");

    rerender(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute("type", "password");
  });

  it("merges custom className with default styles", () => {
    render(<Input placeholder="Custom" className="custom-focus-border border-amber-500" />);
    const input = screen.getByPlaceholderText("Custom");
    expect(input.className).toContain("custom-focus-border");
    expect(input.className).toContain("border-amber-500");
  });
});
