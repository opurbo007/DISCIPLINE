/**
 * pages/api/auth/[...nextauth].js
 * ─────────────────────────────────────────────────────────────────────────────
 * NextAuth.js configuration.
 *
 * Provider  : Credentials (email + password) — stored in MongoDB with bcrypt.
 * Strategy  : JWT sessions (no database adapter needed for sessions).
 * The JWT contains { id, email, name } so we can identify the user in API
 * routes via getServerSession() without an extra DB query.
 */

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export const authOptions = {
  // ── Providers ─────────────────────────────────────────────────────────────
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      /**
       * authorize() is called on every sign-in attempt.
       * Return the user object on success, null on failure.
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await dbConnect();

        // Explicitly select password (it's excluded by default via `select: false`)
        const user = await User.findOne({ email: credentials.email.toLowerCase() })
          .select("+password");

        if (!user) return null;

        const valid = await user.comparePassword(credentials.password);
        if (!valid) return null;

        // Return a plain object — NextAuth will put this into the JWT
        return {
          id:    user._id.toString(),
          email: user.email,
          name:  user.name,
        };
      },
    }),
  ],

  // ── Session & JWT ──────────────────────────────────────────────────────────
  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    /**
     * jwt callback: called when the JWT is created or updated.
     * We persist the user id into the token so it's available everywhere.
     */
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },

    /**
     * session callback: shapes the session object exposed to the client.
     * We expose token.id as session.user.id.
     */
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id;
      return session;
    },
  },

  // ── Custom pages ──────────────────────────────────────────────────────────
  pages: {
    signIn: "/login",
    error:  "/login", // Redirect auth errors back to login
  },

  // ── Security ──────────────────────────────────────────────────────────────
  secret: process.env.NEXTAUTH_SECRET,

  // Set to true only in production with HTTPS
  useSecureCookies: process.env.NODE_ENV === "production",
};

export default NextAuth(authOptions);
