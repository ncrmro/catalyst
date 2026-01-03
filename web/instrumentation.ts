export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Load pino first as required by next-logger
    await require("pino");
    // Load next-logger to patch Next.js and console logging with structured JSON output
    await require("next-logger");
  }
}
