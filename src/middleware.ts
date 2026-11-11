// Edge route guard - ZERO GROUP
import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Matcher ignoring static files, images, favicon, robots, sitemap, and api/auth routes
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icons|manifest.json|robots.txt|sitemap.xml|.*\\.(?:xml|txt|ico|png|jpg|jpeg|svg|webp)$).*)",
  ],
};
