# Keyboard Hotkeys Feature

## Overview

Add keyboard shortcuts to common actions with always-visible hints in the UI. Inspired by [Zed](https://zed.dev) and Fizzy - the hints appear as boxed monospace letters inside or alongside the triggering element.

## Goals

- **Speed-to-value**: Power users can perform common actions without reaching for the mouse
- **Discoverability**: Hints are always visible, teaching the shortcuts passively
- **Simplicity**: Single-character shortcuts, no modifier keys needed

## Design

### Visual Style

Hotkey hints appear as a boxed monospace letter alongside the button text:

```
┌─────────────────────────┐
│  Add to Wishlist   [A]  │
└─────────────────────────┘
```

- Box/badge style with subtle border or background
- Monospace font for the letter
- Visually distinct but not distracting
- Always visible (not hover-triggered)

### Hotkeys

| Key | Action              | Element           |
|-----|---------------------|-------------------|
| `d` | Toggle theme        | Theme toggle      |
| `x` | Export jobs         | Export button     |
| `a` | Add job to wishlist | Add job button    |

### Behavior

- **Disabled in inputs**: Hotkeys do not fire when focus is in `<input>`, `<textarea>`, or `[contenteditable]` elements
- **No visual feedback**: Actions trigger immediately without button animation or highlight
- **Case insensitive**: Both `d` and `D` trigger the same action

## Requirements

```json
[
  {
    "id": "HK-001",
    "category": "Infrastructure",
    "description": "Create a reusable hotkey system that listens for keydown events globally and dispatches actions",
    "steps_to_verify": [
      "A keyboard event listener is registered on mount",
      "The listener is cleaned up on unmount",
      "Events are ignored when activeElement is an input, textarea, or contenteditable"
    ],
    "passes": true
  },
  {
    "id": "HK-002",
    "category": "Infrastructure",
    "description": "Create a HotkeyHint component that renders a boxed monospace letter",
    "steps_to_verify": [
      "Component renders a single character in a box/badge style",
      "Character is displayed in monospace font",
      "Component can be placed inside buttons or alongside other elements",
      "Styling is consistent with shadcn/ui design language"
    ],
    "passes": true
  },
  {
    "id": "HK-003",
    "category": "Feature",
    "description": "Pressing 'd' toggles the theme between light and dark mode",
    "steps_to_verify": [
      "Pressing 'd' when not in an input field toggles the theme",
      "Pressing 'D' (shift+d) also works",
      "Pressing 'd' while focused in an input does nothing",
      "The theme persists after toggle (existing behavior maintained)"
    ],
    "passes": true
  },
  {
    "id": "HK-004",
    "category": "Feature",
    "description": "Pressing 'x' triggers the export functionality",
    "steps_to_verify": [
      "Pressing 'x' when not in an input field triggers export",
      "Pressing 'X' (shift+x) also works",
      "Pressing 'x' while focused in an input does nothing",
      "Export behavior is identical to clicking the export button"
    ],
    "passes": true
  },
  {
    "id": "HK-005",
    "category": "Feature",
    "description": "Pressing 'a' opens the add job to wishlist flow",
    "steps_to_verify": [
      "Pressing 'a' when not in an input field triggers add job action",
      "Pressing 'A' (shift+a) also works",
      "Pressing 'a' while focused in an input does nothing",
      "Behavior is identical to clicking the add job button"
    ],
    "passes": true
  },
  {
    "id": "HK-006",
    "category": "UI",
    "description": "Theme toggle displays hotkey hint [D]",
    "steps_to_verify": [
      "Theme toggle shows 'D' in a boxed/badge style",
      "Hint is always visible (not just on hover)",
      "Hint does not break the existing layout"
    ],
    "passes": true
  },
  {
    "id": "HK-007",
    "category": "UI",
    "description": "Export button displays hotkey hint [X]",
    "steps_to_verify": [
      "Export button shows 'X' in a boxed/badge style",
      "Hint is always visible (not just on hover)",
      "Hint does not break the existing layout"
    ],
    "passes": true
  },
  {
    "id": "HK-008",
    "category": "UI",
    "description": "Add job button displays hotkey hint [A]",
    "steps_to_verify": [
      "Add job button shows 'A' in a boxed/badge style",
      "Hint is always visible (not just on hover)",
      "Hint does not break the existing layout"
    ],
    "passes": true
  },
  {
    "id": "HK-009",
    "category": "Accessibility",
    "description": "Hotkey hints are accessible to screen readers",
    "steps_to_verify": [
      "Hints have appropriate aria-label or sr-only text explaining the shortcut",
      "Screen reader announces 'keyboard shortcut D' or similar"
    ],
    "passes": true
  },
  {
    "id": "HK-010",
    "category": "Testing",
    "description": "Unit tests cover hotkey hook behavior",
    "steps_to_verify": [
      "Test that registered hotkeys fire their callbacks",
      "Test that hotkeys are ignored when in input fields",
      "Test cleanup on unmount"
    ],
    "passes": true
  },
  {
    "id": "HK-011",
    "category": "Testing",
    "description": "Component tests cover HotkeyHint rendering",
    "steps_to_verify": [
      "Test that component renders the correct character",
      "Test accessibility attributes are present"
    ],
    "passes": true
  },
  {
    "id": "HK-012",
    "category": "Testing",
    "description": "E2E test verifies hotkey functionality",
    "steps_to_verify": [
      "Test pressing 'd' toggles theme",
      "Test pressing 'a' opens add job flow",
      "Test hotkeys don't fire when typing in search/input"
    ],
    "passes": false
  }
]
```

## Future Enhancements

These are out of scope for the initial implementation but noted for future consideration:

- **Help overlay**: Press `?` to see all available shortcuts in a modal
- **Shortcut customization**: Allow users to remap shortcuts (WCAG 2.1.4 compliance)
- **Disable shortcuts**: Global toggle to turn off all keyboard shortcuts (WCAG 2.1.4)
- **Additional shortcuts**: Navigate between columns, open job details, close modals with `Esc`

## Implementation Plan

1. **Create hotkey infrastructure**
   - Create `useHotkey` hook or `HotkeyProvider` context
   - Handle keydown listener registration/cleanup
   - Implement input field detection to disable hotkeys while typing

2. **Create HotkeyHint component**
   - Build reusable component for the boxed letter badge
   - Style with shadcn/ui CSS variables
   - Ensure monospace font and consistent sizing

3. **Wire up theme toggle**
   - Add hotkey hint to existing theme toggle component
   - Register 'd' hotkey to trigger theme toggle

4. **Wire up export button**
   - Add hotkey hint to export button
   - Register 'x' hotkey to trigger export

5. **Wire up add job button**
   - Add hotkey hint to add job button
   - Register 'a' hotkey to trigger add job flow

6. **Add tests**
   - Unit tests for hook
   - Component tests for HotkeyHint
   - E2E test for key functionality

7. **Accessibility review**
   - Verify screen reader announces shortcuts appropriately
   - Test keyboard navigation still works as expected
