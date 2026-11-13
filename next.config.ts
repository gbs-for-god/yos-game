import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 서버를 0.0.0.0에 바인딩하고, 같은 Wi-Fi 휴대폰의 개발 요청을 허용한다 (운영 빌드에는 영향 없음)
  allowedDevOrigins: ["192.168.*.*"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
