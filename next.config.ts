 // next.config.mjs
    /** @type {import('next').NextConfig} */
    const nextConfig = {
      reactStrictMode: true, // Or any other existing configurations
      experimental: {
        serverComponentsExternalPackages: ['pdf-parse'],
      },
    };

    export default nextConfig;