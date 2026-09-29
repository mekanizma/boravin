"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  FolderTree,
  Award,
  ShoppingCart,
  Receipt,
  Users,
  Megaphone,
  Ticket,
  Bell,
  Home,
  Menu,
  Image,
  FileText,
  Newspaper,
  Sparkles,
  MessageSquare,
  Mail,
  Send,
  Settings,
  Shield,
  ScrollText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Ürünler", icon: Package },
  { href: "/admin/stock", label: "Stok", icon: Warehouse },
  { href: "/admin/categories", label: "Kategoriler", icon: FolderTree },
  { href: "/admin/brands", label: "Markalar", icon: Award },
  { href: "/admin/orders", label: "Siparişler", icon: ShoppingCart },
  { href: "/admin/invoices", label: "Faturalar", icon: Receipt },
  { href: "/admin/customers", label: "Müşteriler", icon: Users },
  { href: "/admin/campaigns", label: "Kampanyalar", icon: Megaphone },
  { href: "/admin/coupons", label: "Kuponlar", icon: Ticket },
  { href: "/admin/announcements", label: "Duyurular", icon: Bell },
  { href: "/admin/homepage", label: "Anasayfa", icon: Home },
  { href: "/admin/menus", label: "Menü", icon: Menu },
  { href: "/admin/media", label: "Medya", icon: Image },
  { href: "/admin/pages", label: "Sayfalar", icon: FileText },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
  { href: "/admin/ai", label: "AI Center", icon: Sparkles },
  { href: "/admin/reviews", label: "Yorumlar", icon: MessageSquare },
  { href: "/admin/contact", label: "İletişim", icon: Mail },
  { href: "/admin/newsletter", label: "Newsletter", icon: Send },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings },
  { href: "/admin/roles", label: "Roller", icon: Shield },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
];

export function AdminSidebar({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between gap-2 border-b border-[var(--bv-border)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo href="/admin" size="sm" />
          <span className="text-[10px] font-semibold tracking-[0.14em] text-[var(--bv-muted)] uppercase">
            Admin
          </span>
        </div>
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Menüyü kapat"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--bv-ink)] text-white"
                      : "text-[var(--bv-slate)] hover:bg-[var(--bv-concrete)] hover:text-[var(--bv-ink)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden w-[var(--admin-sidebar)] shrink-0 border-r border-[var(--bv-border)] bg-white lg:block">
        {content}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Kapat"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(100vw-3rem,16rem)] bg-white shadow-[var(--shadow-lg)]">
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
