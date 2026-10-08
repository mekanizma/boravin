"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const isPrintPage = pathname.includes("/print");

  if (isPrintPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh bg-[var(--bv-paper)]">
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onMenuClick={() => setMenuOpen(true)} />
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
