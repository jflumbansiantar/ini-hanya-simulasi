import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Penumpang TJ",
  description:
    "Game 2D puzzle rute: sampai tujuan tepat waktu dengan bus Transjakarta di atas peta Jakarta asli. Simulasi, bukan data resmi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
