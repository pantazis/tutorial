import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: "FreeMeditation.gr Advanced Learning",
  description: "Advanced-learning application baseline",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}