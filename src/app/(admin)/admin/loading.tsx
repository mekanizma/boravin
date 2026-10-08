export default function AdminLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Yükleniyor">
      <div className="space-y-2">
        <div className="h-8 w-40 max-w-[50%] animate-pulse rounded-md bg-[var(--bv-concrete)]" />
        <div className="h-4 w-56 max-w-[70%] animate-pulse rounded-md bg-[var(--bv-fog)]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white"
          >
            <div className="space-y-3 p-4">
              <div className="h-3 w-1/3 rounded bg-[var(--bv-fog)]" />
              <div className="h-7 w-1/2 rounded bg-[var(--bv-concrete)]" />
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white">
        <div className="border-b border-[var(--bv-border)] px-4 py-3">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--bv-fog)]" />
        </div>
        <div className="divide-y divide-[var(--bv-border)]">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="h-4 flex-1 animate-pulse rounded bg-[var(--bv-fog)]" />
              <div className="h-4 w-16 animate-pulse rounded bg-[var(--bv-concrete)] sm:w-24" />
              <div className="hidden h-4 w-20 animate-pulse rounded bg-[var(--bv-fog)] sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
