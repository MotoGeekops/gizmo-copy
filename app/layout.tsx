import type { Metadata, Viewport } from "next";
import "./recallforge.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "RecallForge · Study smarter. Remember longer.",
  description:
    "Your private space for active recall, thoughtful practice, and lasting knowledge.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/type/DM-Sans.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="/katex.min.css" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
