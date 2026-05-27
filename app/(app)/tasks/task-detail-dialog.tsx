"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";

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
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "./types";

function formatDate(value: string | null, includeTime = false): string | null {
  if (!value) return null;
  try {
    const date =
      value.length === 10 ? parseISO(`${value}T00:00:00`) : parseISO(value);
    return format(date, includeTime ? "MMM d, yyyy 'at' p" : "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function TaskDetailDialog({
  task,
  currentUserId,
  onOpenChange,
  onStatusChange,
  onUnassign,
  unassignPending,
}: {
  task: Task | null;
  currentUserId: string;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onUnassign: (taskId: string) => void;
  unassignPending: boolean;
}) {
  return (
    <Dialog open={task != null} onOpenChange={onOpenChange}>
      {task && (
        <TaskDetailContent
          task={task}
          currentUserId={currentUserId}
          onClose={() => onOpenChange(false)}
          onStatusChange={onStatusChange}
          onUnassign={onUnassign}
          unassignPending={unassignPending}
        />
      )}
    </Dialog>
  );
}

function TaskDetailContent({
  task,
  currentUserId,
  onClose,
  onStatusChange,
  onUnassign,
  unassignPending,
}: {
  task: Task;
  currentUserId: string;
  onClose: () => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onUnassign: (taskId: string) => void;
  unassignPending: boolean;
}) {
  const assigneeName = task.assigned_to?.full_name?.trim() || "Unassigned";
  const assignerName = task.assigned_by?.full_name?.trim() || "—";
  const isAssignee =
    task.assigned_to != null && currentUserId === task.assigned_to.id;

  const [confirming, setConfirming] = useState(false);

  function handleUnassignClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onUnassign(task.id);
  }

  return (
    <DialogContent
      showCloseButton={false}
      className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <DialogTitle className="text-xl font-semibold text-slate-900 break-words">
            {task.title}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                PRIORITY_CLASSES[task.priority],
              )}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                STATUS_CLASSES[task.status],
              )}
            >
              {STATUS_LABELS[task.status]}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="shrink-0 text-slate-500 hover:text-slate-900"
          aria-label="Close"
        >
          <span aria-hidden="true">✕</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <dl className="mb-6 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <MetaRow label="Assigned to" value={assigneeName} />
          <MetaRow label="Assigned by" value={assignerName} />
          <MetaRow label="Created" value={formatDate(task.created_at, true)} />
          {task.due_date && (
            <MetaRow label="Due" value={formatDate(task.due_date)} />
          )}
          {task.started_at && (
            <MetaRow label="Started" value={formatDate(task.started_at, true)} />
          )}
          {task.completed_at && (
            <MetaRow
              label="Completed"
              value={formatDate(task.completed_at, true)}
            />
          )}
        </dl>

        {task.description?.trim() ? (
          <Markdown>{task.description}</Markdown>
        ) : (
          <p className="text-sm text-slate-400 italic">
            No description.
          </p>
        )}

        {task.notes?.trim() && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="mb-2 text-xs font-medium text-slate-500 uppercase">
              Notes
            </p>
            <Markdown>{task.notes}</Markdown>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          {isAssignee && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUnassignClick}
                disabled={unassignPending}
                className="text-slate-700"
              >
                {unassignPending
                  ? "Unassigning…"
                  : confirming
                    ? "Confirm unassign?"
                    : "Unassign from me"}
              </Button>
              {confirming && !unassignPending && (
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label
              htmlFor="task-detail-status"
              className="text-xs font-medium text-slate-500 uppercase"
            >
              Status
            </Label>
            {isAssignee ? (
              <Select
                value={task.status}
                onValueChange={(v) => onStatusChange(task.id, v as TaskStatus)}
              >
                <SelectTrigger
                  id="task-detail-status"
                  size="sm"
                  className={cn(
                    // h-8 matches task-card; the primitive's data-[size=sm]:h-8
                    // wins on specificity anyway. w-auto overrides the base
                    // w-full so the chip doesn't try to stretch across the row.
                    "h-8 w-auto gap-1 border-transparent px-2.5 text-xs font-medium",
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    id="task-detail-status"
                    className={cn(
                      "inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium",
                      STATUS_CLASSES[task.status],
                    )}
                    tabIndex={0}
                    aria-label={`Status: ${STATUS_LABELS[task.status]}`}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {task.assigned_to
                    ? `Only ${assigneeName} can change this task's status.`
                    : "Claim this task to change its status."}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </DialogContent>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-slate-500 uppercase">{label}</dt>
      <dd className="text-sm text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}
