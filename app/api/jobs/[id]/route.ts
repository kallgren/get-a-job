import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { updateJobSchema } from "@/lib/schemas";
import { toNullable } from "@/lib/utils";
import { ZodError } from "zod";
import { getJobById, updateJob, deleteJob } from "@/lib/queries/jobs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await request.json();
    const validated = updateJobSchema.parse(body);

    // Check if job exists
    const existingJob = await getJobById(id);

    if (!existingJob || existingJob.deletedAt) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check authorization
    if (existingJob.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update data - only include fields that were provided
    const updateData: Record<string, unknown> = { ...validated };

    // Only process dateApplied if it was explicitly provided (not undefined)
    if (validated.dateApplied !== undefined) {
      updateData.dateApplied = validated.dateApplied
        ? new Date(validated.dateApplied)
        : null;
    } else {
      // Remove dateApplied from update if not provided (preserves existing value)
      delete updateData.dateApplied;
    }

    // Update the job - convert empty strings to null for Prisma
    const job = await updateJob(id, toNullable(updateData));

    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idParam } = await params;
    const id = Number(idParam);

    // Check if job exists
    const existingJob = await getJobById(id);

    if (!existingJob || existingJob.deletedAt) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check authorization
    if (existingJob.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete
    await deleteJob(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
