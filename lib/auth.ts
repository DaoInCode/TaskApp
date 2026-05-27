import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";

// All four helpers below are wrapped in React's cache() so that within a
// single server render pass, multiple callers (layout + page + sub-components)
// share one Promise instead of each issuing their own network call. This is
// a PER-REQUEST cache only — it does not persist across requests, which is
// exactly what we want for auth.

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
});

export const getMyProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
});

// Safe default — selects only fields that are OK to serialize into client
// component props (id, display name, phone number for vCard downloads). Use
// this anywhere the team list might end up in a "use client" tree.
export const getTeamProfiles = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, whatsapp_number")
    .order("full_name");
  return data ?? [];
});

// Server-action use only. Includes callmebot_apikey — never pass result to
// client components.
export const getTeamProfilesWithSecrets = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, whatsapp_number, callmebot_apikey, notify_whatsapp",
    )
    .order("full_name");
  return data ?? [];
});
