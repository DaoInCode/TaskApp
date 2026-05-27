import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type TaskRow = {
  id: string;
  title: string;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  whatsapp_number: string | null;
  callmebot_apikey: string | null;
  notify_whatsapp: boolean | null;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: TaskRow | null;
  old_record: TaskRow | null;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const capitalize = (s: string | null | undefined) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

const formatDue = (iso: string | null) => {
  if (!iso) return "No deadline";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No deadline";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
};

Deno.serve(async (req) => {
  let assigneeEmail: string | null = null;
  try {
    const payload = (await req.json()) as WebhookPayload;
    const { type, record, old_record } = payload;

    if (type === "DELETE") {
      return json(200, { ok: true, action: "skipped", reason: "delete event", assignee: null });
    }

    if (!record) {
      return json(200, { ok: true, action: "skipped", reason: "no record", assignee: null });
    }

    if (type === "INSERT") {
      if (!record.assigned_to) {
        return json(200, {
          ok: true,
          action: "skipped",
          reason: "unassigned on insert",
          assignee: null,
        });
      }
    } else if (type === "UPDATE") {
      const prev = old_record?.assigned_to ?? null;
      const next = record.assigned_to ?? null;
      if (prev === next) {
        return json(200, {
          ok: true,
          action: "skipped",
          reason: "assignee unchanged",
          assignee: null,
        });
      }
      if (!next) {
        return json(200, {
          ok: true,
          action: "skipped",
          reason: "unassigned on update",
          assignee: null,
        });
      }
    } else {
      return json(200, {
        ok: true,
        action: "skipped",
        reason: `unhandled event ${type}`,
        assignee: null,
      });
    }

    if (record.assigned_by && record.assigned_by === record.assigned_to) {
      return json(200, {
        ok: true,
        action: "skipped",
        reason: "self-assigned",
        assignee: null,
      });
    }

    // Belt-and-suspenders for the self-unassign path (UPDATE with
    // old.assigned_to = user, new.assigned_to = null) and any other path
    // that lands at a null assignee. Without this we'd try to look up a
    // profile with id=null and either error or send a confusing skip log.
    if (record.assigned_to === null) {
      return json(200, {
        ok: true,
        action: "skipped",
        reason: "unassigned (no recipient)",
        assignee: null,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl = Deno.env.get("APP_URL");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return json(200, {
        ok: false,
        action: "failed",
        reason: "missing supabase env",
        assignee: null,
      });
    }
    if (!appUrl) {
      console.error("Missing APP_URL");
      return json(200, { ok: false, action: "failed", reason: "missing APP_URL", assignee: null });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: assignee, error: assigneeErr } = await supabase
      .from("profiles")
      .select("id,email,full_name,whatsapp_number,callmebot_apikey,notify_whatsapp")
      .eq("id", record.assigned_to)
      .single<Profile>();

    if (assigneeErr || !assignee) {
      console.error("Failed to load assignee profile", assigneeErr);
      return json(200, {
        ok: false,
        action: "failed",
        reason: "assignee profile not found",
        assignee: null,
      });
    }
    assigneeEmail = assignee.email;

    let assignerName = "Someone";
    if (record.assigned_by) {
      const { data: assigner } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .eq("id", record.assigned_by)
        .single<Pick<Profile, "id" | "full_name" | "email">>();
      if (assigner) {
        assignerName = assigner.full_name || assigner.email || "Someone";
      }
    }

    const eligible =
      assignee.notify_whatsapp === true &&
      typeof assignee.whatsapp_number === "string" &&
      assignee.whatsapp_number.trim() !== "" &&
      typeof assignee.callmebot_apikey === "string" &&
      assignee.callmebot_apikey.trim() !== "";

    if (!eligible) {
      console.log(`skipped: no whatsapp setup for ${assignee.email}`);
      return json(200, {
        ok: true,
        action: "skipped",
        reason: "no whatsapp setup",
        assignee: assignee.email,
      });
    }

    const message =
      `📋 *New task assigned*\n` +
      `From: ${assignerName}\n` +
      `\n` +
      `*${record.title}*\n` +
      `\n` +
      `🎯 Priority: ${capitalize(record.priority)}\n` +
      `📅 Due: ${formatDue(record.due_date)}\n` +
      `\n` +
      `👉 View task: ${appUrl}/tasks?task=${record.id}`;

    const phone = (assignee.whatsapp_number ?? "").trim().replace(/^\+/, "");
    const url =
      `https://api.callmebot.com/whatsapp.php` +
      `?phone=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(message)}` +
      `&apikey=${encodeURIComponent(assignee.callmebot_apikey ?? "")}`;

    const res = await fetch(url, { cache: "no-store" });
    const body = await res.text();
    console.log(`CallMeBot status=${res.status} body=${body}`);

    if (!res.ok) {
      return json(200, {
        ok: false,
        action: "failed",
        reason: `callmebot http ${res.status}`,
        assignee: assignee.email,
      });
    }

    return json(200, {
      ok: true,
      action: "sent",
      reason: "ok",
      assignee: assignee.email,
    });
  } catch (err) {
    console.error("notify_assignee error", err);
    return json(200, {
      ok: false,
      action: "failed",
      reason: err instanceof Error ? err.message : "unknown error",
      assignee: assigneeEmail,
    });
  }
});
