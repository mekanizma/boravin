import { getTranslations } from "next-intl/server";

export default async function StorefrontLoading() {
  const t = await getTranslations("Common");
  return (
    <div className="container-bv py-8 sm:py-10" aria-busy="true" aria-label={t("loadingAria")}>
      <div className="h-8 w-48 animate-pulse rounded-md bg-[#d8dee4]" />
      <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded-md bg-[#e2e7ec]" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[1rem] bg-white p-2.5 shadow-[0_8px_18px_rgba(18,20,23,0.06)]"
          >
            <div className="aspect-square animate-pulse rounded-[0.9rem] bg-[#e8edf1]" />
            <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-[#e2e7ec]" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-[#dce3e9]" />
            <div className="mt-3 h-5 w-1/2 animate-pulse rounded bg-[#e8edf1]" />
          </div>
        ))}
      </div>
    </div>
  );
}
