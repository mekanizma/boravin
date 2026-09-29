"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-bv flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Bir sorun oluştu</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--bv-muted)]">
        Lütfen tekrar deneyin. Sorun devam ederse destek ekibiyle iletişime geçin.
      </p>
      <Button className="mt-6" variant="accent" onClick={reset}>
        Tekrar dene
      </Button>
    </div>
  );
}
