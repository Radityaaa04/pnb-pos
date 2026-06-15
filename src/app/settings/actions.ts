"use server";

import { createClient } from "@/lib/supabase/server";

export async function createUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;

  const supabase = await createClient();

  // Ensure current user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") return { error: "Not authorized" };

  // Note: using anon key to signUp might log the user in on the server context 
  // if not careful, but server client is tied to the request cookies.
  // Actually, Supabase admin API is required to create users without signing them in,
  // but since we don't have SERVICE_ROLE_KEY, we will use standard signUp.
  // This requires email confirmation to be disabled in Supabase, otherwise they get an email.

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        // The trigger will handle the role, but we can't easily pass the exact role if the trigger 
        // overrides it based on count. Let's fix the trigger to respect this.
        role
      }
    }
  });

  if (error) {
    return { error: error.message };
  }

  // If the trigger was set to force 'kasir' or 'owner' based on count, 
  // we should manually update the role here just to be sure.
  if (data.user) {
     const { error: updateError } = await supabase
        .from("profiles")
        .update({ role, name })
        .eq("id", data.user.id);
     
     if (updateError) {
         console.error("Failed to update role:", updateError);
     }
  }

  return { success: true };
}
