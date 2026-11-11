/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DispatchActionHeader } from "../DispatchActionHeader";

describe("DispatchActionHeader Component", () => {
  it("displays dispatch count in header title", () => {
    render(
      <DispatchActionHeader
        dispatchesCount={12}
        viewMode="TABLE"
        setViewMode={jest.fn()}
        onNewDispatch={jest.fn()}
      />
    );

    expect(screen.getByText(/Active Daily Bookings & Dispatch Orders \(12\)/i)).toBeInTheDocument();
  });

  it("highlights active view mode button and calls setViewMode when clicked", () => {
    const handleSetViewMode = jest.fn();
    render(
      <DispatchActionHeader
        dispatchesCount={5}
        viewMode="CREW"
        setViewMode={handleSetViewMode}
        onNewDispatch={jest.fn()}
      />
    );

    const crewBtn = screen.getByRole("button", { name: /Crew DnD/i });
    expect(crewBtn.className).toContain("bg-amber-500");

    const ledgerBtn = screen.getByRole("button", { name: /Ledger/i });
    fireEvent.click(ledgerBtn);

    expect(handleSetViewMode).toHaveBeenCalledWith("TABLE");
  });

  it("calls onNewDispatch when '+ Book Dispatch Order' button is clicked", () => {
    const handleNewDispatch = jest.fn();
    render(
      <DispatchActionHeader
        dispatchesCount={5}
        viewMode="TABLE"
        setViewMode={jest.fn()}
        onNewDispatch={handleNewDispatch}
      />
    );

    const newDispatchBtn = screen.getByRole("button", { name: /Create New Dispatch/i });
    fireEvent.click(newDispatchBtn);

    expect(handleNewDispatch).toHaveBeenCalledTimes(1);
  });
});
