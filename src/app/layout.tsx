import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pathforge — Learn. Quest. Master.",
    template: "%s · Pathforge",
  },
  description:
    "Pathforge is a gamified learning platform. Progress through skill trees, complete quests, defeat boss assessments, and build a personal world of knowledge.",
  applicationName: "Pathforge",
  keywords: ["learning", "gamification", "skill tree", "xp", "roadmap"],
  authors: [{ name: "Pathforge" }],
  openGraph: {
    title: "Pathforge — Learn. Quest. Master.",
    description:
      "A gamified learning RPG platform with skill trees, quests, boss battles, and mastery tracking.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0c10" },
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem("pathforge-theme")||"dark";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain min-h-dvh">{children}</body>
    </html>
  );
}
