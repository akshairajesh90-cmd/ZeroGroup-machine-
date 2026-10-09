import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default function OperatorTemplate({ children }: { children: React.ReactNode }) {
  // Accessing cookies forces Next.js to dynamically render all routes in this layout
  // This prevents build errors during Static Site Generation (SSG) caused by next-auth useSession() in client components
  cookies();
  return <>{children}</>;
}
