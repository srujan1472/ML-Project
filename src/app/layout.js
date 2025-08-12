import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  applicationName: "Project App",
  title: {
    default: "Project App",
    template: "%s | Project App",
  },
  description: "An installable PWA built with Next.js",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Project App",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "Project App",
    title: {
      default: "Project App",
      template: "%s | Project App",
    },
    description: "An installable PWA built with Next.js",
  },
  twitter: {
    card: "summary",
    title: {
      default: "Project App",
      template: "%s | Project App",
    },
    description: "An installable PWA built with Next.js",
  },
};

export const viewport = {
  themeColor: "#111827",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
