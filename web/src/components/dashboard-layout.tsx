import Sidebar from "./sidebar";
import SignOut from "./sign-out";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline bg-surface px-6">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-sm text-on-surface-variant">
                Welcome, {user.name || user.email}!
              </div>
            )}
            <SignOut />
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}