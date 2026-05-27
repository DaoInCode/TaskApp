"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { toast } from "sonner";

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
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createTask, type CreateTaskState } from "./actions";
import {
  PRIORITY_LABELS,
  TASK_PRIORITIES,
  type TaskPriority,
  type TaskProfile,
} from "./types";

// Sentinel for "no assignee" — Radix Select doesn't allow empty-string values,
// so we translate this to "" via a hidden input before the server action sees it.
const UNASSIGNED_VALUE = "__unassigned__";

export function NewTaskDialog({ profiles }: { profiles: TaskProfile[] }) {
  const [open, setOpen] = useState(false);
  // Bumped only on successful submit so the next open starts blank.
  // We deliberately do NOT bump on close — closing accidentally shouldn't
  // throw away whatever the user has typed.
  const [formInstance, setFormInstance] = useState(0);

  function handleSuccess() {
    toast.success("Task created");
    setFormInstance((n) => n + 1);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          New task
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Create a task and assign it to a teammate. Tasks support markdown,
              so feel free to write specs with headers, bullets, and code.
            </DialogDescription>
          </DialogHeader>
        </div>
        <NewTaskForm
          key={formInstance}
          profiles={profiles}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function NewTaskForm({
  profiles,
  onSuccess,
  onCancel,
}: {
  profiles: TaskProfile[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(UNASSIGNED_VALUE);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  async function wrappedAction(
    prev: CreateTaskState,
    formData: FormData,
  ): Promise<CreateTaskState> {
    const result = await createTask(prev, formData);
    if (result?.ok) {
      onSuccess();
    } else if (result && !result.ok) {
      toast.error(result.error);
    }
    return result;
  }

  const [, formAction, pending] = useActionState<CreateTaskState, FormData>(
    wrappedAction,
    null,
  );

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6">
        <div className="flex flex-col gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              autoComplete="off"
              placeholder="What needs to be done?"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            {/* Hidden input is the source of truth on submit so the description
                survives tab switches even when the textarea unmounts. */}
            <input type="hidden" name="description" value={description} />
            <Tabs defaultValue="write">
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Spec it out — headers, bullets, code blocks, links."
                />
                <p className="mt-1 text-xs text-slate-500">
                  Supports markdown — headers, bullet lists, **bold**,{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                    code
                  </code>
                  , links.
                </p>
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[200px] max-h-[400px] overflow-y-auto rounded-md border border-slate-200 bg-white p-4">
                  {description.trim() ? (
                    <Markdown>{description}</Markdown>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Nothing to preview yet.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="assigned_to">Assignee</Label>
              {/* Hidden input maps the sentinel back to "" so server treats as null. */}
              <input
                type="hidden"
                name="assigned_to"
                value={assignedTo === UNASSIGNED_VALUE ? "" : assignedTo}
              />
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="assigned_to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_VALUE}>
                    Unassigned (anyone can claim)
                  </SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name?.trim() || "Unnamed teammate"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                name="priority"
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Due date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "justify-start font-normal",
                    !dueDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="size-4" aria-hidden="true" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            <input
              type="hidden"
              name="due_date"
              value={dueDate ? format(dueDate, "yyyy-MM-dd") : ""}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 border-t border-slate-200 px-6 pt-4 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create task"}
        </Button>
      </DialogFooter>
    </form>
  );
}
