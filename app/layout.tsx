import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transjakarta Line Simulator",
  description:
    "Simulasi visual pergerakan bus Transjakarta di 13 koridor trunk BRT di atas peta Jabodetabek — bukan pelacak real-time resmi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
