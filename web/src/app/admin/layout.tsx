export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth and admin checks are handled by middleware
  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <h1 className="text-2xl font-bold text-on-surface">Admin Panel</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Administrative functions and system management
        </p>
      </div>
      {children}
    </div>
  );
}
