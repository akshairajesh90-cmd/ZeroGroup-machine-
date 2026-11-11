/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PrintButton from "../PrintButton";

describe("PrintButton Component", () => {
  it("renders print invoice button", () => {
    render(<PrintButton />);
    const btn = screen.getByRole("button", { name: /Print Invoice/i });
    expect(btn).toBeInTheDocument();
  });

  it("calls window.print when clicked", () => {
    window.print = jest.fn();
    render(<PrintButton />);

    const btn = screen.getByRole("button", { name: /Print Invoice/i });
    fireEvent.click(btn);

    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
