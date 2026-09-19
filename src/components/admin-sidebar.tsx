"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems } from "@/lib/admin-nav";
import { adminSignOut } from "@/lib/actions/auth";
import { cn } from "@/components/ui";

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-hairline min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-hairline">
        <p className="text-xs text-ink-muted">Combine Foundation</p>
        <p className="font-display text-base font-semibold">Admin Console</p>
      </div>
      <nav className="flex-1 py-4">
        {adminNavItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block px-5 py-2 text-sm border-l-2",
                active
                  ? "border-teal text-teal font-medium"
                  : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-hairline">
        <p className="text-xs text-ink-muted mb-2 truncate">{adminName}</p>
        <form action={adminSignOut}>
          <button type="submit" className="text-xs text-ink-muted hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
