import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-on-background mb-8">
          Welcome to NextJS Starter
        </h1>
        
        <div className="bg-surface rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold text-on-surface mb-4">
            User Information
          </h2>
          <div className="space-y-2">
            <p className="text-on-surface-variant">
              <strong>Name:</strong> {session.user?.name}
            </p>
            <p className="text-on-surface-variant">
              <strong>Email:</strong> {session.user?.email}
            </p>
            <p className="text-on-surface-variant">
              <strong>Role:</strong> {session.user?.admin ? "Admin" : "User"}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-on-surface mb-4">
            Getting Started
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-on-surface">Features Included:</h3>
              <ul className="list-disc list-inside text-on-surface-variant space-y-1 mt-2">
                <li>NextJS 15 with App Router</li>
                <li>NextAuth.js authentication</li>
                <li>Drizzle ORM with PostgreSQL</li>
                <li>AI SDK integration</li>
                <li>Playwright for E2E testing</li>
                <li>Vitest for unit/integration testing</li>
                <li>Tailwind CSS for styling</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-on-surface">Next Steps:</h3>
              <ul className="list-disc list-inside text-on-surface-variant space-y-1 mt-2">
                <li>Explore the <code className="bg-primary-container text-on-primary-container px-1 rounded">src/</code> directory structure</li>
                <li>Add your own components in <code className="bg-primary-container text-on-primary-container px-1 rounded">src/components/</code></li>
                <li>Create server actions in <code className="bg-primary-container text-on-primary-container px-1 rounded">src/actions/</code></li>
                <li>Extend the database schema in <code className="bg-primary-container text-on-primary-container px-1 rounded">src/database/schema.ts</code></li>
                <li>Build AI agents in <code className="bg-primary-container text-on-primary-container px-1 rounded">src/agents/</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}