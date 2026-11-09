import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 중 같은 Wi-Fi 의 휴대폰(192.168.x.x)이 참여자로 접속할 수 있게 허용한다 (운영 빌드에는 영향 없음)
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
