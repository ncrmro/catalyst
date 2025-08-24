"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarNavItem {
  href: string;
  label: string;
  icon?: string;
}

const navItems: SidebarNavItem[] = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/teams", label: "Teams", icon: "👥" },
  { href: "/kubeconfigs", label: "Kubeconfigs", icon: "⚙️" },
  { href: "/infrastructure", label: "Infrastructure", icon: "🏗️" },
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className={`bg-surface border-r border-outline h-full ${className}`}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-on-surface mb-6">Navigation</h2>
        
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
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