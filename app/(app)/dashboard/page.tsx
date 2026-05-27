import { formatDistanceToNow, parseISO } from "date-fns";

import { getTeamProfiles, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  avatarColorForId,
  initialFor,
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  type TaskPriority,
} from "@/app/(app)/tasks/types";
import { MyTasksList, type MyTask } from "./my-tasks-list";

type Profile = { id: string; full_name: string | null };

type InProgressTask = {
  id: string;
  title: string;
  priority: TaskPriority;
  assigned_to: Profile | null;
};

type CompletedTask = {
  id: string;
  title: string;
  completed_at: string;
  assigned_to: Profile | null;
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [team, inProgressRes, myTasksRes, completedRes] = await Promise.all([
    getTeamProfiles(),
    supabase
      .from("tasks")
      .select(
        "id, title, priority, assigned_to:profiles!tasks_assigned_to_fkey(id, full_name)",
      )
      .eq("status", "in_progress")
      .returns<InProgressTask[]>(),
    supabase
      .from("tasks")
      .select("id, title, status, priority")
      .eq("assigned_to", user.id)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .returns<MyTask[]>(),
    supabase
      .from("tasks")
      .select(
        "id, title, completed_at, assigned_to:profiles!tasks_assigned_to_fkey(id, full_name)",
      )
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(10)
      .returns<CompletedTask[]>(),
  ]);

  const profiles: Profile[] = team;
  const inProgress = inProgressRes.data ?? [];
  const myTasks = myTasksRes.data ?? [];
  const completed = completedRes.data ?? [];

  const inProgressByMember = new Map<string, InProgressTask[]>();
  for (const task of inProgress) {
    const memberId = task.assigned_to?.id;
    if (!memberId) continue;
    const bucket = inProgressByMember.get(memberId) ?? [];
    bucket.push(task);
    inProgressByMember.set(memberId, bucket);
  }

  return (
    <div className="flex flex-col">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Live board
        </h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-slate-500">No team members yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((member) => {
              const memberTasks = inProgressByMember.get(member.id) ?? [];
              const memberName =
                member.full_name?.trim() || "Unnamed teammate";
              return (
                <MemberCard
                  key={member.id}
                  memberId={member.id}
                  memberName={memberName}
                  tasks={memberTasks}
                />
              );
            })}
          </div>
        )}
      </section>

      <hr className="my-8 border-t border-slate-200" />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">My tasks</h2>
        <MyTasksList tasks={myTasks} />
      </section>

      <hr className="my-8 border-t border-slate-200" />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Recently completed
        </h2>
        {completed.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing completed yet.</p>
        ) : (
          <ul className="flex flex-col">
            {completed.map((task) => {
              const name =
                task.assigned_to?.full_name?.trim() || "Unassigned";
              const when = formatDistanceToNow(parseISO(task.completed_at), {
                addSuffix: true,
              });
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      avatarColorForId(task.assigned_to?.id ?? null),
                    )}
                    title={name}
                  >
                    {initialFor(task.assigned_to?.full_name)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-slate-900">
                      {task.title}
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      {name} · completed {when}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MemberCard({
  memberId,
  memberName,
  tasks,
}: {
  memberId: string;
  memberName: string;
  tasks: InProgressTask[];
}) {
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
            avatarColorForId(memberId),
          )}
        >
          {initialFor(memberName)}
        </span>
        <span className="truncate text-sm font-medium text-slate-900">
          {memberName}
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400">Available</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start justify-between gap-2"
            >
              <span className="line-clamp-2 flex-1 text-sm text-slate-700">
                {task.title}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium",
                  PRIORITY_CLASSES[task.priority],
                )}
              >
                {PRIORITY_LABELS[task.priority]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
