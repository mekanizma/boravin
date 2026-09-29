"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function CartAddButton({
  pending = false,
  disabled = false,
  onClick,
  wrapClassName,
  className,
}: {
  pending?: boolean;
  disabled?: boolean;
  onClick: () => void;
  wrapClassName?: string;
  className?: string;
}) {
  const t = useTranslations("Cart");
  const label = pending ? t("adding") : t("addToCart");

  return (
    <div className={cn("bv-cart-add-wrap", wrapClassName)}>
      <button
        type="button"
        className={cn("bv-cart-add", className)}
        disabled={disabled || pending}
        onClick={onClick}
        aria-label={label}
      >
        <span>{label}</span>
        <svg
          fill="#fff"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <g id="cart">
            <circle r="1.91" cy="20.59" cx="10.07" />
            <circle r="1.91" cy="20.59" cx="18.66" />
            <path d="M.52,1.5H3.18a2.87,2.87,0,0,1,2.74,2L9.11,13.91H8.64A2.39,2.39,0,0,0,6.25,16.3h0a2.39,2.39,0,0,0,2.39,2.38h10" />
            <polyline points="7.21 5.32 22.48 5.32 22.48 7.23 20.57 13.91 9.11 13.91" />
          </g>
        </svg>
      </button>
    </div>
  );
}
