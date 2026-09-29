import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { lookupBarcodeExternal } from "../src/lib/barcode/lookup";

async function main() {
  const code = process.argv[2] || "8000500004388";
  console.log("looking up", code);
  const r = await lookupBarcodeExternal(code);
  console.log(
    JSON.stringify(
      {
        name: r.draft?.name,
        brand: r.draft?.brand,
        source: r.draft?.source,
        images: r.draft?.imageUrls?.length ?? 0,
        imageUrls: r.draft?.imageUrls?.slice(0, 6),
        missing: r.draft?.missing,
        offline: r.offline,
      },
      null,
      2,
    ),
  );
  if (!r.draft) process.exitCode = 2;
  else if ((r.draft.imageUrls?.length ?? 0) < 3) process.exitCode = 3;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
