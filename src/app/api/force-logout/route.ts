import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  cookieStore.delete("next-auth.session-token");
  cookieStore.delete("__Secure-next-auth.session-token");
  cookieStore.delete("next-auth.csrf-token");
  cookieStore.delete("__Host-next-auth.csrf-token");
  cookieStore.delete("next-auth.callback-url");
  
  return NextResponse.redirect(new URL("/", "http://localhost:3000"));
}
