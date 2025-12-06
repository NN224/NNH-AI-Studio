import { Metadata } from "next";

export const landingMetadata: Metadata = {
  title: "NNH AI Studio - AI-Powered Business Management Platform",
  description:
    "Automate reviews, manage multiple locations, and grow your business with AI-powered insights. Trusted by 10,000+ businesses worldwide.",
  keywords: [
    "AI business management",
    "Google Business Profile",
    "review management",
    "AI automation",
    "multi-location management",
    "business analytics",
    "AI reviews",
    "customer engagement",
  ],
  authors: [{ name: "NNH AI Studio" }],
  creator: "NNH AI Studio",
  publisher: "NNH AI Studio",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ar_SA"],
    url: "https://nnh.ae",
    title: "NNH AI Studio - AI-Powered Business Management",
    description:
      "Automate reviews, manage multiple locations, and grow your business with AI-powered insights.",
    siteName: "NNH AI Studio",
    images: [
      {
        url: "/modern-dark-dashboard-interface-with-charts-and-an.jpg",
        width: 1200,
        height: 630,
        alt: "NNH AI Studio Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NNH AI Studio - AI-Powered Business Management",
    description:
      "Automate reviews, manage multiple locations, and grow your business with AI-powered insights.",
    images: ["/modern-dark-dashboard-interface-with-charts-and-an.jpg"],
    creator: "@nnhstudio",
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },
  alternates: {
    canonical: "https://nnh.ae",
    languages: {
      en: "https://nnh.ae/en",
      ar: "https://nnh.ae/ar",
    },
  },
};

export function LandingJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NNH AI Studio",
    url: "https://nnh.ae",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "199",
      offerCount: "3",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "10000",
      bestRating: "5",
      worstRating: "1",
    },
    description:
      "AI-powered business management platform for automating reviews, managing multiple locations, and growing your business.",
    features: [
      "AI-powered review responses",
      "Multi-location management",
      "Real-time analytics",
      "YouTube integration",
      "Automated comment management",
    ],
    author: {
      "@type": "Organization",
      name: "NNH AI Studio",
      url: "https://nnh.ae",
    },
    publisher: {
      "@type": "Organization",
      name: "NNH AI Studio",
      url: "https://nnh.ae",
    },
  };

  // JSON-LD is pure JSON data - no HTML sanitization needed
  // JSON.stringify already escapes special characters safely
  // We just need to ensure no script injection via closing tags
  const jsonString = JSON.stringify(jsonLd)
    // Escape any potential script closing tags in the JSON
    .replace(/<\/script/gi, "<\\/script");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
