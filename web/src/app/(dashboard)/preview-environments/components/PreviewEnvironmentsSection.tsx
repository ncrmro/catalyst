"use client";

import { useState } from "react";
import { PreviewEnvironmentsHeader } from "./PreviewEnvironmentsHeader";
import { CreatePreviewCard } from "./CreatePreviewCard";

export function PreviewEnvironmentsSection({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showCreateCard, setShowCreateCard] = useState(false);

  return (
    <div className="space-y-4">
      <PreviewEnvironmentsHeader
        onCreateClick={() => setShowCreateCard(!showCreateCard)}
        isCreating={showCreateCard}
      />
      {showCreateCard && (
        <CreatePreviewCard onClose={() => setShowCreateCard(false)} />
      )}
      {children}
    </div>
  );
}
