"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your profile." };
  }

  const fullName = (formData.get("full_name") as string | null)?.trim();
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const avatarFile = formData.get("avatar") as File | null;

  if (!fullName) {
    return { error: "Full name is required." };
  }

  let avatarUrl: string | undefined;

  // Upload avatar if a new file was provided
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 2 * 1024 * 1024) {
      return { error: "Avatar image must be under 2 MB." };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(avatarFile.type)) {
      return { error: "Avatar must be a JPEG, PNG, or WebP image." };
    }

    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    const storagePath = `avatars/${user.id}/avatar.${ext}`;
    const arrayBuffer = await avatarFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, arrayBuffer, {
        contentType: avatarFile.type,
        upsert: true,
      });

    if (uploadError) {
      return { error: `Avatar upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(storagePath);

    avatarUrl = urlData.publicUrl;
  }

  const updates: UserUpdate = {
    full_name: fullName,
    phone,
    updated_at: new Date().toISOString(),
    ...(avatarUrl !== undefined && { avatar_url: avatarUrl }),
  };

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function changePassword(formData: FormData) {
  const currentPassword = (formData.get("current_password") as string | null)?.trim();
  const newPassword = (formData.get("new_password") as string | null)?.trim();

  if (!currentPassword || !newPassword) {
    return { error: "Both fields are required." };
  }
  if (newPassword.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "You must be signed in to change your password." };
  }

  // Re-authenticate to verify the current password before updating.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
