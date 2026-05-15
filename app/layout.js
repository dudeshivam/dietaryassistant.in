import "./globals.css";
import { LegalFooter } from "@/components/legal-content";

export const metadata = {
  title: "Dietary Assistant",
  description: "AI-assisted personalized diet guidance"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <LegalFooter />
      </body>
    </html>
  );
}
