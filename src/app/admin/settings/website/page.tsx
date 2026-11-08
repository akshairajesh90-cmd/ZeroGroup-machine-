import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { getCorporateWebsiteSettings } from "@/actions/websiteSettings";
import WebsiteSettingsClient from "./WebsiteSettingsClient";

export const dynamic = "force-dynamic";

export default async function WebsiteSettingsPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });
  const settings = await getCorporateWebsiteSettings();

  return <WebsiteSettingsClient initialSettings={settings} />;
}
