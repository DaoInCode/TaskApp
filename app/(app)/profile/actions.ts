"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState =
  | { ok: true; ts: number }
  | { ok: false; error: string; ts: number }
  | null;

const WHATSAPP_NUMBER_RE = /^\+\d{6,20}$/;

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated.", ts: Date.now() };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const whatsappNumber = String(formData.get("whatsapp_number") ?? "").trim();
  const callmebotApiKey = String(
    formData.get("callmebot_apikey") ?? "",
  ).trim();
  const notifyWhatsapp = formData.get("notify_whatsapp") === "on";

  if (whatsappNumber && !WHATSAPP_NUMBER_RE.test(whatsappNumber)) {
    return {
      ok: false,
      error:
        "WhatsApp number must start with + followed by digits only (no spaces).",
      ts: Date.now(),
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      whatsapp_number: whatsappNumber || null,
      callmebot_apikey: callmebotApiKey || null,
      notify_whatsapp: notifyWhatsapp,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message, ts: Date.now() };
  }

  revalidatePath("/profile");
  return { ok: true, ts: Date.now() };
}
