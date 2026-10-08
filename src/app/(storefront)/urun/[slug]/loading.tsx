export default function ProductDetailLoading() {
  return (
    <div
      className="container-bv py-6 sm:py-10"
      aria-busy="true"
      aria-label="Yükleniyor"
    >
      <div className="mb-5 h-3 w-48 max-w-full animate-pulse rounded bg-[#d8dee4] sm:mb-7" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] lg:gap-12">
        <div className="aspect-[4/5] w-full animate-pulse rounded-[1.25rem] bg-[#e2e7ec] sm:aspect-square" />
        <div className="space-y-4">
          <div className="h-3 w-20 animate-pulse rounded bg-[#e2e7ec]" />
          <div className="h-9 w-4/5 max-w-md animate-pulse rounded bg-[#d8dee4]" />
          <div className="h-4 w-40 animate-pulse rounded bg-[#e2e7ec]" />
          <div className="mt-6 space-y-3 rounded-[1.25rem] border border-[var(--bv-border)] bg-white p-5">
            <div className="h-8 w-36 animate-pulse rounded bg-[#d8dee4]" />
            <div className="h-4 w-28 animate-pulse rounded bg-[#e2e7ec]" />
            <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-[#d8dee4]" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-[#e2e7ec]" />
          </div>
        </div>
      </div>
    </div>
  );
}
