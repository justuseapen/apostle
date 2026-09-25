import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { MODE_BOOT_SCRIPT, ModeProvider, ThemeProvider } from "@/lib/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Apostle";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: "WordPress for a chat assistant. Install it, theme it, turn plugins on." },
      { name: "theme-color", content: "#0b0c10" },
      // Optional deploy default for a private customer skin (e.g. content="si").
      { name: "apostle-default-theme", content: "phosphor" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;500;600&family=Poppins:wght@500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&family=VT323&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" data-mode="dark" data-theme="phosphor" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: MODE_BOOT_SCRIPT }} />
      </head>
      <body>
        <PreviewHostBridge />
        <ModeProvider>
          <ThemeProvider>
            <AuthProvider>
              <Outlet />
            </AuthProvider>
          </ThemeProvider>
        </ModeProvider>
        <Scripts />
      </body>
    </html>
  ),
});
