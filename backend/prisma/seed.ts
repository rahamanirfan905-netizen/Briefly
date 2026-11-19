import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES } from "../src/lib/news/categories";

const db = new PrismaClient();

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, keywords: c.keywords, sortOrder: i },
      update: {},
    });
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password && password.length >= 10) {
    await db.user.upsert({
      where: { email },
      create: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12), preferences: { create: { categories: [] } } },
      update: { role: "ADMIN" },
    });
    console.log(`Admin account ready: ${email}`);
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD (10+ chars) not set; skipped admin creation.");
  }
  console.log(`Seeded ${CATEGORIES.length} categories. Run \`npm run refresh\` to fetch live news.`);
}

main().finally(() => db.$disconnect());
