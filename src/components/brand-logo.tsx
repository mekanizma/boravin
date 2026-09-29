import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Native logo aspect ≈ 1025×400 (≈2.56:1) */
const ASPECT = 1025 / 400;

const SIZE = {
  sm: { height: 28, className: "h-7 w-auto max-w-[5.25rem]" },
  md: { height: 44, className: "h-11 w-auto max-w-[9rem] sm:h-12 sm:max-w-[10rem]" },
  lg: { height: 52, className: "h-[3.25rem] w-auto max-w-[12rem] sm:h-14 sm:max-w-[13.5rem]" },
} as const;

export function BrandLogo({
  href = "/",
  className,
  priority = false,
  size = "md",
}: {
  href?: string | null;
  className?: string;
  priority?: boolean;
  size?: keyof typeof SIZE;
}) {
  const s = SIZE[size];
  const width = Math.round(s.height * ASPECT);

  const image = (
    <Image
      src="/boravin-logo.png"
      alt="BORAVIN — Kıbrıs'ın Teknoloji Merkezi"
      width={width}
      height={s.height}
      priority={priority}
      className={cn(s.className, "object-contain object-left")}
      style={{ width: "auto", height: undefined }}
    />
  );

  if (href === null) {
    return (
      <span className={cn("inline-flex items-center leading-none", className)}>
        {image}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label="BORAVIN anasayfa"
      className={cn("inline-flex shrink-0 items-center leading-none", className)}
    >
      {image}
    </Link>
  );
}
