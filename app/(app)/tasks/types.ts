export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "blocked",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskProfile = {
  id: string;
  full_name: string | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  assigned_to: TaskProfile | null;
  assigned_by: TaskProfile | null;
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const STATUS_CLASSES: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  blocked: "bg-amber-100 text-amber-800",
};

// Outlined style so priority pills don't merge with the filled status pill
// when they appear side by side (e.g. on task cards). `border-current` ties
// the border to the text color, keeping the pill cohesive in any color.
export const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  low: "border border-current text-slate-600",
  medium: "border border-current text-blue-600",
  high: "border border-current text-red-600",
};

const AVATAR_PALETTE = [
  "bg-slate-200 text-slate-700",
  "bg-blue-200 text-blue-800",
  "bg-emerald-200 text-emerald-800",
  "bg-amber-200 text-amber-800",
  "bg-pink-200 text-pink-800",
  "bg-violet-200 text-violet-800",
  "bg-cyan-200 text-cyan-800",
  "bg-rose-200 text-rose-800",
];

export function avatarColorForId(id: string | null | undefined): string {
  if (!id) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function initialFor(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
}
