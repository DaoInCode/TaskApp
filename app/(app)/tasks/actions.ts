"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "./types";

export type CreateTaskState =
  | { ok: true; ts: number }
  | { ok: false; error: string; ts: number }
  | null;

function revalidateAll() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function createTask(
  _prev: CreateTaskState,
  formData: FormData,
): Promise<CreateTaskState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated.", ts: Date.now() };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { ok: false, error: "Title is required.", ts: Date.now() };
  }

  const description =
    String(formData.get("description") ?? "").trim() || null;

  const assignedToRaw = String(formData.get("assigned_to") ?? "").trim();
  const assigned_to = assignedToRaw || null;

  const priorityRaw = String(formData.get("priority") ?? "medium");
  const priority: TaskPriority = TASK_PRIORITIES.includes(
    priorityRaw as TaskPriority,
  )
    ? (priorityRaw as TaskPriority)
    : "medium";

  const dueDateRaw = String(formData.get("due_date") ?? "").trim();
  const due_date = dueDateRaw || null;

  const { error } = await supabase.from("tasks").insert({
    title,
    description,
    assigned_to,
    assigned_by: user.id,
    priority,
    due_date,
    status: "pending" satisfies TaskStatus,
  });

  if (error) {
    return { ok: false, error: error.message, ts: Date.now() };
  }

  revalidateAll();
  return { ok: true, ts: Date.now() };
}

export type UpdateStatusResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
): Promise<UpdateStatusResult> {
  if (!TASK_STATUSES.includes(newStatus)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  // Only the assignee can change status. Throw (rather than the {ok:false}
  // pattern used by other errors) so the optimistic UI sees a rejected
  // promise and reverts the optimistic update; callers catch the error and
  // surface it as a toast.
  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("assigned_to")
    .eq("id", taskId)
    .single<{ assigned_to: string | null }>();

  if (fetchError || !existing) {
    return { ok: false, error: fetchError?.message ?? "Task not found." };
  }

  if (existing.assigned_to !== user.id) {
    throw new Error("Only the assignee can change this task's status");
  }

  const patch: Record<string, unknown> = { status: newStatus };
  const now = new Date().toISOString();

  if (newStatus === "in_progress") {
    patch.started_at = now;
  } else if (newStatus === "completed") {
    patch.completed_at = now;
  }

  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateAll();
  return { ok: true };
}

export async function claimTask(
  taskId: string,
): Promise<UpdateStatusResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  // Setting assigned_by = assigned_to (both = current user) on self-claims
  // lets the notify_assignee edge function detect and skip self-notifications
  // via the assigner === assignee check.
  //
  // The `.is("assigned_to", null)` guard makes this a race-safe compare-and-set:
  // if two users click claim on the same task simultaneously, only one UPDATE
  // matches a row. The losing call gets 0 rows back and we surface that to
  // the user as "already claimed."
  const { error, count } = await supabase
    .from("tasks")
    .update(
      {
        assigned_to: user.id,
        assigned_by: user.id,
        status: "pending" satisfies TaskStatus,
      },
      { count: "exact" },
    )
    .eq("id", taskId)
    .is("assigned_to", null);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (count === 0) {
    return { ok: false, error: "Already claimed by someone else." };
  }

  revalidateAll();
  return { ok: true };
}

export async function unassignTask(
  taskId: string,
): Promise<UpdateStatusResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  // Drop the task back to the unassigned pool. We clear assigned_by too so
  // the next claimer cleanly becomes both assigner and assignee — matching
  // the self-claim pattern and keeping the edge function's self-skip working.
  // Description and notes are intentionally preserved so work history isn't
  // lost on hand-off.
  //
  // The `.eq("assigned_to", user.id)` guard prevents one user from
  // unassigning a task assigned to someone else; if 0 rows match we report
  // an error rather than silently succeeding.
  const { error, count } = await supabase
    .from("tasks")
    .update(
      {
        assigned_to: null,
        assigned_by: null,
        status: "pending" satisfies TaskStatus,
        started_at: null,
      },
      { count: "exact" },
    )
    .eq("id", taskId)
    .eq("assigned_to", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (count === 0) {
    return {
      ok: false,
      error: "You can only unassign tasks assigned to you.",
    };
  }

  revalidateAll();
  return { ok: true };
}

export async function updateTaskNotes(
  taskId: string,
  notes: string,
): Promise<UpdateStatusResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const trimmed = notes.trim();
  const value = trimmed.length > 0 ? trimmed : null;

  const { error } = await supabase
    .from("tasks")
    .update({ notes: value })
    .eq("id", taskId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateAll();
  return { ok: true };
}
