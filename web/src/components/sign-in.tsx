import { signIn } from "@/auth"
 
export default function SignIn() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("github")
      }}
    >
      <button 
        type="submit"
        className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primary text-on-primary gap-2 hover:opacity-90 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
      >
        Sign in with GitHub
      </button>
    </form>
  )
}