import { cookies } from "next/headers";

export async function getDevAuthUser() {
  const cookieStore = await cookies();
  const devAuth = cookieStore.get("dev-auth");
  
  if (devAuth?.value === "true") {
    return {
      name: "Development User",
      email: "dev@catalyst.local",
    };
  }
  
  return null;
}