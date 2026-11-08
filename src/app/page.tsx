import { auth } from "@/lib/auth";
import { getCorporateWebsiteSettings } from "@/actions/websiteSettings";
import PublicLandingClient from "@/components/public/PublicLandingClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, settings] = await Promise.all([
    auth(),
    getCorporateWebsiteSettings(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: settings.storeName || "ZERO GROUP Heavy Machinery & Equipment Rentals",
    alternateName: "Zero Group Machinery Rentals",
    description:
      settings.heroSubheadline ||
      "Commercial concrete mixers, vertical material hoists, needle vibrator rigs, and de-watering pumps on hire across Kerala.",
    url: "https://zero-group-machine.vercel.app",
    telephone: settings.companyPhone || "+91 94470 00000",
    email: settings.companyEmail || "operations@zerogroup.in",
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.storeAddress || "Pala - Ponkunnam Road",
      addressLocality: "Kottayam",
      addressRegion: "Kerala",
      postalCode: "686575",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: settings.storeLatitude || 9.5916,
      longitude: settings.storeLongitude || 76.5222,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "06:00",
        closes: "21:00",
      },
    ],
    priceRange: "₹₹",
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Kerala",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
    </>
  );
}
