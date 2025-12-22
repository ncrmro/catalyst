import { _auth } from "@/auth";
import SignIn from "@/components/sign-in";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { GlassCard } from "@tetrastack/react-glass-components";

export const metadata: Metadata = {
  title: "Sign In - Catalyst",
  description: "Sign in to access your Catalyst development platform.",
};

export default async function LoginPage() {
  const session = await _auth();

  // If user is already authenticated, redirect to home
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <GlassCard>
          <div className="text-center mb-8">
            <h1 className="catalyst-title text-4xl font-bold text-on-background mb-2">
              Catalyst
            </h1>
            <p className="text-lg text-on-surface-variant mb-6">
              Development Platform
            </p>
            <h2 className="text-2xl font-semibold text-on-background">
              Sign in to your account
            </h2>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <SignIn />
            </div>

            <div className="text-center">
              <p className="text-sm text-on-surface-variant">
                Sign in with your GitHub account to access your development
                platform.
              </p>
            </div>

            <div className="border-t border-outline pt-6">
              <div className="text-sm text-on-surface-variant space-y-2">
                <p>• Access your project reports and insights</p>
                <p>• Manage repositories and track progress</p>
                <p>• Collaborate with your team effectively</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
