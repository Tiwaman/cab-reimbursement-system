import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

type AppToken = JWT & {
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  error?: string;
};

type RefreshTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      const appToken = token as AppToken;

      if (account && user) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_at || 0) * 1000,
          refreshToken: account.refresh_token,
          user,
        };
      }

      // Return previous token if the access token has not expired yet
      if (
        typeof appToken.accessTokenExpires === "number" &&
        Date.now() < appToken.accessTokenExpires
      ) {
        return token;
      }

      // Access token has expired, try to update it
      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: appToken.refreshToken ?? "",
          }),
          method: "POST",
        });

        const tokens = (await response.json()) as RefreshTokenResponse;

        if (
          !response.ok ||
          !tokens.access_token ||
          typeof tokens.expires_in !== "number"
        ) {
          throw new Error("Failed to refresh access token");
        }

        return {
          ...token,
          accessToken: tokens.access_token,
          accessTokenExpires: Date.now() + tokens.expires_in * 1000,
          refreshToken: tokens.refresh_token ?? appToken.refreshToken, // Fallback to old refresh token
        };
      } catch (error) {
        console.error("RefreshAccessTokenError", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      const appToken = token as AppToken;
      const sessionWithAccessToken = session as typeof session & {
        accessToken?: string;
      };
      sessionWithAccessToken.accessToken = appToken.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
};
