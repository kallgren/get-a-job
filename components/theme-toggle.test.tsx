import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./theme-toggle";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}));

import { useTheme } from "next-themes";

describe("ThemeToggle", () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the theme toggle button", () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("displays Sun icon when theme is light", () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute(
      "aria-label",
      "Current theme: Light. Click to cycle themes."
    );
  });

  it("displays Moon icon when theme is dark", () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "dark",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute(
      "aria-label",
      "Current theme: Dark. Click to cycle themes."
    );
  });

  it("displays Monitor icon when theme is system", () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "system",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute(
      "aria-label",
      "Current theme: System. Click to cycle themes."
    );
  });

  it("cycles from light to dark when clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("cycles from dark to system when clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "dark",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("cycles from system to light when clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useTheme).mockReturnValue({
      theme: "system",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("has accessible aria-label", () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label");
    expect(button.getAttribute("aria-label")).toContain("Current theme:");
  });

  it("supports keyboard navigation with Enter", async () => {
    const user = userEvent.setup();
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard("{Enter}");

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("supports keyboard navigation with Space", async () => {
    const user = userEvent.setup();
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "dark",
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard(" ");

    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });
});
