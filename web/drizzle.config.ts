import { defineConfig } from "drizzle-kit";

const schema = ["./src/db/schema.ts"];

if (process.env.BILLING_ENABLED === "true") {
  // Billing schema must be loaded BEFORE main schema so the main schema's
  // full table definitions (e.g. teams) take precedence over the billing
  // package's minimal FK-only stubs.
  schema.unshift("./packages/billing/src/db/schema.ts");
}

export default defineConfig({
  schema,
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
