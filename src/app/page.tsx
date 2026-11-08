import { auth } from "@/lib/auth";
import { getCorporateWebsiteSettings } from "@/actions/websiteSettings";
import PublicLandingClient from "@/components/public/PublicLandingClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, settings] = await Promise.all([
    auth(),
    getCorporateWebsiteSettings(),
  ]);

  return (
    <PublicLandingClient
      sessionUser={
        session?.user
          ? {
              name: session.user.name || session.user.email || "User",
              role: session.user.role,
            }
          : null
      }
      settings={settings}
    />
  );
}
