import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock data fetching
vi.mock("@/lib/queries/jobs", () => ({
  getJobsByUserIdSafe: vi.fn(),
}));

// Mock child components
vi.mock("@/components/job-board", () => ({
  JobBoard: () => <div data-testid="job-board">JobBoard</div>,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button">UserButton</div>,
}));

import { auth } from "@clerk/nextjs/server";
import { getJobsByUserIdSafe } from "@/lib/queries/jobs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockAuth = any;

describe("Home Page", () => {
  const mockUserId = "user_123";

  async function renderHome() {
    const Home = (await import("./page")).default;
    const result = await Home();
    return render(result);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as MockAuth);
  });

  it("should display error message when job fetching fails", async () => {
    vi.mocked(getJobsByUserIdSafe).mockResolvedValue({
      data: null,
      error: "Database error",
    });

    await renderHome();

    expect(
      screen.getByText("Failed to load jobs. Please try again later.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("job-board")).not.toBeInTheDocument();
  });

  it("should render job board when jobs load successfully", async () => {
    vi.mocked(getJobsByUserIdSafe).mockResolvedValue({
      data: [],
      error: null,
    });

    await renderHome();

    expect(
      screen.queryByText("Failed to load jobs. Please try again later.")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Get a Job")).toBeInTheDocument();
    expect(screen.getByTestId("job-board")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });
});
