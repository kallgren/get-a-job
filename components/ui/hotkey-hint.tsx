import * as React from "react";
import { cn } from "@/lib/utils";

interface HotkeyHintProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The keyboard shortcut character to display */
  hotkey: string;
}

/**
 * HotkeyHint displays a keyboard shortcut as a boxed monospace letter.
 * Used alongside buttons and controls to indicate available keyboard shortcuts.
 *
 * Accessibility: Includes sr-only text for screen readers announcing the shortcut.
 */
function HotkeyHint({ hotkey, className, ...props }: HotkeyHintProps) {
  // Normalize to uppercase for consistent display
  const displayKey = hotkey.toUpperCase();

  return (
    <>
      {/* Screen reader announcement - outside aria-hidden so it's announced */}
      <span className="sr-only">keyboard shortcut {displayKey}</span>
      {/* Visual hint - hidden from screen readers to avoid duplication */}
      <span
        className={cn(
          "inline-flex items-center justify-center",
          "h-5 min-w-5 px-1",
          "rounded border border-border bg-muted",
          "font-mono text-xs text-muted-foreground",
          "select-none",
          className
        )}
        aria-hidden="true"
        {...props}
      >
        {displayKey}
      </span>
    </>
  );
}

export { HotkeyHint };
