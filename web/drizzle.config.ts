import { defineConfig } from "drizzle-kit";

const schema = ["./src/db/schema.ts"];

if (process.env.BILLING_ENABLED === "true") {
  schema.push("./packages/billing/src/db/schema.ts");
}

export default defineConfig({
  schema,
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
