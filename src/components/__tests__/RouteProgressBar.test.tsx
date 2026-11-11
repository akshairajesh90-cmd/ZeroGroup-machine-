/**
 * @jest-environment jsdom
 */
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import RouteProgressBar from "../RouteProgressBar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

describe("RouteProgressBar Component", () => {
  it("renders without crashing in jsdom", () => {
    const { container } = render(<RouteProgressBar />);
    expect(container).toBeDefined();
  });
});
