import type { NextConfig } from "next";

function supabaseStorageRemotePattern():
  | { protocol: "https"; hostname: string; pathname: string }
  | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return undefined;
  try {
    const hostname = new URL(url).hostname;
    return {
      protocol: "https",
      hostname,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return undefined;
  }
}

const supabasePattern = supabaseStorageRemotePattern();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (listing photos)
      ...(supabasePattern ? [supabasePattern] : []),
      // Google OAuth avatars (lh3.googleusercontent.com)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // Resend email asset CDN
      {
        protocol: "https",
        hostname: "*.resend.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
