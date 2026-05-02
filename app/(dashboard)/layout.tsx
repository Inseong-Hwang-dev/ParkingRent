import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { GoogleMapsProvider } from "@/components/providers/google-maps-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, avatar_url, email")
    .eq("id", authUser.id)
    .single();

  // Fall back to auth metadata if the profile row hasn't been created yet
  const user = {
    full_name:
      profile?.full_name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split("@")[0] ||
      "User",
    avatar_url: profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null,
    email: profile?.email || authUser.email || "",
  };

  return (
    <GoogleMapsProvider>
      <DashboardShell user={user}>{children}</DashboardShell>
    </GoogleMapsProvider>
  );
}
