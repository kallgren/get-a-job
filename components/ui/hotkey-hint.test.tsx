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

  it("has aria-hidden on the visible element", () => {
    const { container } = render(<HotkeyHint hotkey="d" />);
    const hint = container.querySelector("span");
    expect(hint).toHaveAttribute("aria-hidden", "true");
  });

  it("applies custom className", () => {
    const { container } = render(
      <HotkeyHint hotkey="x" className="custom-class" />
    );
    const hint = container.querySelector("span");
    expect(hint).toHaveClass("custom-class");
  });

  it("passes through additional HTML attributes", () => {
    const { container } = render(
      <HotkeyHint hotkey="a" data-testid="hotkey-hint" />
    );
    const hint = container.querySelector("span");
    expect(hint).toHaveAttribute("data-testid", "hotkey-hint");
  });
});
