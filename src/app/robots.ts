import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: [
          "/admin/",
          "/owner/",
          "/staff/",
          "/driver/",
          "/operator/",
          "/api/",
          "/redirecting",
        ],
      },
    ],
    sitemap: "https://zero-group-machine.vercel.app/sitemap.xml",
  };
}
