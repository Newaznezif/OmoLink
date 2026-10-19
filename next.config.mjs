/** @type {import('next').NextConfig} */
const nextConfig = {
  // A production build and `next dev` both write to `.next` by default, and the
  // second one to touch it leaves the other requiring chunks that no longer
  // exist (Cannot find module './vendor-chunks/...'). Point verification builds
  // somewhere else with NEXT_DIST_DIR; unset keeps the standard `.next`.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' }
        ]
      }
    ];
  }
};

export default nextConfig;
