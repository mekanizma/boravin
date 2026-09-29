"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  Menu,
  Package,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { CartDrawer, type CartDrawerItem } from "@/components/storefront/cart-drawer";
import { BrandLogo } from "@/components/brand-logo";
import { getCart } from "@/features/cart/actions";
import {
  categoryHref,
  STORE_CATEGORIES,
  type CatalogNode,
} from "@/lib/storefront/catalog";

const utilityLinks = [
  { href: "/", label: "Anasayfa" },
  { href: categoryHref("2. El Ürünler"), label: "2. El Ürünler" },
  { href: "/sayfa/sss", label: "Müşteri Hizmetleri" },
  { href: "/sayfa/iletisim", label: "İletişim" },
];

const navItems = STORE_CATEGORIES;

const searchHints = ["Notebook", "Kulaklık", "Mouse", "Klavye", "Asus monitör"];

function HeaderSearch({ id }: { id: string }) {
  const [value, setValue] = React.useState("");
  const [hintIndex, setHintIndex] = React.useState(0);
  const [hintOn, setHintOn] = React.useState(true);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    let fadeTimer = 0;
    const timer = window.setInterval(() => {
      setHintOn(false);
      fadeTimer = window.setTimeout(() => {
        setHintIndex((current) => (current + 1) % searchHints.length);
        setHintOn(true);
      }, 180);
    }, 2600);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <form action="/urunler" className="min-w-0">
      <label className="sr-only" htmlFor={id}>
        Ürün ara
      </label>
      <div className="group relative flex h-10 items-center rounded-full border border-[#e3e8ec] bg-[#f4f6f8] pr-1 pl-3.5 transition-[background,border-color,box-shadow] duration-200 focus-within:border-[var(--bv-teal)] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(227,0,15,0.12)] lg:h-11 lg:pl-4">
        <Search
          className="h-4 w-4 shrink-0 text-[#8b939b] transition-colors duration-200 group-focus-within:text-[var(--bv-teal)]"
          strokeWidth={2.25}
        />
        <input
          id={id}
          name="q"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-base text-[#121417] outline-none lg:px-3 lg:text-sm [&::-webkit-search-cancel-button]:appearance-none"
          autoComplete="off"
        />
        {value.length === 0 ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 right-14 left-10 truncate text-base text-[#8b939b] transition-all duration-200 motion-reduce:transition-none lg:right-16 lg:left-11 lg:text-sm",
              hintOn ? "-translate-y-1/2 opacity-100" : "-translate-y-[80%] opacity-0",
            )}
          >
            {searchHints[hintIndex]} ara
          </span>
        ) : null}
        <button
          type="submit"
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--bv-teal)] px-3 text-[13px] font-semibold text-white transition-[background,transform] duration-200 hover:bg-[var(--bv-teal-hover)] active:scale-[0.97] lg:h-9 lg:px-4"
          aria-label="Ara"
        >
          <Search className="h-3.5 w-3.5 lg:hidden" strokeWidth={2.25} />
          <span className="hidden lg:inline">Ara</span>
        </button>
      </div>
    </form>
  );
}

function leafGridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:max-w-xl sm:grid-cols-2";
  if (count === 3) return "grid-cols-1 sm:max-w-3xl sm:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(11.5rem,14.5rem))]";
}

