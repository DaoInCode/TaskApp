import type { Metadata } from "next";

import { getTeamProfiles, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, type ProfileFormProfile } from "./profile-form";
import { TeamDirectory, type TeamMember } from "./team-directory";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [profileResult, team] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, whatsapp_number, callmebot_apikey, notify_whatsapp")
      .eq("id", user.id)
      .single<ProfileFormProfile>(),
    getTeamProfiles(),
  ]);

  const initial: ProfileFormProfile = profileResult.data ?? {
    full_name: null,
    whatsapp_number: null,
    callmebot_apikey: null,
    notify_whatsapp: false,
  };

  const members: TeamMember[] = team;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">
          Manage your account and notification settings.
        </p>
      </div>
      <ProfileForm profile={initial} />
      <TeamDirectory members={members} currentUserId={user.id} />
    </div>
  );
}
