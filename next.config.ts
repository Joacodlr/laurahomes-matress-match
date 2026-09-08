import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// This file's own directory — the real project root. Pinning it stops Turbopack
// from inferring the parent folder as the root when a stray lockfile exists
// above us (see the "inferred your workspace root" dev warning).
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
