"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { claimTask, unassignTask, updateTaskStatus } from "./actions";
import { NewTaskDialog } from "./new-task-dialog";
import { TaskCard } from "./task-card";
import { TaskDetailDialog } from "./task-detail-dialog";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskProfile,
  type TaskStatus,
} from "./types";

type StatusFilter = TaskStatus | "all";
type PriorityFilter = TaskPriority | "all";
type AssigneeFilter = string | "all";

type OptimisticAction = { id: string; status: TaskStatus };

function applyOptimistic(tasks: Task[], action: OptimisticAction): Task[] {
  return tasks.map((t) =>
    t.id === action.id ? { ...t, status: action.status } : t,
  );
}

export function TaskBoard({
  assignedTasks,
  unassignedTasks,
  profiles,
  currentUserId,
  initialOpenTaskId,
}: {
  assignedTasks: Task[];
  unassignedTasks: Task[];
  profiles: TaskProfile[];
  currentUserId: string;
  initialOpenTaskId: string | null;
}) {
  const [optimisticAssigned, mutateOptimistic] = useOptimistic<
    Task[],
    OptimisticAction
  >(assignedTasks, applyOptimistic);

  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("all");

  // Deep-link: open the detail dialog if the URL had ?task=<id> at mount.
  const [openTaskId, setOpenTaskId] = useState<string | null>(
    initialOpenTaskId,
  );

  // Per-task pending flags for claim/unassign so we can disable the
  // corresponding button while revalidation is in flight.
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return optimisticAssigned.filter((t) => {
      if (assigneeFilter !== "all") {
        if (t.assigned_to?.id !== assigneeFilter) return false;
      }
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter)
        return false;
      return true;
    });
  }, [optimisticAssigned, assigneeFilter, statusFilter, priorityFilter]);

  // The detail dialog needs to find the task in either list — claim/unassign
  // moves tasks between them after revalidation.
  const openTask = useMemo(() => {
    if (!openTaskId) return null;
    return (
      optimisticAssigned.find((t) => t.id === openTaskId) ??
      unassignedTasks.find((t) => t.id === openTaskId) ??
      null
    );
  }, [optimisticAssigned, unassignedTasks, openTaskId]);

  function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    startTransition(async () => {
      mutateOptimistic({ id: taskId, status: newStatus });
      try {
        const result = await updateTaskStatus(taskId, newStatus);
        if (!result.ok) {
          toast.error(result.error);
        }
      } catch (err) {
        // The server action throws when a non-assignee tries to change
        // status. The optimistic update reverts automatically; we just
        // surface the error message.
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to update task status",
        );
      }
    });
  }

  function handleClaim(taskId: string) {
    setClaimingId(taskId);
    startTransition(async () => {
      const result = await claimTask(taskId);
      setClaimingId(null);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success("Task claimed");
      }
    });
  }

  function handleUnassign(taskId: string) {
    setUnassigningId(taskId);
    startTransition(async () => {
      const result = await unassignTask(taskId);
      setUnassigningId(null);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success("Unassigned");
        // Close the detail dialog: this task is no longer "yours".
        setOpenTaskId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">
            Track what your team is working on.
          </p>
        </div>
        <NewTaskDialog profiles={profiles} />
      </div>

      {unassignedTasks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Available to claim
          </h2>
          <ul className="flex flex-col gap-3">
            {unassignedTasks.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  onView={setOpenTaskId}
                  claimable
                  onClaim={handleClaim}
                  claimPending={claimingId === task.id}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">All tasks</h2>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-medium text-slate-500 uppercase">
            Filter
          </span>

          <Select
            value={assigneeFilter}
            onValueChange={(v) => setAssigneeFilter(v as AssigneeFilter)}
          >
            <SelectTrigger size="sm" className="w-48 bg-white">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name?.trim() || "Unnamed teammate"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger size="sm" className="w-40 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}
          >
            <SelectTrigger size="sm" className="w-36 bg-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="ml-auto text-xs text-slate-500">
            {filtered.length} of {optimisticAssigned.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-slate-500">
              {optimisticAssigned.length === 0
                ? "No assigned tasks yet."
                : "No tasks match the current filters."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  currentUserId={currentUserId}
                  onStatusChange={handleStatusChange}
                  onView={setOpenTaskId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <TaskDetailDialog
        task={openTask}
        currentUserId={currentUserId}
        onOpenChange={(o) => {
          if (!o) setOpenTaskId(null);
        }}
        onStatusChange={handleStatusChange}
        onUnassign={handleUnassign}
        unassignPending={unassigningId === openTaskId}
      />
    </div>
  );
}
