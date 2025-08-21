import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DevAuthPage() {
  async function simulateLogin() {
    "use server";
    // Set a simple development cookie to simulate authentication
    const cookieStore = await cookies();
    cookieStore.set("dev-auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-surface border border-outline rounded-lg p-6 max-w-md w-full">
        <h1 className="text-xl font-bold text-on-surface mb-4">Development Authentication</h1>
        <p className="text-on-surface-variant mb-4">
          This is a development-only page to simulate authentication for testing the dashboard.
        </p>
        <form action={simulateLogin}>
          <button 
            type="submit"
            className="w-full bg-primary text-on-primary rounded-md px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Simulate Login
          </button>
        </form>
      </div>
    </div>
  );
}