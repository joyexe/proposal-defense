/** @type {import('next').NextConfig} */
const nextConfig = {};

export default {
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};
