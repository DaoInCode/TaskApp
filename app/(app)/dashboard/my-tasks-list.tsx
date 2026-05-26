"use client";

import { startTransition, useOptimistic } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "@/app/(app)/tasks/actions";
import {
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/app/(app)/tasks/types";

export type MyTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
};

type OptimisticAction = { id: string; status: TaskStatus };

function applyOptimistic(
  tasks: MyTask[],
  action: OptimisticAction,
): MyTask[] {
  return tasks.map((t) =>
    t.id === action.id ? { ...t, status: action.status } : t,
  );
}

export function MyTasksList({ tasks }: { tasks: MyTask[] }) {
  const [optimisticTasks, mutate] = useOptimistic<MyTask[], OptimisticAction>(
    tasks,
    applyOptimistic,
  );

  function handleChange(taskId: string, newStatus: TaskStatus) {
    startTransition(async () => {
      mutate({ id: taskId, status: newStatus });
      const result = await updateTaskStatus(taskId, newStatus);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  if (optimisticTasks.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nothing assigned to you right now. Enjoy the quiet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {optimisticTasks.map((task) => (
        <li
          key={task.id}
          className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
        >
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium",
              PRIORITY_CLASSES[task.priority],
            )}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className="flex-1 truncate text-sm text-slate-900">
            {task.title}
          </span>
          <Select
            value={task.status}
            onValueChange={(v) => handleChange(task.id, v as TaskStatus)}
          >
            <SelectTrigger
              size="sm"
              aria-label="Change status"
              className={cn(
                "h-7 w-36 gap-1 border-transparent px-2 text-xs font-medium",
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
        </li>
      ))}
    </ul>
  );
}
