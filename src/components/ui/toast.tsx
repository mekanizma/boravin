"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (input: Omit<ToastItem, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function useIsClient() {
  return React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const isClient = useIsClient();

  const toast = React.useCallback((input: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { ...input, id }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {isClient
        ? createPortal(
            <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "pointer-events-auto rounded-[var(--radius-md)] border px-4 py-3 shadow-[var(--shadow-md)]",
                    item.tone === "success" &&
                      "border-[var(--bv-success)]/30 bg-white text-[var(--bv-success)]",
                    item.tone === "error" &&
                      "border-[var(--bv-danger)]/30 bg-white text-[var(--bv-danger)]",
                    item.tone === "warning" &&
                      "border-[var(--bv-warning)]/30 bg-white text-[var(--bv-warning)]",
                    item.tone === "info" &&
                      "border-[var(--bv-steel)]/30 bg-white text-[var(--bv-steel)]",
                  )}
                  role="status"
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs opacity-80">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
