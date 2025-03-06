const { withContentCollections } = require("@content-collections/next");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed rewrites configuration as we're using path-based routing now
};

module.exports = withContentCollections(nextConfig);