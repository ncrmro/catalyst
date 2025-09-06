import { signIn } from "@/auth";
import { redirect } from "next/navigation";

export default function LoginPage() {
  async function handleGitHubSignIn() {
    "use server";
    await signIn("github");
  }

  async function handleCredentialsSignIn(formData: FormData) {
    "use server";
    const password = formData.get("password") as string;
    
    try {
      await signIn("credentials", {
        password,
        redirectTo: "/",
      });
    } catch (error) {
      console.error("Sign in error:", error);
      redirect("/login?error=invalid");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-on-surface text-center mb-8">
          Sign In
        </h1>
        
        <div className="space-y-6">
          {/* GitHub OAuth */}
          <form action={handleGitHubSignIn}>
            <button
              type="submit"
              className="w-full bg-primary text-on-primary py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Sign in with GitHub
            </button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-surface px-2 text-on-surface-variant">
                Or for development
              </span>
            </div>
          </div>
          
          {/* Development Credentials */}
          <form action={handleCredentialsSignIn} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-on-surface mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="w-full px-3 py-2 border border-outline rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="password or admin"
                required
              />
              <p className="text-xs text-on-surface-variant mt-1">
                Use "password" for user access or "admin" for admin access
              </p>
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary-container text-on-primary-container py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Sign in with Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}