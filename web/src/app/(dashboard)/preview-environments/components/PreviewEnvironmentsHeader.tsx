"use client";

import { useState } from "react";
import { CreatePreviewDialog } from "./CreatePreviewDialog";

export function PreviewEnvironmentsHeader() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-on-background mb-2">
            Preview Environments
          </h1>
          <p className="text-on-surface-variant">
            View and manage your active preview environments for pull requests.
          </p>
        </div>

        <button
          onClick={() => setIsDialogOpen(true)}
          className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary/90 flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create
        </button>
      </div>

      <CreatePreviewDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
