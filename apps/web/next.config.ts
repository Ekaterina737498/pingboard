import type { NextConfig } from "next";

// Браузер обращается к /graphql на адресе сайта, а Next.js передаёт запрос в API.
// Поэтому CORS не нужен, а refresh-cookie принадлежит тому же адресу.
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

// На Vercel без адреса API сайт собрался бы, но ни один запрос не работал бы.
if (process.env.VERCEL && !process.env.API_URL) {
  throw new Error("Set the API_URL environment variable in Vercel");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/graphql", destination: `${apiUrl}/graphql` },
      // Вход через Google тоже идёт через адрес сайта: там будет refresh-cookie.
      {
        source: "/auth/google/:path*",
        destination: `${apiUrl}/auth/google/:path*`,
      },
    ];
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
