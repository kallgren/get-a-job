"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ExportImportModal } from "@/components/export-import-modal";

/**
 * Header actions component containing theme toggle, export/import, and user button.
 * Client component to manage modal state while keeping the parent page as a Server Component.
 */
export function HeaderActions() {
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExportImportOpen(true)}
          aria-label="Export and import"
          title="Export and import"
        >
          <Download className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <UserButton />
      </div>

      <ExportImportModal
        open={isExportImportOpen}
        onOpenChange={setIsExportImportOpen}
      />
    </>
  );
}
