import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BoardView } from "./board-view";

// Mock DnD kit to avoid complexity in tests
vi.mock("@dnd-kit/core", () => ({
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
}));

describe("BoardView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all status columns", () => {
    render(
      <BoardView
        jobs={[]}
        onJobClick={vi.fn()}
        onAddClick={vi.fn()}
      />
    );

    expect(screen.getByText("Wishlist")).toBeInTheDocument();
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
    expect(screen.getByText("Offer")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("displays hotkey hint [A] only on the Wishlist column", () => {
    render(
      <BoardView
        jobs={[]}
        onJobClick={vi.fn()}
        onAddClick={vi.fn()}
      />
    );

    // The hint should display uppercase "A"
    const hints = screen.getAllByText("A");
    // There should be exactly one hotkey hint (the one for Wishlist)
    expect(hints).toHaveLength(1);
  });

  it("has an add button for each column", () => {
    render(
      <BoardView
        jobs={[]}
        onJobClick={vi.fn()}
        onAddClick={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Add job to Wishlist" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add job to Applied" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add job to Interview" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add job to Offer" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add job to Accepted" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add job to Rejected" })
    ).toBeInTheDocument();
  });
});
