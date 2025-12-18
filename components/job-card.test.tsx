import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobCard } from "./job-card";
import { Job, JobStatus } from "@prisma/client";

// Mock @dnd-kit/core
vi.mock("@dnd-kit/core", () => ({
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  })),
}));

describe("JobCard", () => {
  const baseJob: Job = {
    id: 1,
    userId: "user123",
    company: "Test Company",
    title: "Software Engineer",
    location: "Stockholm",
    status: JobStatus.WISHLIST,
    order: "0",
    dateApplied: new Date("2024-01-15"),
    jobPostingUrl: null,
    jobPostingText: null,
    notes: null,
    resumeUrl: null,
    coverLetterUrl: null,
    contactPerson: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("renders job card with basic information", () => {
    render(<JobCard job={baseJob} />);

    expect(screen.getByText("Test Company")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Stockholm")).toBeInTheDocument();
  });

  it("displays notes indicator icon when notes field has content", () => {
    const jobWithNotes: Job = {
      ...baseJob,
      notes: "This is a test note",
    };

    render(<JobCard job={jobWithNotes} />);

    expect(screen.getByLabelText("Has notes")).toBeInTheDocument();
  });

  it("does not display notes indicator icon when notes field is null", () => {
    const jobWithoutNotes: Job = {
      ...baseJob,
      notes: null,
    };

    render(<JobCard job={jobWithoutNotes} />);

    expect(screen.queryByLabelText("Has notes")).not.toBeInTheDocument();
  });

  it("does not display notes indicator icon when notes field is empty string", () => {
    const jobWithEmptyNotes: Job = {
      ...baseJob,
      notes: "",
    };

    render(<JobCard job={jobWithEmptyNotes} />);

    expect(screen.queryByLabelText("Has notes")).not.toBeInTheDocument();
  });

  it("does not display notes indicator icon when notes field is only whitespace", () => {
    const jobWithWhitespaceNotes: Job = {
      ...baseJob,
      notes: "   \n\t  ",
    };

    render(<JobCard job={jobWithWhitespaceNotes} />);

    expect(screen.queryByLabelText("Has notes")).not.toBeInTheDocument();
  });

  it("displays date applied when available", () => {
    render(<JobCard job={baseJob} />);

    expect(screen.getByText(/Applied:/)).toBeInTheDocument();
  });

  it("does not display location when not available", () => {
    const jobWithoutLocation: Job = {
      ...baseJob,
      location: null,
    };

    render(<JobCard job={jobWithoutLocation} />);

    expect(screen.queryByText("Stockholm")).not.toBeInTheDocument();
  });

  it("handles onClick callback", () => {
    const handleClick = vi.fn();
    render(<JobCard job={baseJob} onClick={handleClick} />);

    const card = screen.getByText("Test Company").closest("div");
    card?.click();

    expect(handleClick).toHaveBeenCalledWith(baseJob);
  });
});
