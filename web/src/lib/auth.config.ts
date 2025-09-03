/**
 * This is separate from authjs because nextjs middleware **always** runs in edge runtime 
 * This means we can use the database even though we only use it during dev.
 */
import { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import { NextAuthConfig } from "next-auth";


const providers: Provider[] = [
    GitHub({
      authorization: {
        params: {
          scope: "read:user user:email read:org repo"
        }
      }
    })
  ];

  
  // Notice this is only an object, not a full Auth.js instance
export default {
    providers,
  } satisfies NextAuthConfig
