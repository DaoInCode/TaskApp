import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO, startOfWeek } from "date-fns";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  avatarColorForId,
  initialFor,
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  type TaskPriority,
} from "@/app/(app)/tasks/types";

type Profile = { id: string; full_name: string | null };

type CompletedTask = {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  completed_at: string;
  assigned_to: Profile | null;
};

type InProgressTask = {
  id: string;
  title: string;
  priority: TaskPriority;
  assigned_to: Profile | null;
};

type AttendeeRow = {
  profile_id: string;
  standups: { happened: boolean } | null;
};

type LeaderboardEntry = {
  profile: Profile;
  tasks_completed: number;
  standups_attended: number;
  total: number;
};

function weekKey(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function rankColor(index: number): string {
  if (index === 0) return "text-amber-500";
  if (index === 1) return "text-slate-400";
  if (index === 2) return "text-amber-700";
  return "text-slate-500";
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Four total queries on this page. The leaderboard counting uses three of
  // them (profiles + completed tasks + attendee/standup join); in_progress
  // tasks is a separate dataset for the "Currently working on" section.
  // The completed tasks query is shared with the weekly grouping below.
  const [profilesRes, completedRes, attendeesRes, inProgressRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name", { ascending: true })
        .returns<Profile[]>(),
      supabase
        .from("tasks")
        .select(
          "id, title, description, notes, completed_at, assigned_to:profiles!tasks_assigned_to_fkey(id, full_name)",
        )
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .returns<CompletedTask[]>(),
      // !inner join + happened filter so we only count attendance of standups
      // that actually happened. Skipped standups don't add to the score.
      supabase
        .from("standup_attendees")
        .select("profile_id, standups!inner(happened)")
        .eq("standups.happened", true)
        .returns<AttendeeRow[]>(),
      supabase
        .from("tasks")
        .select(
          "id, title, priority, assigned_to:profiles!tasks_assigned_to_fkey(id, full_name)",
        )
        .eq("status", "in_progress")
        .returns<InProgressTask[]>(),
    ]);

  const profiles = profilesRes.data ?? [];
  const completedTasks = completedRes.data ?? [];
  const attendees = attendeesRes.data ?? [];
  const inProgressTasks = inProgressRes.data ?? [];

  // Aggregate completed tasks per assignee.
  const tasksCompletedByProfile = new Map<string, number>();
  for (const task of completedTasks) {
    const id = task.assigned_to?.id;
    if (!id) continue;
    tasksCompletedByProfile.set(
      id,
      (tasksCompletedByProfile.get(id) ?? 0) + 1,
    );
  }

  // Aggregate standup attendance per profile (already filtered to happened=true).
  const standupsAttendedByProfile = new Map<string, number>();
  for (const row of attendees) {
    standupsAttendedByProfile.set(
      row.profile_id,
      (standupsAttendedByProfile.get(row.profile_id) ?? 0) + 1,
    );
  }

  const leaderboard: LeaderboardEntry[] = profiles
    .map((p) => {
      const tasks_completed = tasksCompletedByProfile.get(p.id) ?? 0;
      const standups_attended = standupsAttendedByProfile.get(p.id) ?? 0;
      return {
        profile: p,
        tasks_completed,
        standups_attended,
        total: tasks_completed + standups_attended,
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total || b.tasks_completed - a.tasks_completed,
    );

  // Group in_progress tasks by assignee for the "Currently working on" section.
  const inProgressByProfile = new Map<
    string,
    { profile: Profile; tasks: InProgressTask[] }
  >();
  for (const task of inProgressTasks) {
    if (!task.assigned_to) continue;
    const id = task.assigned_to.id;
    const bucket = inProgressByProfile.get(id);
    if (bucket) {
      bucket.tasks.push(task);
    } else {
      inProgressByProfile.set(id, {
        profile: task.assigned_to,
        tasks: [task],
      });
    }
  }
  const peopleWithInProgress = Array.from(inProgressByProfile.values()).sort(
    (a, b) =>
      (a.profile.full_name ?? "").localeCompare(b.profile.full_name ?? ""),
  );

  // Group completed tasks by ISO week (Monday-start) for the existing list.
  const buckets = new Map<
    string,
    { weekStart: Date; tasks: CompletedTask[] }
  >();
  for (const task of completedTasks) {
    const completedAt = parseISO(task.completed_at);
    const weekStart = startOfWeek(completedAt, { weekStartsOn: 1 });
    const key = weekKey(completedAt);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.tasks.push(task);
    } else {
      buckets.set(key, { weekStart, tasks: [task] });
    }
  }
  const groups = Array.from(buckets.values());

  const showLeaderboard = leaderboard.length > 0;
  const showCurrentlyWorking = peopleWithInProgress.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">History</h1>
        <p className="text-sm text-slate-500">
          Team activity and completed work.
        </p>
      </div>

      {showLeaderboard && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Leaderboard
          </h2>
          <ol className="flex flex-col gap-2">
            {leaderboard.map((entry, i) => (
              <li
                key={entry.profile.id}
                className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3"
              >
                <span
                  className={cn(
                    "w-6 shrink-0 text-center text-sm font-bold tabular-nums",
                    rankColor(i),
                  )}
                  aria-label={`Rank ${i + 1}`}
                >
                  {i + 1}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    avatarColorForId(entry.profile.id),
                  )}
                >
                  {initialFor(entry.profile.full_name)}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-slate-900">
                  {entry.profile.full_name?.trim() || "Unnamed teammate"}
                </span>
                <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {entry.tasks_completed} tasks
                </span>
                <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {entry.standups_attended} standups
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {showCurrentlyWorking && (
        <section
          className={cn(
            showLeaderboard && "my-8 border-t border-slate-200 pt-8",
          )}
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Currently working on
          </h2>
          <div className="flex flex-col gap-3">
            {peopleWithInProgress.map(({ profile, tasks }) => (
              <div
                key={profile.id}
                className="rounded-md border border-slate-200 bg-white px-4 py-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      avatarColorForId(profile.id),
                    )}
                  >
                    {initialFor(profile.full_name)}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {profile.full_name?.trim() || "Unnamed teammate"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks?task=${t.id}`}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <span className="max-w-[240px] truncate">{t.title}</span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                          PRIORITY_CLASSES[t.priority],
                        )}
                      >
                        {PRIORITY_LABELS[t.priority]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        className={cn(
          (showLeaderboard || showCurrentlyWorking) &&
            "my-8 border-t border-slate-200 pt-8",
        )}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Completed by week
        </h2>
        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-slate-500">
              Nothing here yet. Completed tasks will show up grouped by week.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {groups.map((group, idx) => (
              <div
                key={group.weekStart.toISOString()}
                className={cn(idx > 0 && "my-8 border-t border-slate-200 pt-8")}
              >
                <h3 className="mb-4 text-base font-semibold text-slate-900">
                  Week of {format(group.weekStart, "MMM d, yyyy")}
                </h3>
                <Accordion
                  type="multiple"
                  className="rounded-lg border border-slate-200 bg-white px-4"
                >
                  {group.tasks.map((task) => {
                    const name =
                      task.assigned_to?.full_name?.trim() || "Unassigned";
                    const completedDate = format(
                      parseISO(task.completed_at),
                      "MMM d, yyyy",
                    );
                    const hasBody =
                      (task.description != null &&
                        task.description.trim().length > 0) ||
                      (task.notes != null && task.notes.trim().length > 0);
                    return (
                      <AccordionItem key={task.id} value={task.id}>
                        <AccordionTrigger>
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                                avatarColorForId(
                                  task.assigned_to?.id ?? null,
                                ),
                              )}
                              title={name}
                            >
                              {initialFor(task.assigned_to?.full_name)}
                            </span>
                            <span className="truncate text-sm font-medium text-slate-900">
                              {task.title}
                            </span>
                            <span className="ml-auto shrink-0 text-xs text-slate-500">
                              {name} · {completedDate}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {hasBody ? (
                            <div className="flex flex-col gap-3 pl-10">
                              {task.description?.trim() && (
                                <div>
                                  <p className="mb-1 text-xs font-medium text-slate-500 uppercase">
                                    Description
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                                    {task.description}
                                  </p>
                                </div>
                              )}
                              {task.notes?.trim() && (
                                <div>
                                  <p className="mb-1 text-xs font-medium text-slate-500 uppercase">
                                    Notes
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                                    {task.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="pl-10 text-sm text-slate-400">
                              No description or notes.
                            </p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
