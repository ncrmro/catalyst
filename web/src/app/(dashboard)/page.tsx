import { redirect } from "next/navigation";
import { _auth } from "@/auth";

export default async function Home() {
	const session = await _auth();

	if (!session?.user) {
		redirect("/login");
	}

	redirect("/projects");
}
