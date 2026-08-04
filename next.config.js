/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'down-id.img.susercontent.com' },
      { protocol: 'https', hostname: 'pdcgudang.et.r.appspot.com' },
    ],
  },
};

module.exports = nextConfig;
