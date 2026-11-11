/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import LoginPage from "../page";

// Mock server action
jest.mock("@/actions/auth", () => ({
  authenticate: jest.fn(),
}));

// Mock react-dom useFormState and useFormStatus
let mockErrorMessage: string | undefined = undefined;
let mockPending = false;

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormState: () => [mockErrorMessage, jest.fn()],
  useFormStatus: () => ({ pending: mockPending }),
}));

describe("Login Page Component", () => {
  beforeEach(() => {
    mockErrorMessage = undefined;
    mockPending = false;
    jest.clearAllMocks();
  });

  it("renders branding header with industrial theme", () => {
    render(<LoginPage />);

    expect(screen.getByText("ZERO GROUP")).toBeInTheDocument();
    expect(screen.getByText("INTERNAL")).toBeInTheDocument();
    expect(screen.getByText(/Central Logistics & Field ERP Portal/i)).toBeInTheDocument();
    expect(screen.getByText("Back to Yard Website")).toBeInTheDocument();
  });

  it("renders form inputs for email/phone and password", () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText(/name@zerogroup.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••••••/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("renders active sign in button when not pending", () => {
    render(<LoginPage />);

    const submitBtn = screen.getByRole("button", { name: /Sign In to Plant Portal/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();
  });

  it("renders loading spinner and disabled button when pending", () => {
    mockPending = true;
    render(<LoginPage />);

    const submitBtn = screen.getByRole("button", { name: /Authenticating Session/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });

  it("displays error message alert when authentication fails", () => {
    mockErrorMessage = "Invalid phone number or password. Please verify credentials.";
    render(<LoginPage />);

    expect(
      screen.getByText("Invalid phone number or password. Please verify credentials.")
    ).toBeInTheDocument();
  });

  it("contains navigation links to password reset", () => {
    render(<LoginPage />);

    const resetLink = screen.getByRole("link", { name: /Forgot Password/i });
    expect(resetLink).toBeInTheDocument();
    expect(resetLink).toHaveAttribute("href", "/reset-password");
  });
});
