import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, phone, avatar_url")
    .eq("id", user.id)
    .single();

  const isOAuthUser =
    (user.app_metadata?.provider as string | undefined) === "google";

  const initialData = {
    full_name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "",
    email: profile?.email || user.email || "",
    phone: profile?.phone ?? null,
    avatar_url:
      profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal details and contact information.
        </p>
      </div>

      <ProfileForm initialData={initialData} isOAuthUser={isOAuthUser} />
    </div>
  );
}
