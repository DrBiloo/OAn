import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Fonts are read from disk at runtime to render the guestbook PDF in exports.
  outputFileTracingIncludes: {
    "/api/events/*/export": ["./lib/fonts/**/*"],
    "/api/host/events/*/export": ["./lib/fonts/**/*"],
  },
};

export default withNextIntl(nextConfig);
