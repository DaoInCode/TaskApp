"use client";

import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";
import { ArrowRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";

// react-markdown + remark-gfm is ~50-70KB gzipped. Lazy-load it so the /tasks
// initial bundle doesn't carry it for cards without descriptions or for users
// who never expand a card. ssr:false avoids the SSR/CSR mismatch flicker.
const Markdown = dynamic(
  () => import("@/components/markdown").then((m) => m.Markdown),
  {
    ssr: false,
    loading: () => (
      <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
    ),
  },
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  avatarColorForId,
  initialFor,
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "./types";

function formatDueDate(value: string | null): string | null {
  if (!value) return null;
  try {
    const date =
      value.length === 10 ? parseISO(`${value}T00:00:00`) : parseISO(value);
    return format(date, "MMM d");
  } catch {
    return value;
  }
}

type CommonProps = {
  task: Task;
  onView: (taskId: string) => void;
};

type DefaultProps = CommonProps & {
  claimable?: false;
  currentUserId: string;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
};

type ClaimableProps = CommonProps & {
  claimable: true;
  onClaim: (taskId: string) => void;
  claimPending?: boolean;
};

export function TaskCard(props: DefaultProps | ClaimableProps) {
  const { task, onView } = props;
  const isClaimable = props.claimable === true;

  const assigneeId = task.assigned_to?.id ?? null;
  const assigneeName = task.assigned_to?.full_name?.trim() || "Unassigned";
  const assignedByName = task.assigned_by?.full_name?.trim() || null;
  const dueLabel = formatDueDate(task.due_date);

  const description = task.description?.trim() ?? "";
  const hasDescription = description.length > 0;
  const lineCount = hasDescription ? description.split("\n").length : 0;
  const hasMoreContent =
    hasDescription && (lineCount > 3 || description.length > 250);

  // Only the assignee gets an interactive status dropdown. Everyone else
  // sees the same color chip as read-only — server-side guard in
  // updateTaskStatus is the actual enforcement; this just hides the UI.
  const canEditStatus =
    !isClaimable && props.currentUserId === task.assigned_to?.id;

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium",
            PRIORITY_CLASSES[task.priority],
          )}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
        <h3 className="flex-1 min-w-0 text-base font-semibold text-slate-900 break-words">
          {task.title}
        </h3>
        {isClaimable ? (
          <Button
            type="button"
            size="sm"
            onClick={() => props.onClaim(task.id)}
            disabled={props.claimPending}
            className="h-8 shrink-0"
          >
            {props.claimPending ? "Claiming…" : "Claim this task"}
          </Button>
        ) : canEditStatus ? (
          // Status pill = the Select trigger. `w-auto` overrides the primitive's
          // `w-full` base so the chip sizes to its content instead of stealing
          // the row. The primitive's data-[size=sm]:h-8 always wins on CSS
          // specificity over a plain h-7, so we standardize on h-8 here and in
          // the detail dialog rather than fighting the cascade.
          <Select
            value={task.status}
            onValueChange={(v) => props.onStatusChange(task.id, v as TaskStatus)}
          >
            <SelectTrigger
              size="sm"
              aria-label="Change status"
              className={cn(
                "h-8 w-auto shrink-0 gap-1 border-transparent px-2 text-xs font-medium",
                STATUS_CLASSES[task.status],
              )}
            >
              <SelectValue>{STATUS_LABELS[task.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span
            className={cn(
              "inline-flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium",
              STATUS_CLASSES[task.status],
            )}
            aria-label={`Status: ${STATUS_LABELS[task.status]}`}
            title={`Only ${assigneeName} can change this task's status`}
          >
            {STATUS_LABELS[task.status]}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
        {isClaimable ? (
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <span aria-hidden="true">🙋</span>
            Unclaimed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-medium",
                avatarColorForId(assigneeId),
              )}
            >
              {initialFor(task.assigned_to?.full_name)}
            </span>
            <span className="truncate">{assigneeName}</span>
          </span>
        )}
        {assignedByName && !isClaimable && (
          <>
            <span aria-hidden="true">·</span>
            <span className="truncate">assigned by {assignedByName}</span>
          </>
        )}
        {dueLabel && (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" aria-hidden="true" />
              {dueLabel}
            </span>
          </>
        )}
      </div>

      {hasDescription && (
        <div className="relative">
          <div className="line-clamp-3 overflow-hidden text-slate-700">
            <Markdown>{description}</Markdown>
          </div>
          {hasMoreContent && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent"
            />
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onView(task.id)}
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          View full
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
