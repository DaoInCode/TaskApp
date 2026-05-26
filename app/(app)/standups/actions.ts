"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { BroadcastResult } from "./types";

export type LogStandupState =
  | { ok: true; ts: number }
  | { ok: false; error: string; ts: number }
  | null;

export async function logStandup(
  _prev: LogStandupState,
  formData: FormData,
): Promise<LogStandupState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated.", ts: Date.now() };
  }

  const standupDate = String(formData.get("standup_date") ?? "").trim();
  if (!standupDate) {
    return { ok: false, error: "Date is required.", ts: Date.now() };
  }

  const happened = formData.get("happened") === "on";
  const summary = String(formData.get("summary") ?? "").trim();
  const blockers = String(formData.get("blockers") ?? "").trim() || null;

  if (happened && summary.length < 10) {
    return {
      ok: false,
      error: "Summary must be at least 10 characters.",
      ts: Date.now(),
    };
  }

  const { data: standup, error: standupError } = await supabase
    .from("standups")
    .insert({
      standup_date: standupDate,
      happened,
      summary: happened ? summary : null,
      blockers: happened ? blockers : null,
      logged_by: user.id,
    })
    .select("id")
    .single();

  if (standupError || !standup) {
    return {
      ok: false,
      error: standupError?.message ?? "Failed to create standup.",
      ts: Date.now(),
    };
  }

  if (happened) {
    const attendeeIds = formData
      .getAll("attendees")
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);

    if (attendeeIds.length > 0) {
      const rows = attendeeIds.map((profileId) => ({
        standup_id: standup.id,
        profile_id: profileId,
      }));
      const { error: attendeesError } = await supabase
        .from("standup_attendees")
        .insert(rows);

      if (attendeesError) {
        // Roll back the standup row so we don't leave an orphan.
        await supabase.from("standups").delete().eq("id", standup.id);
        return {
          ok: false,
          error: `Attendees insert failed: ${attendeesError.message}`,
          ts: Date.now(),
        };
      }
    }
  }

  revalidatePath("/standups");
  revalidatePath("/dashboard");
  return { ok: true, ts: Date.now() };
}

export type StartMeetingResult =
  | { ok: true; result: BroadcastResult }
  | { ok: false; error: string };

type BroadcastProfile = {
  id: string;
  full_name: string | null;
  whatsapp_number: string | null;
  callmebot_apikey: string | null;
  notify_whatsapp: boolean | null;
};

export async function startMeeting(
  meetLink: string,
  note: string,
): Promise<StartMeetingResult> {
  const link = meetLink.trim();
  if (!link) {
    return { ok: false, error: "Meeting link is required." };
  }
  try {
    // Throws on malformed URLs.
    new URL(link);
  } catch {
    return { ok: false, error: "Meeting link must be a valid URL." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single<{ full_name: string | null }>();

  const fromName = currentProfile?.full_name?.trim() || "Someone";

  const { data: others } = await supabase
    .from("profiles")
    .select(
      "id, full_name, whatsapp_number, callmebot_apikey, notify_whatsapp",
    )
    .neq("id", user.id)
    .returns<BroadcastProfile[]>();

  const allOthers = others ?? [];

  const eligible = allOthers.filter(
    (p) =>
      p.notify_whatsapp === true &&
      p.whatsapp_number != null &&
      p.whatsapp_number.trim().length > 0 &&
      p.callmebot_apikey != null &&
      p.callmebot_apikey.trim().length > 0,
  );

  const skipped = allOthers.length - eligible.length;

  const lines = [`🎥 ${fromName} is starting standup now`];
  const trimmedNote = note.trim();
  if (trimmedNote) lines.push(trimmedNote);
  lines.push(`Join: ${link}`);
  const message = lines.join("\n");
  const encoded = encodeURIComponent(message);

  const settled = await Promise.allSettled(
    eligible.map(async (p) => {
      const number = p.whatsapp_number!.trim().replace(/^\+/, "");
      const apikey = p.callmebot_apikey!.trim();
      const url = `https://api.callmebot.com/whatsapp.php?phone=${number}&text=${encoded}&apikey=${encodeURIComponent(apikey)}`;
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if (!res.ok) {
        throw new Error(`status ${res.status}`);
      }
      return true;
    }),
  );

  let sent = 0;
  let failed = 0;
  for (const r of settled) {
    if (r.status === "fulfilled") sent += 1;
    else failed += 1;
  }

  return { ok: true, result: { sent, failed, skipped } };
}
