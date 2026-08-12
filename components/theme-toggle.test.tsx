import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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

  afterEach(() => {
    cleanup();
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

  it("displays hotkey hint [D]", () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    // The hint displays uppercase "D"
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("cycles theme when 'd' key is pressed", async () => {
    const user = userEvent.setup();
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    await user.keyboard("d");

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("cycles theme when 'D' (uppercase) is pressed", async () => {
    const user = userEvent.setup();
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "dark",
    });

    render(<ThemeToggle />);
    await user.keyboard("D");

    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("does not toggle theme when 'd' is pressed in an input field", async () => {
    const user = userEvent.setup();
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    });

    render(
      <>
        <ThemeToggle />
        <input type="text" data-testid="test-input" />
      </>
    );

    const input = screen.getByTestId("test-input");
    input.focus();
    await user.keyboard("d");

    expect(mockSetTheme).not.toHaveBeenCalled();
  });
});
