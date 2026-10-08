export default function CartLoading() {
  return (
    <div
      className="container-bv py-8 sm:py-12"
      aria-busy="true"
      aria-label="Yükleniyor"
    >
      <div className="h-9 w-28 animate-pulse rounded-md bg-[#d8dee4]" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 border-b border-[var(--bv-border)] pb-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 max-w-xs animate-pulse rounded bg-[#d8dee4]" />
                <div className="h-3 w-24 animate-pulse rounded bg-[#e2e7ec]" />
              </div>
              <div className="h-9 w-28 animate-pulse rounded-md bg-[#e2e7ec]" />
            </div>
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white" />
      </div>
    </div>
  );
}