import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-bv flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-xs font-medium tracking-[0.2em] text-[var(--bv-muted)] uppercase">
        404
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-[var(--bv-muted)]">
        Aradığınız içerik taşınmış veya kaldırılmış olabilir.
      </p>
      <Link href="/" className="mt-6">
        <Button variant="accent">Anasayfaya dön</Button>
      </Link>
    </div>
  );
}
