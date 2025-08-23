import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
 
export default function SignIn() {
  return (
    <form
      action={async () => {
        "use server"
        if (process.env.NODE_ENV === "development") {
          await signIn()
        } else {
          await signIn("github")
        }
      }}
    >
      <Button 
        type="submit"
        size="lg"
        className="rounded-full"
      >
        {process.env.NODE_ENV === "development" ? "Sign in (dev password)" : "Sign in with GitHub"}
      </Button>
    </form>
  )
}