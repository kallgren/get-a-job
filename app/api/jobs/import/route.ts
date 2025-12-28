import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { importRequestSchema } from "@/lib/schemas";
import { toNullable } from "@/lib/utils";

/**
 * POST /api/jobs/import
 * Import jobs from JSON file, replacing all existing jobs for the user.
 * Uses a transaction to ensure all-or-nothing behavior.
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = importRequestSchema.parse(body);

    // Transform: add userId, convert dateApplied strings to Date objects, handle nullables
    const jobsToImport = validated.jobs.map((job) =>
      toNullable({
        ...job,
        userId,
        dateApplied: job.dateApplied ? new Date(job.dateApplied) : null,
      })
    );

    // Transaction: delete all existing jobs + create all imported jobs
    // If either operation fails, both are rolled back
    const result = await prisma.$transaction([
      prisma.job.deleteMany({
        where: { userId, deletedAt: null },
      }),
      prisma.job.createMany({
        data: jobsToImport,
      }),
    ]);

    return NextResponse.json({
      success: true,
      imported: result[1].count,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid job data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error importing jobs:", error);
    return NextResponse.json(
      { error: "Failed to import jobs" },
      { status: 500 }
    );
  }
}
