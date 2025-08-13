import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      authorization: {
        params: {
          scope: "read:user user:email read:org repo"
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
      async signIn({ user, account, profile, email, credentials }) {
        console.log('signIn', user, account, profile, email, credentials)
        return true
      },
      async redirect({ url, baseUrl }) {
        console.log('redirect', url, baseUrl)
        return baseUrl
      },
      async session({ session, user, token }) {
        console.log('session', session, user, token)
        return session
      },
      async jwt({ token, account, profile }) {
        // Persist the OAuth access_token and or the user id to the token right after signin
        if (account) {
          token.accessToken = account.access_token
          token.id = profile?.id
        }
        return token
      }
    }
})
