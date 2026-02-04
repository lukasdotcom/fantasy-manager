/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ["en", "de"],
    defaultLocale: "en",
  },
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 365, // There are no dynamic images used here.
  },
  reactCompiler: true,
};

module.exports = nextConfig;
