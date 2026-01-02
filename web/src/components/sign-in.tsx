import { signIn } from "@/auth";

export default function SignIn() {
	return (
		<form
			action={async (formData) => {
				"use server";
				await signIn(
					process.env.NODE_ENV === "development" ? "password" : "github",
					{
						password: formData.get("password"),
						redirectTo: "/",
					},
				);
			}}
		>
			{process.env.NODE_ENV === "development" && (
				<div className="mb-4">
					<label
						htmlFor="password"
						className="block text-sm font-medium text-gray-700"
					>
						Development Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
					/>
				</div>
			)}
			<button
				type="submit"
				className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primary text-on-primary gap-2 hover:opacity-90 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
			>
				{process.env.NODE_ENV === "development"
					? "Sign in (dev password)"
					: "Sign in with GitHub"}
			</button>
		</form>
	);
}
