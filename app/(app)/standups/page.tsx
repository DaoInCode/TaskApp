import { redirect } from "next/navigation";
import { format } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { StandupsPage } from "./standups-page";
import type { Standup, StandupProfile } from "./types";

const STANDUP_SELECT = `
  id,
  standup_date,
  summary,
  blockers,
  happened,
  logged_by,
  created_at,
  attendees:standup_attendees(profile:profiles(id, full_name))
`;

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const [standupsRes, profilesRes, todayRes] = await Promise.all([
    supabase
      .from("standups")
      .select(STANDUP_SELECT)
      .order("standup_date", { ascending: false })
      .returns<Standup[]>(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name", { ascending: true })
      .returns<StandupProfile[]>(),
    supabase
      .from("standups")
      .select(STANDUP_SELECT)
      .eq("standup_date", todayKey)
      .maybeSingle<Standup>(),
  ]);

  const standups = standupsRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const todayStandup = todayRes.data ?? null;
  const existingDates = standups.map((s) => s.standup_date);

  return (
    <StandupsPage
      standups={standups}
      profiles={profiles}
      todayStandup={todayStandup}
      todayKey={todayKey}
      existingDates={existingDates}
    />
  );
}
