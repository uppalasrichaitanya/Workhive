import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workhive | Find your next move",
  description: "A focused job search for technology and startup roles across India.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
