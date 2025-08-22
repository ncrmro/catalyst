import { auth } from "@/auth";
import SignIn from "@/components/sign-in";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Catalyst",
  description: "Sign in to access your Catalyst development platform.",
};

export default async function LoginPage() {
  const session = await auth();
  
  // If user is already authenticated, redirect to home
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="catalyst-title text-4xl font-bold text-on-background mb-2">
            Catalyst
          </h1>
          <p className="text-lg text-on-surface-variant mb-8">
            Development Platform
          </p>
          <h2 className="text-2xl font-semibold text-on-background mb-6">
            Sign in to your account
          </h2>
        </div>
        
        <div className="bg-surface border border-outline rounded-lg p-8 shadow-sm">
          <div className="space-y-6">
            <div className="text-center">
              <SignIn />
            </div>
            
            <div className="text-center">
              <p className="text-sm text-on-surface-variant">
                Sign in with your GitHub account to access your development platform.
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
        </div>
      </div>
    </div>
  );
}