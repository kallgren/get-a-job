import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobBoard } from "./job-board";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
    push: vi.fn(),
  })),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock JobModal to track when it opens and with what props
vi.mock("@/components/job-modal", () => ({
  JobModal: ({
    open,
    initialStatus,
  }: {
    open: boolean;
    initialStatus?: string;
  }) =>
    open ? (
      <div data-testid="job-modal" data-initial-status={initialStatus}>
        Job Modal (Status: {initialStatus || "none"})
      </div>
    ) : null,
}));

// Mock BoardView to simplify testing
vi.mock("@/components/board-view", () => ({
  BoardView: () => <div data-testid="board-view">Board View</div>,
}));

// Mock DnD kit to avoid complexity in tests
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
}));

describe("JobBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the board view", () => {
    render(<JobBoard jobs={[]} />);

    expect(screen.getByTestId("board-view")).toBeInTheDocument();
  });

  it("opens job modal with WISHLIST status when 'a' key is pressed", async () => {
    const user = userEvent.setup();
    render(<JobBoard jobs={[]} />);

    expect(screen.queryByTestId("job-modal")).not.toBeInTheDocument();

    await user.keyboard("a");

    expect(screen.getByTestId("job-modal")).toBeInTheDocument();
    expect(screen.getByTestId("job-modal")).toHaveAttribute(
      "data-initial-status",
      "WISHLIST"
    );
  });

  it("opens job modal with WISHLIST status when 'A' (uppercase) key is pressed", async () => {
    const user = userEvent.setup();
    render(<JobBoard jobs={[]} />);

    expect(screen.queryByTestId("job-modal")).not.toBeInTheDocument();

    await user.keyboard("A");

    expect(screen.getByTestId("job-modal")).toBeInTheDocument();
    expect(screen.getByTestId("job-modal")).toHaveAttribute(
      "data-initial-status",
      "WISHLIST"
    );
  });

  it("does not open job modal when 'a' is pressed in an input field", async () => {
    const user = userEvent.setup();
    render(
      <>
        <JobBoard jobs={[]} />
        <input type="text" data-testid="test-input" />
      </>
    );

    expect(screen.queryByTestId("job-modal")).not.toBeInTheDocument();

    const input = screen.getByTestId("test-input");
    input.focus();
    await user.keyboard("a");

    expect(screen.queryByTestId("job-modal")).not.toBeInTheDocument();
  });
});
