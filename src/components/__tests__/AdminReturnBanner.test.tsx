/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminReturnBanner from "../AdminReturnBanner";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("AdminReturnBanner Component (God Mode Safety UI)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing for DRIVER or OPERATOR roles", () => {
    const { container: driverContainer } = render(<AdminReturnBanner userRole="DRIVER" />);
    expect(driverContainer.firstChild).toBeNull();

    const { container: operatorContainer } = render(<AdminReturnBanner userRole="OPERATOR" />);
    expect(operatorContainer.firstChild).toBeNull();

    const { container: unauthContainer } = render(<AdminReturnBanner userRole={null} />);
    expect(unauthContainer.firstChild).toBeNull();
  });

  it("renders amber banner for ADMIN with return button", () => {
    render(<AdminReturnBanner userRole="ADMIN" />);

    expect(screen.getByText(/GOD MODE — Viewing as ADMIN/i)).toBeInTheDocument();
    const returnBtn = screen.getByRole("button", { name: /Admin Hub/i });
    expect(returnBtn).toBeInTheDocument();

    fireEvent.click(returnBtn);
    expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("renders banner for OWNER role", () => {
    render(<AdminReturnBanner userRole="OWNER" />);

    expect(screen.getByText(/GOD MODE — Viewing as OWNER/i)).toBeInTheDocument();
  });
});
