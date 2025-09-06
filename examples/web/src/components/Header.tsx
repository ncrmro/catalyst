import { auth, signOut } from "@/auth";

export default async function Header() {
  const session = await auth();

  if (!session) {
    return null;
  }

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <header className="bg-surface border-b border-outline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-on-surface">
              NextJS Starter
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-on-surface-variant">
              {session.user?.name || session.user?.email}
            </span>
            {session.user?.admin && (
              <span className="px-2 py-1 text-xs bg-primary text-on-primary rounded">
                Admin
              </span>
            )}
            <form action={handleSignOut}>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary-container text-on-primary-container rounded hover:opacity-90 transition-opacity"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}