import Image from "next/image";
import { auth } from "@/auth";
import SignIn from "@/components/sign-in";
import SignOut from "@/components/sign-out";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalyst - Development Platform",
  description: "A powerful development platform for GitHub integration and repository management.",
};
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function Home() {
  const session = await auth();
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
            Sign in with your GitHub account using OAuth authentication above.
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
          {session?.user ? (
            <div className="flex gap-4 items-center flex-col sm:flex-row">
              <div className="text-sm text-gray-600">
                Welcome, {session.user.name || session.user.email}!
              </div>
              <SignOut />
            </div>
          ) : (
            <SignIn />
          )}
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primary text-on-primary gap-2 hover:opacity-90 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/github"
            rel="noopener noreferrer"
          >
            GitHub App Setup
          </a>
          <a
            className="rounded-full border border-solid border-outline transition-colors flex items-center justify-center bg-surface text-on-surface hover:bg-primary-container hover:text-on-primary-container hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href="/repos"
            rel="noopener noreferrer"
          >
            View Repositories
          </a>
          {isFeatureEnabled('USER_CLUSTERS') && (
            <a
              className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
              href="/clusters"
              rel="noopener noreferrer"
            >
              View Clusters
            </a>
          )}
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href="/projects"
            rel="noopener noreferrer"
          >
            View Projects
          </a>
          <a
            className="rounded-full border border-solid border-outline transition-colors flex items-center justify-center bg-surface text-on-surface hover:bg-secondary-container hover:text-on-secondary-container hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://github.com/ncrmro/catalyst"

            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </div>
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
          href="/repos"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Repositories
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
