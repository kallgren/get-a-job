import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderActions } from "./header-actions";

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button">UserButton</div>,
}));

// Mock next-themes (used by ThemeToggle)
vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({
    theme: "light",
    setTheme: vi.fn(),
    systemTheme: "light",
    themes: ["light", "dark", "system"],
    resolvedTheme: "light",
  })),
}));

// Mock ExportImportModal to track when it opens
vi.mock("@/components/export-import-modal", () => ({
  ExportImportModal: ({ open }: { open: boolean }) =>
    open ? (
      <div data-testid="export-import-modal">Export Import Modal</div>
    ) : null,
}));

describe("HeaderActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders export/import button, theme toggle, and user button", () => {
    render(<HeaderActions />);

    expect(
      screen.getByRole("button", { name: "Export and import" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });

  it("displays hotkey hint [X] for export/import", () => {
    render(<HeaderActions />);

    // The hint displays uppercase "X"
    expect(screen.getByText("X")).toBeInTheDocument();
  });

  it("opens export/import modal when button is clicked", async () => {
    const user = userEvent.setup();
    render(<HeaderActions />);

    expect(screen.queryByTestId("export-import-modal")).not.toBeInTheDocument();

    const exportButton = screen.getByRole("button", {
      name: "Export and import",
    });
    await user.click(exportButton);

    expect(screen.getByTestId("export-import-modal")).toBeInTheDocument();
  });

  it("opens export/import modal when 'x' key is pressed", async () => {
    const user = userEvent.setup();
    render(<HeaderActions />);

    expect(screen.queryByTestId("export-import-modal")).not.toBeInTheDocument();

    await user.keyboard("x");

    expect(screen.getByTestId("export-import-modal")).toBeInTheDocument();
  });

  it("opens export/import modal when 'X' (uppercase) key is pressed", async () => {
    const user = userEvent.setup();
    render(<HeaderActions />);

    expect(screen.queryByTestId("export-import-modal")).not.toBeInTheDocument();

    await user.keyboard("X");

    expect(screen.getByTestId("export-import-modal")).toBeInTheDocument();
  });

  it("does not open export/import modal when 'x' is pressed in an input field", async () => {
    const user = userEvent.setup();
    render(
      <>
        <HeaderActions />
        <input type="text" data-testid="test-input" />
      </>
    );

    expect(screen.queryByTestId("export-import-modal")).not.toBeInTheDocument();

    const input = screen.getByTestId("test-input");
    input.focus();
    await user.keyboard("x");

    expect(screen.queryByTestId("export-import-modal")).not.toBeInTheDocument();
  });
});
