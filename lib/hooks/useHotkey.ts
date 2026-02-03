"use client";

import { useEffect, useCallback } from "react";

/**
 * Configuration for a hotkey
 */
interface HotkeyConfig {
  /** The key to listen for (case-insensitive) */
  key: string;
  /** Callback to execute when the key is pressed */
  onPress: () => void;
  /** Whether the hotkey is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Check if the currently focused element is an input-like element
 * where we should not intercept keyboard events
 */
function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  // Check for standard input elements
  const tagName = activeElement.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  // Check for contenteditable elements
  if (activeElement.hasAttribute("contenteditable")) {
    const contentEditable = activeElement.getAttribute("contenteditable");
    // contenteditable="" or contenteditable="true" means editable
    if (contentEditable === "" || contentEditable === "true") {
      return true;
    }
  }

  return false;
}

/**
 * A hook for registering global keyboard hotkeys
 *
 * Features:
 * - Registers keydown listener on mount
 * - Cleans up listener on unmount
 * - Ignores events when focus is in input/textarea/contenteditable
 * - Case-insensitive key matching
 *
 * @example
 * ```tsx
 * useHotkey({
 *   key: 'd',
 *   onPress: () => toggleTheme(),
 * });
 * ```
 */
export function useHotkey({
  key,
  onPress,
  enabled = true,
}: HotkeyConfig): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if hotkey is disabled
      if (!enabled) return;

      // Skip if user is typing in an input field
      if (isInputFocused()) return;

      // Skip if modifier keys are pressed (allow browser shortcuts)
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Case-insensitive comparison
      if (event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        onPress();
      }
    },
    [key, onPress, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}
