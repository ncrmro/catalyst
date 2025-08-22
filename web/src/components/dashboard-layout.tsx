import Sidebar from "@/components/sidebar";
import SignOut from "@/components/sign-out";
import Link from "next/link";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="catalyst-title text-2xl font-bold text-card-foreground">
                Catalyst
              </h1>
              <span className="text-sm text-muted-foreground">
                Development Platform
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-sm text-muted-foreground">
                  Welcome, {user.name || user.email}!
                </div>
              )}
              <SignOut />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <Sidebar className="h-full" />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-auto">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/teams" className="hover:text-card-foreground hover:underline">
              Teams
            </Link>
            <Link href="/projects" className="hover:text-card-foreground hover:underline">
              Projects
            </Link>
            <Link href="/reports" className="hover:text-card-foreground hover:underline">
              Reports
            </Link>
            <Link href="/repos" className="hover:text-card-foreground hover:underline">
              Repositories
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}