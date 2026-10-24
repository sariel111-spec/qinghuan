import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") || incoming.get("host") || "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: "一枕清欢 · 梦中私藏",
    description: "收藏故事、灵感与传讯的古风梦向私密天地。",
    openGraph: { title: "一枕清欢", description: "山长水远，落笔皆为相逢", images: [`${origin}/og.png`] },
    twitter: { card: "summary_large_image", title: "一枕清欢", description: "山长水远，落笔皆为相逢", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
