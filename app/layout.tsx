import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "voiceagent.strategyos.live";
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const origin = `${protocol}://${host}`;

  return {
    title: "Agent Studio 2027 — Interactive UX Prototype",
    description:
      "A working vision for outcome-first AI agent creation: build first, ask only what cannot be inferred.",
    openGraph: {
      title: "Your Voice AI Agent",
      description:
        "Explore an outcome-first agent studio with evidence, live testing, and conversational refinement.",
      type: "website",
      url: origin,
      images: [{ url: `${origin}/og.png`, width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Your Voice AI Agent",
      description: "The 2027 alternative to setup wizards.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