function MenuLink({
  href,
  onClick,
  className,
  children,
}: {
  href: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center rounded-lg px-2.5 text-[13px] leading-snug text-[#2a3138] hover:bg-[#f3f6f7] hover:text-[var(--bv-teal)] lg:min-h-9",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function BranchBlock({
  branch,
  onNavigate,
  framed,
}: {
  branch: CatalogNode;
  onNavigate: () => void;
  framed?: boolean;
}) {
  return (
    <div className={cn("min-w-0", framed && "rounded-xl bg-[#f4f7f8] p-2 sm:p-3")}>
      <Link
        href={branch.href}
        onClick={onNavigate}
        className="inline-flex min-h-11 items-center border-b-2 border-[var(--bv-teal)] px-2.5 text-[13px] font-semibold text-[#121417] hover:text-[var(--bv-teal)] lg:min-h-9"
      >
        {branch.name}
      </Link>
      <ul className="mt-1">
        {branch.children.map((grand) => (
          <li key={grand.href}>
            <MenuLink href={grand.href} onClick={onNavigate}>
              {grand.name}
            </MenuLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryPanel({
  item,
  onNavigate,
}: {
  item: CatalogNode;
  onNavigate: () => void;
}) {
  const branches = item.children.filter((child) => child.children.length > 0);
  const leaves = item.children.filter((child) => child.children.length === 0);
  const branchCols = "sm:grid-cols-[repeat(auto-fill,minmax(11.5rem,14.5rem))]";
  const singleBranch = branches.length === 1 ? branches[0] : null;

  return (
    <div className="border-t border-[#e6eaee] bg-white shadow-[0_16px_32px_rgba(18,20,23,0.08)]">
      <div className="container-bv max-h-[min(70vh,26rem)] overflow-y-auto px-4 py-3 sm:px-0 sm:py-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#8b939b] uppercase">
            {item.name}
          </p>
          <Link
            href={item.href}
            onClick={onNavigate}
            className="inline-flex min-h-11 items-center gap-0.5 text-[13px] font-semibold text-[var(--bv-teal)] lg:min-h-9"
          >
            Tümünü gör
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </Link>
        </div>

        {singleBranch ? (
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,15.5rem)_1fr] lg:gap-8">
            <BranchBlock branch={singleBranch} onNavigate={onNavigate} framed />
            {leaves.length ? (
              <ul className="grid content-start gap-x-2 sm:grid-cols-2">
                {leaves.map((leaf) => (
                  <li key={leaf.href}>
                    <MenuLink href={leaf.href} onClick={onNavigate} className="font-medium text-[#1c2128]">
                      {leaf.name}
                    </MenuLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <>
            {branches.length ? (
              <div className={cn("grid grid-cols-1 gap-x-6 gap-y-4", branchCols)}>
                {branches.map((branch) => (
                  <BranchBlock key={branch.href} branch={branch} onNavigate={onNavigate} />
                ))}
              </div>
            ) : null}
            {leaves.length ? (
              <ul
                className={cn(
                  "grid content-start gap-x-2",
                  leafGridClass(leaves.length),
                  branches.length > 0 && "mt-3 border-t border-[#eef1f3] pt-2",
                )}
              >
                {leaves.map((leaf) => (
                  <li key={leaf.href}>
                    <MenuLink href={leaf.href} onClick={onNavigate} className="font-medium text-[#1c2128]">
                      {leaf.name}
                    </MenuLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [drawerSection, setDrawerSection] = React.useState<string | null>(null);
  const [openNav, setOpenNav] = React.useState<string | null>(null);
  const navRef = React.useRef<HTMLElement>(null);
  const closeTimer = React.useRef<number | null>(null);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [summary, setSummary] = React.useState({ count: 0, total: 0 });
  const [cartItems, setCartItems] = React.useState<CartDrawerItem[]>([]);

  const refreshCart = React.useCallback(() => {
    getCart()
      .then((res) => {
        const items = res.items ?? [];
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        const total = items.reduce(
          (sum, item) => sum + Number(item.unitPrice) * item.quantity,
          0,
        );
        setSummary({ count, total });
        setCartItems(
          items.map((item) => ({
            id: item.id,
            name: item.product?.name ?? "Ürün",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            imageUrl: item.product?.images?.[0]?.url ?? null,
            href: item.product ? `/urun/${item.product.slug}` : "/sepet",
          })),
        );
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  React.useEffect(() => {
    if (cartOpen) refreshCart();
  }, [cartOpen, refreshCart]);

  React.useEffect(() => {
    const onChange = () => refreshCart();
    const onOpen = () => {
      refreshCart();
      setCartOpen(true);
    };
    window.addEventListener("bv-cart-changed", onChange);
    window.addEventListener("bv-cart-open", onOpen);
    return () => {
      window.removeEventListener("bv-cart-changed", onChange);
      window.removeEventListener("bv-cart-open", onOpen);
    };
  }, [refreshCart]);

  React.useEffect(() => {
    setMenuOpen(false);
    setDrawerSection(null);
    setOpenNav(null);
  }, [pathname]);

  const canHover = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenNav(null), 90);
  };

  React.useEffect(() => () => cancelClose(), []);

  React.useEffect(() => {
    if (!openNav) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenNav(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openNav]);

  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#ececec] bg-white text-[#111]">
        <div className="border-b border-[#c4000c] bg-[var(--bv-sale)] text-[12px] text-white">
          <div className="container-bv flex h-9 items-center justify-between gap-4">
            <p className="inline-flex min-w-0 items-center gap-2 font-medium">
              <Package className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2} />
              <span className="truncate">5.000 TL ve üzeri alışverişlerde kargo ücretsiz</span>
            </p>
            <nav className="hidden items-center gap-4 lg:flex">
              {utilityLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-white/80">
                  {link.label}
                </Link>
              ))}
              <span className="text-white/50">|</span>
              <span>Türkçe</span>
              <span>TRY</span>
            </nav>
          </div>
        </div>

        <div className="container-bv flex items-center gap-2.5 py-2 lg:gap-5 lg:py-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center lg:hidden"
            aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setOpenNav(null);
            }}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <BrandLogo priority size="md" />

          <div className="hidden min-w-0 flex-1 lg:block">
            <HeaderSearch id="header-search" />
          </div>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/hesabim"
              className="hidden h-10 items-center gap-2 px-2 text-[12px] leading-tight lg:inline-flex"
              aria-label="Sipariş takip"
            >
              <Package className="h-5 w-5" strokeWidth={1.75} />
              <span>
                Sipariş
                <br />
                takip
              </span>
            </Link>
            <Link
              href="/favoriler"
              className="inline-flex h-10 w-10 items-center justify-center"
              aria-label="Favoriler"
            >
              <Heart className="h-5 w-5" strokeWidth={1.75} />
            </Link>
            <Link
              href="/hesabim"
              className="inline-flex h-10 w-10 items-center justify-center"
              aria-label="Hesabım"
            >
              <User className="h-5 w-5" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 px-1.5"
              aria-label="Sepet"
              onClick={() => setCartOpen(true)}
            >
              <span className="relative">
                <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--bv-sale)] px-1 text-[10px] font-bold text-white">
                  {summary.count}
                </span>
              </span>
              <span className="hidden text-left text-[12px] leading-tight lg:block">
                <span className="block">{summary.count} adet</span>
                <span className="block font-semibold">{formatCurrency(summary.total)}</span>
              </span>
            </button>
          </div>
        </div>

        <div className="container-bv pb-2.5 lg:hidden">
          <HeaderSearch id="header-search-mobile" />
        </div>

        <nav
          ref={navRef}
          className="border-t border-[#e6eaee] bg-[#f4f6f8]"
          onMouseEnter={cancelClose}
          onMouseLeave={() => {
            if (canHover()) scheduleClose();
          }}
          onBlur={(event) => {
            if (!navRef.current?.contains(event.relatedTarget as Node | null)) {
              setOpenNav(null);
            }
          }}
        >
          <div className="container-bv hidden h-12 items-stretch divide-x divide-[#e3e8ec] overflow-x-auto lg:flex">
            {navItems.map((item) => {
              const open = openNav === item.slug;
              const current = !open && pathname.startsWith(item.href);
              const itemClass = cn(
                "inline-flex h-full min-w-max flex-1 items-center justify-center gap-1.5 px-3 text-[13px] font-medium whitespace-nowrap text-[#1c2128] transition-colors hover:bg-white hover:text-[var(--bv-teal)]",
                open && "bg-white text-[var(--bv-teal)] shadow-[inset_0_-2px_0_0_var(--bv-teal)]",
                current && "text-[var(--bv-teal)]",
              );
              return item.children.length ? (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-expanded={open}
                  className={itemClass}
                  onMouseEnter={() => {
                    if (canHover()) setOpenNav(item.slug);
                  }}
                  onFocus={() => setOpenNav(item.slug)}
                >
                  {item.name}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-[#8b939b] transition-transform",
                      (open || current) && "text-[var(--bv-teal)]",
                      open && "rotate-180",
                    )}
                    strokeWidth={2.25}
                  />
                </Link>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={itemClass}
                  onMouseEnter={() => {
                    if (canHover()) setOpenNav(null);
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="bv-snap-x flex gap-2 overflow-x-auto px-3 py-2.5 lg:hidden">
            {navItems.map((item) => {
              const open = openNav === item.slug;
              const chipClass = cn(
                "inline-flex h-10 shrink-0 snap-start items-center gap-1 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap",
                open
                  ? "border-[var(--bv-teal)] bg-white text-[var(--bv-teal)]"
                  : "border-[#e3e8ec] bg-white text-[#1c2128]",
              );
              return item.children.length ? (
                <button
                  key={item.href}
                  type="button"
                  aria-expanded={open}
                  className={chipClass}
                  onClick={() =>
                    setOpenNav((current) => (current === item.slug ? null : item.slug))
                  }
                >
                  {item.name}
                  <ChevronDown
                    className={cn("h-3.5 w-3.5", open && "rotate-180")}
                    strokeWidth={2.25}
                  />
                </button>
              ) : (
                <Link key={item.href} href={item.href} className={chipClass}>
                  {item.name}
                </Link>
              );
            })}
          </div>

          {navItems.map((item) =>
            openNav === item.slug && item.children.length ? (
              <CategoryPanel
                key={item.slug}
                item={item}
                onNavigate={() => setOpenNav(null)}
              />
            ) : null,
          )}
        </nav>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Menüyü kapat"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[#eee] px-4">
              <p className="text-lg font-bold tracking-tight">Menü</p>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center"
                aria-label="Kapat"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-2">
              {navItems.map((item) => {
                const expanded = drawerSection === item.slug;
                return (
                  <div key={item.href} className="border-b border-[#f2f2f2]">
                    {item.children.length ? (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        className="flex min-h-12 w-full items-center justify-between px-3 text-left text-[15px] font-semibold"
                        onClick={() =>
                          setDrawerSection((current) => (current === item.slug ? null : item.slug))
                        }
                      >
                        {item.name}
                        <ChevronDown
                          className={cn("h-4 w-4 text-[#667] transition-transform", expanded && "rotate-180")}
                          strokeWidth={2}
                        />
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-12 items-center px-3 text-[15px] font-semibold"
                      >
                        {item.name}
                      </Link>
                    )}
                    {expanded ? (
                      <div className="px-1 pb-2">
                        <Link
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex min-h-11 items-center px-3 text-[13px] font-semibold text-[var(--bv-teal)]"
                        >
                          Tümünü gör
                        </Link>
                        {item.children.map((child) => (
                          <div key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => setMenuOpen(false)}
                              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[#222] hover:bg-[#f4f7f8]"
                            >
                              {child.name}
                            </Link>
                            {child.children.map((grand) => (
                              <Link
                                key={grand.href}
                                href={grand.href}
                                onClick={() => setMenuOpen(false)}
                                className="flex min-h-10 items-center rounded-lg pr-3 pl-6 text-[13px] text-[#4a5560] hover:bg-[#f4f7f8] hover:text-[var(--bv-teal)]"
                              >
                                {grand.name}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <Link
                href="/hesabim"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-12 items-center px-3 text-[15px] font-semibold"
              >
                Giriş / Üye ol
              </Link>
              {utilityLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center px-3 text-sm text-[#444]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="border-t border-[#eee] px-4 py-3 text-xs text-[#666]">
              5.000 TL ve üzeri kargo ücretsiz
            </p>
          </div>
        </div>
      ) : null}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} />
    </>
  );
}
