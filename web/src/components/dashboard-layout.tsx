"use client";

import Sidebar from "@/components/sidebar";
import SignOut from "@/components/sign-out";
import Link from "next/link";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    admin?: boolean;
  };
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-surface border-b border-outline">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile hamburger menu */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-md text-on-surface hover:bg-secondary-container"
                aria-label="Toggle navigation menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              
              <span className="catalyst-title text-xl md:text-2xl font-bold text-on-surface">
                Catalyst
              </span>
              <span className="hidden sm:block text-sm text-on-surface-variant">
                Development Platform
              </span>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              {user && (
                <div className="hidden sm:block text-sm text-on-surface-variant">
                  Welcome, {user.name || user.email}!
                </div>
              )}
              <SignOut />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <div className={`
          ${sidebarOpen ? 'block' : 'hidden'} md:block
          fixed md:static inset-y-0 left-0 z-50 md:z-auto
          w-64 flex-shrink-0
        `}>
          <Sidebar 
            className="h-full" 
            onLinkClick={() => setSidebarOpen(false)}
            user={user}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-surface border-t border-outline mt-auto">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-center gap-4 md:gap-6 text-sm text-on-surface-variant flex-wrap">
            <Link href="/teams" className="hover:text-on-surface hover:underline">
              Teams
            </Link>
            <Link href="/projects" className="hover:text-on-surface hover:underline">
              Projects
            </Link>
            <Link href="/reports" className="hover:text-on-surface hover:underline">
              Reports
            </Link>
            <Link href="/repos" className="hover:text-on-surface hover:underline">
              Repositories
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}