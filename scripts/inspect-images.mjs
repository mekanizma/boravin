import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: "require",
});

const summary = await sql`
  select
    count(*)::int as total,
    count(*) filter (where url like '/uploads/%')::int as local_uploads,
    count(*) filter (where url like '%unsplash%')::int as unsplash,
    count(*) filter (where url like 'https://%' or url like 'http://%')::int as remote
  from product_images
`;
console.log("summary", summary[0]);

const samples = await sql`
  select left(url, 120) as url, count(*)::int as n
  from product_images
  group by url
  order by n desc
  limit 25
`;
console.log(JSON.stringify(samples, null, 2));

await sql.end({ timeout: 3 });
