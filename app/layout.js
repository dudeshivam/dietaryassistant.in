import "./globals.css";

export const metadata = {
  title: "Dietary Assistant",
  description: "AI-powered daily Indian diet plans"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
