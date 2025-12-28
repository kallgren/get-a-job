"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Job } from "@prisma/client";
import {
  jobToExportedJob,
  generateExportFilename,
  downloadJSON,
  parseJSONFile,
} from "@/lib/export-import";
import { importRequestSchema } from "@/lib/schemas";

interface ExportImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportImportModal({
  open,
  onOpenChange,
}: ExportImportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<unknown[] | null>(null);
  const [importPreview, setImportPreview] = useState<{
    count: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  /**
   * Reset state when modal closes to ensure clean slate on next open
   */
  useEffect(() => {
    if (!open) {
      setError(null);
      setSelectedFile(null);
      setParsedData(null);
      setImportPreview(null);
      setIsDragging(false);
      // Reset file input to allow selecting same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  /**
   * Handle export: fetch jobs, transform, and download as JSON
   */
  async function handleExport() {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/jobs");
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const jobs: Job[] = await response.json();
      const exportedJobs = jobs.map(jobToExportedJob);

      downloadJSON(exportedJobs, generateExportFilename());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to export jobs. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  }

  /**
   * Handle file selection: validate, parse, and show preview
   */
  async function handleFileSelect(file: File) {
    setError(null);
    setSelectedFile(null);
    setParsedData(null);
    setImportPreview(null);

    // Validate file extension
    if (!file.name.endsWith(".json")) {
      setError("Please select a JSON file");
      return;
    }

    try {
      // Parse the JSON file
      const data = await parseJSONFile<unknown>(file);

      // Validate all jobs using the same schema as the server
      // This ensures consistent validation and catches errors before upload
      const validationResult = importRequestSchema.safeParse({ jobs: data });

      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0];
        // Extract job index from path (e.g., ["jobs", 0, "company"] -> job #1)
        const jobIndex =
          firstError.path[1] !== undefined ? Number(firstError.path[1]) + 1 : 0;
        const fieldName = String(firstError.path[2] ?? "data");

        setError(
          jobIndex > 0
            ? `Invalid job data: ${firstError.message} (job #${jobIndex}, field: ${fieldName})`
            : `Invalid job data: ${firstError.message}`
        );
        return;
      }

      // Store validated data and set preview
      const validatedJobs = validationResult.data.jobs;
      setParsedData(validatedJobs);
      setSelectedFile(file);
      setImportPreview({ count: validatedJobs.length });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to read file. Please try again."
      );
    }
  }

  /**
   * Handle import: confirm, upload, and refresh
   */
  async function handleImport() {
    if (!parsedData || !importPreview) return;

    setIsImporting(true);
    setError(null);

    try {
      // Fetch current job count for confirmation
      const currentResponse = await fetch("/api/jobs");
      if (!currentResponse.ok) {
        throw new Error("Failed to fetch current jobs");
      }
      const currentJobs: Job[] = await currentResponse.json();
      const currentCount = currentJobs.length;

      // Confirm with user
      const confirmed = window.confirm(
        `You currently have ${currentCount} job${currentCount !== 1 ? "s" : ""}.\n\n` +
          `Importing will replace them with ${importPreview.count} job${importPreview.count !== 1 ? "s" : ""}.\n\n` +
          `This action cannot be undone. Continue?`
      );

      if (!confirmed) {
        setIsImporting(false);
        return;
      }

      // POST to import endpoint using stored parsed data
      const response = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: parsedData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import jobs");
      }

      // Success: refresh page and close modal
      router.refresh();
      onOpenChange(false);
      setSelectedFile(null);
      setParsedData(null);
      setImportPreview(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Import failed. Your existing jobs are unchanged."
      );
    } finally {
      setIsImporting(false);
    }
  }

  /**
   * Handle drag events
   */
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  /**
   * Handle file input change
   */
  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Export & Import</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Export</h3>
            <p className="text-sm text-muted-foreground">
              Download all your active jobs as a JSON file.
            </p>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full sm:w-auto"
            >
              {isExporting ? "Exporting..." : "Export All Jobs"}
            </Button>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Import Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Import</h3>
            <p className="text-sm text-muted-foreground">
              Import jobs from a previously exported JSON file. This will
              replace all your current jobs.
            </p>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                rounded-lg border-2 border-dashed p-8 text-center transition-colors
                ${
                  isDragging
                    ? "border-accent bg-accent/10"
                    : "border-border bg-muted/30"
                }
              `}
            >
              <Upload
                className={`mx-auto mb-3 h-8 w-8 ${
                  isDragging ? "text-accent" : "text-muted-foreground"
                }`}
              />
              <p className="mb-2 text-sm font-medium">
                {isDragging
                  ? "Drop file to select"
                  : "Drop JSON file here or click to browse"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Select JSON file to import"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                Select File
              </Button>
            </div>

            {/* File Selected Preview */}
            {selectedFile && importPreview && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm">
                  <span className="font-medium">{selectedFile.name}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Ready to import {importPreview.count} job
                  {importPreview.count !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {/* Import Button */}
            {selectedFile && importPreview && (
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full sm:w-auto"
                variant="default"
              >
                {isImporting ? "Importing..." : "Import Jobs"}
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
