import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HotkeyHint } from "./hotkey-hint";

describe("HotkeyHint", () => {
  it("renders the hotkey character", () => {
    render(<HotkeyHint hotkey="a" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("displays the character in uppercase", () => {
    render(<HotkeyHint hotkey="d" />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("handles uppercase input", () => {
    render(<HotkeyHint hotkey="X" />);
    expect(screen.getByText("X")).toBeInTheDocument();
  });

  it("includes screen reader text for accessibility", () => {
    render(<HotkeyHint hotkey="a" />);
    expect(screen.getByText("keyboard shortcut A")).toBeInTheDocument();
  });

  it("has sr-only text outside aria-hidden so screen readers can access it", () => {
    const { container } = render(<HotkeyHint hotkey="d" />);
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).toBeInTheDocument();
    expect(srOnly).toHaveTextContent("keyboard shortcut D");
    // The sr-only element should NOT be inside an aria-hidden parent
    expect(srOnly).not.toHaveAttribute("aria-hidden");
    expect(srOnly?.parentElement).not.toHaveAttribute("aria-hidden", "true");
  });

  it("has aria-hidden on the visible badge element", () => {
    const { container } = render(<HotkeyHint hotkey="d" />);
    const badge = container.querySelector("span[aria-hidden='true']");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("D");
  });

  it("applies custom className to the visible badge", () => {
    const { container } = render(
      <HotkeyHint hotkey="x" className="custom-class" />
    );
    const badge = container.querySelector("span[aria-hidden='true']");
    expect(badge).toHaveClass("custom-class");
  });

  it("passes through additional HTML attributes to the visible badge", () => {
    const { container } = render(
      <HotkeyHint hotkey="a" data-testid="hotkey-hint" />
    );
    const badge = container.querySelector("span[aria-hidden='true']");
    expect(badge).toHaveAttribute("data-testid", "hotkey-hint");
  });
});
