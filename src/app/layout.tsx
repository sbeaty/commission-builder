import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commission Builder",
  description: "Design and simulate sales commission structures",
};

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
