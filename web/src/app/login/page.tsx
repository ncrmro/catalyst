import Image from "next/image";
import { auth } from "@/auth";
import SignIn from "@/components/sign-in";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDevAuthUser } from "@/lib/dev-auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Catalyst - Sign In",
  description: "Sign in to your Catalyst development platform account.",
};

export default async function LoginPage() {
  const session = await auth();
  const devUser = await getDevAuthUser();
  
  // If user is already authenticated, redirect to home
  if (session?.user || devUser) {
    redirect("/");
  }

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center sm:text-left">
          <h1 className="catalyst-title text-6xl font-bold text-gray-900 dark:text-white mb-2">
            Catalyst
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Development Platform
          </p>
        </div>
        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            Sign in with your GitHub account using OAuth authentication below.
          </li>
          <li className="mb-2 tracking-[-.01em]">
            Get started by visiting{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
              /github
            </code>{" "}
            to set up your GitHub App.
          </li>
          <li className="tracking-[-.01em]">
            Configure webhooks and start integrating with GitHub repositories.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <SignIn />
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primary text-on-primary gap-2 hover:opacity-90 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/github"
            rel="noopener noreferrer"
          >
            GitHub App Setup
          </a>
        </div>
        
        {/* Development authentication link */}
        {process.env.NODE_ENV === "development" && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Development Mode</p>
            <Link 
              href="/dev-auth"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Simulate Login for Testing
            </Link>
          </div>
        )}
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="/github"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Setup
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/ncrmro/catalyst"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          GitHub Repository →
        </a>
      </footer>
    </div>
  );
}