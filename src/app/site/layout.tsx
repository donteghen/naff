import type { Metadata } from "next";
import { getLanguage } from "@/i18n/server";
import { translate } from "@/i18n";

// Customer host: title, description and social preview (WhatsApp, Facebook…) in the visitor's language.
export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const title = translate(language, "meta.title");
  const description = translate(language, "meta.description");
  const image = { url: `/og-${language}.png`, width: 1200, height: 630, alt: title };
  return {
    title: { default: title, template: "%s · NAFF" },
    description,
    manifest: "/site.webmanifest",
    openGraph: { type: "website", siteName: "NAFF", title, description, images: [image], locale: language === "fr" ? "fr_CM" : "en_CM" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default function SiteRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
