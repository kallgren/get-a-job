import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHotkey } from "./useHotkey";

describe("useHotkey", () => {
  beforeEach(() => {
    // Reset DOM state before each test
    document.body.innerHTML = "";
    // Ensure body is focused (not an input)
    document.body.focus();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic functionality", () => {
    it("fires callback when registered key is pressed", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("is case-insensitive - uppercase key triggers lowercase registration", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "D", bubbles: true })
        );
      });

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("is case-insensitive - lowercase key triggers uppercase registration", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "X", onPress }));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "x", bubbles: true })
        );
      });

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("does not fire for different keys", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "a", bubbles: true })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe("input field detection", () => {
    it("does not fire when focus is in an input element", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      // Create and focus an input
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });

    it("does not fire when focus is in a textarea element", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      textarea.focus();

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });

    it("does not fire when focus is in a contenteditable element", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      const div = document.createElement("div");
      div.setAttribute("contenteditable", "true");
      document.body.appendChild(div);
      div.focus();

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });

    it("does not fire when focus is in a select element", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      const select = document.createElement("select");
      document.body.appendChild(select);
      select.focus();

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });

    it("fires when contenteditable is false", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      const div = document.createElement("div");
      div.setAttribute("contenteditable", "false");
      div.tabIndex = 0; // Make it focusable
      document.body.appendChild(div);
      div.focus();

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe("modifier keys", () => {
    it("does not fire when Ctrl is pressed", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "d",
            ctrlKey: true,
            bubbles: true,
          })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });

    it("does not fire when Meta (Cmd) is pressed", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "d",
            metaKey: true,
            bubbles: true,
          })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });

    it("does not fire when Alt is pressed", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "d",
            altKey: true,
            bubbles: true,
          })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });

    it("fires when Shift is pressed (for uppercase)", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress }));

      // Shift+d produces "D" as the key value
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "D",
            shiftKey: true,
            bubbles: true,
          })
        );
      });

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe("enabled option", () => {
    it("does not fire when disabled", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress, enabled: false }));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });

    it("fires when explicitly enabled", () => {
      const onPress = vi.fn();
      renderHook(() => useHotkey({ key: "d", onPress, enabled: true }));

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe("cleanup", () => {
    it("removes event listener on unmount", () => {
      const onPress = vi.fn();
      const { unmount } = renderHook(() => useHotkey({ key: "d", onPress }));

      unmount();

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });

      expect(onPress).not.toHaveBeenCalled();
    });

    it("removes listener when enabled changes from true to false", () => {
      const onPress = vi.fn();
      const { rerender } = renderHook(
        ({ enabled }) => useHotkey({ key: "d", onPress, enabled }),
        { initialProps: { enabled: true } }
      );

      // First verify it works when enabled
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });
      expect(onPress).toHaveBeenCalledTimes(1);

      // Disable and verify it stops working
      rerender({ enabled: false });

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "d", bubbles: true })
        );
      });
      expect(onPress).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });
});
