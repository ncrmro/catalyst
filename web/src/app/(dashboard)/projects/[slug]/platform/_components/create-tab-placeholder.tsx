"use client";

export function CreateTabPlaceholder() {
  return (
    <div className="py-8 text-center">
      <svg
        className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
      <p className="text-on-surface-variant font-medium">
        Environment Creation Wizard
      </p>
      <p className="text-sm text-on-surface-variant/70 mt-1">
        Coming soon - configure and deploy new environments here
      </p>
    </div>
  );
}
