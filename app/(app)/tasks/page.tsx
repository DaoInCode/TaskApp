import { getTeamProfiles, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TaskBoard } from "./task-board";
import type { Task, TaskProfile } from "./types";

const TASK_SELECT = `
  id,
  title,
  description,
  notes,
  status,
  priority,
  due_date,
  started_at,
  completed_at,
  created_at,
  assigned_to:profiles!tasks_assigned_to_fkey(id,full_name),
  assigned_by:profiles!tasks_assigned_by_fkey(id,full_name)
`;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  const [tasksResult, team] = await Promise.all([
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("created_at", { ascending: false })
      .returns<Task[]>(),
    getTeamProfiles(),
  ]);

  const allTasks: Task[] = tasksResult.data ?? [];
  const profiles: TaskProfile[] = team;

  // Split client-side once so the board can render two sections without
  // re-filtering on every render. assigned_to is the embedded profile object,
  // which is null when the FK is null.
  const unassignedTasks = allTasks.filter((t) => t.assigned_to == null);
  const assignedTasks = allTasks.filter((t) => t.assigned_to != null);

  const { task: initialOpenTaskId } = await searchParams;

  return (
    <TaskBoard
      assignedTasks={assignedTasks}
      unassignedTasks={unassignedTasks}
      profiles={profiles}
      currentUserId={user.id}
      initialOpenTaskId={initialOpenTaskId ?? null}
    />
  );
}
