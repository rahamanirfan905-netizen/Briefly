import { refreshNews } from "../src/lib/news/ingest";
import { db } from "../src/lib/db";

refreshNews()
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exitCode = r.ok ? 0 : 1;
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
