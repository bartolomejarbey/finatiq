import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ advisorId: string }> }
) {
  const { advisorId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: advisor } = await supabase
    .from("advisors")
    .select("app_name, brand_primary, brand_background, logo_url, logo_icon_url")
    .eq("id", advisorId)
    .single();

  const appName = advisor?.app_name || "Finatiq";

  const manifest = {
    name: appName,
    short_name: appName.substring(0, 12),
    start_url: "/portal",
    display: "standalone",
    theme_color: advisor?.brand_primary || "#2563EB",
    background_color: advisor?.brand_background || "#F8FAFC",
    icons: [
      {
        src: advisor?.logo_icon_url || "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: advisor?.logo_url || "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
