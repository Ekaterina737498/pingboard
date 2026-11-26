import type { NextConfig } from "next";

// Браузер обращается к /graphql на адресе сайта, а Next.js передаёт запрос в API.
// Поэтому CORS не нужен, а refresh-cookie принадлежит тому же адресу.
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/graphql", destination: `${apiUrl}/graphql` }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
