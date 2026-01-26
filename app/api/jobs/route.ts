import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createJobSchema } from "@/lib/schemas";
import { toNullable } from "@/lib/utils";
import { ZodError } from "zod";
import {
  getJobsByUserId,
  createJob,
  getFirstJobOrderInColumn,
} from "@/lib/queries/jobs";
import { calculateOrderAtStart } from "@/lib/fractional-index";
import { JobStatus } from "@prisma/client";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await getJobsByUserId(userId);
    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createJobSchema.parse(body);

    // Calculate order to place new job at top of column
    const status = (validated.status ?? "WISHLIST") as JobStatus;
    const firstJobOrder = await getFirstJobOrderInColumn(userId, status);
    const newOrder = calculateOrderAtStart(firstJobOrder);

    // Convert empty strings/undefined to null for Prisma
    const job = await createJob(
      toNullable({
        ...validated,
        userId,
        order: newOrder,
        dateApplied: validated.dateApplied
          ? new Date(validated.dateApplied)
          : null,
      })
    );

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
