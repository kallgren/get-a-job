"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

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
 * Uses the "latest ref" pattern to avoid stale closures and unnecessary
 * re-registration of event listeners. Consumers don't need to wrap their
 * callbacks in useCallback.
 *
 * Features:
 * - Registers keydown listener on mount
 * - Cleans up listener on unmount
 * - Ignores events when focus is in input/textarea/contenteditable
 * - Case-insensitive key matching
 * - No useCallback needed for onPress callback
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
  // Store callback in a ref to avoid stale closures and unnecessary effect re-runs
  const onPressRef = useRef(onPress);

  // Update ref on every render (useLayoutEffect ensures it's updated before any events fire)
  useLayoutEffect(() => {
    onPressRef.current = onPress;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (isInputFocused()) return;

      // Skip if modifier keys are pressed (allow browser shortcuts)
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Case-insensitive comparison
      if (event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        onPressRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [key, enabled]); // onPress intentionally omitted - read from ref instead
}
