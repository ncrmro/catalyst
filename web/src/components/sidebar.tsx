"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarNavItem {
  href: string;
  label: string;
  icon?: string;
  adminOnly?: boolean;
}

const navItems: SidebarNavItem[] = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/teams", label: "Teams", icon: "👥" },
  { href: "/kubeconfigs", label: "Kubeconfigs", icon: "⚙️" },
  { href: "/infrastructure", label: "Infrastructure", icon: "🏗️" },
  { href: "/clusters", label: "Clusters", icon: "☸️", adminOnly: true },
  { href: "/admin/github", label: "GitHub App", icon: "📱", adminOnly: true },
];

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
  user?: {
    admin?: boolean;
  };
}

export default function Sidebar({ className = "", onLinkClick, user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className={`bg-surface border-r border-outline h-full ${className}`}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-on-surface mb-6">Navigation</h3>
        
        <ul className="space-y-2">
          {navItems.map((item) => {
            // Skip admin-only items if user is not an admin
            if (item.adminOnly && !user?.admin) {
              return null;
            }
            
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onLinkClick}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface hover:bg-secondary-container hover:text-on-secondary-container"
                  }`}
                >
                  {item.icon && (
                    <span className="mr-3 text-base" role="img" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}