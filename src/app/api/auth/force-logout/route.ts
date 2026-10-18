import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  
  const response = NextResponse.redirect(new URL("/?error=SessionExpired", request.url));
  
  for (const cookie of allCookies) {
    if (
      cookie.name.includes("authjs") ||
      cookie.name.includes("next-auth") ||
      cookie.name.includes("session")
    ) {
      response.cookies.delete(cookie.name);
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }
  
  return response;
}
