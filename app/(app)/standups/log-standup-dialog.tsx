"use client";

import { useActionState, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { logStandup, type LogStandupState } from "./actions";
import type { StandupProfile } from "./types";

export function LogStandupDialog({
  profiles,
  existingDates,
}: {
  profiles: StandupProfile[];
  existingDates: string[];
}) {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  function handleOpenChange(next: boolean) {
    if (!next) setInstance((n) => n + 1);
    setOpen(next);
  }

  function handleSuccess() {
    toast.success("Standup logged");
    setInstance((n) => n + 1);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" aria-hidden="true" />
          Log standup
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a standup</DialogTitle>
          <DialogDescription>
            Record what your team discussed (or that the standup was skipped).
          </DialogDescription>
        </DialogHeader>
        <LogStandupForm
          key={instance}
          profiles={profiles}
          existingDates={existingDates}
          onSuccess={handleSuccess}
          onCancel={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function LogStandupForm({
  profiles,
  existingDates,
  onSuccess,
  onCancel,
}: {
  profiles: StandupProfile[];
  existingDates: string[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const today = startOfToday();
  const todayKey = format(today, "yyyy-MM-dd");
  const existingSet = new Set(existingDates);

  const [date, setDate] = useState<Date>(
    existingSet.has(todayKey) ? today : today,
  );
  const [happened, setHappened] = useState(true);

  async function wrappedAction(
    prev: LogStandupState,
    formData: FormData,
  ): Promise<LogStandupState> {
    const result = await logStandup(prev, formData);
    if (result?.ok) {
      onSuccess();
    } else if (result && !result.ok) {
      toast.error(result.error);
    }
    return result;
  }

  const [, formAction, pending] = useActionState<LogStandupState, FormData>(
    wrappedAction,
    null,
  );

  const dateValue = format(date, "yyyy-MM-dd");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="justify-start font-normal"
            >
              <CalendarIcon className="size-4" aria-hidden="true" />
              {format(date, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) => {
                const key = format(d, "yyyy-MM-dd");
                // Block dates that already have a standup (unless it's the
                // currently-selected date, since RDP needs the selected day
                // to remain enabled).
                if (key === dateValue) return false;
                if (existingSet.has(key)) return true;
                if (d.getTime() > today.getTime()) return true;
                return false;
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        <input type="hidden" name="standup_date" value={dateValue} />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-md border border-slate-200 px-4 py-3">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="happened"
            className="text-sm font-medium text-slate-900"
          >
            Did standup happen?
          </Label>
          <p className="text-muted-foreground text-xs">
            Turn off to record a skipped day.
          </p>
        </div>
        <Switch
          id="happened"
          name="happened"
          checked={happened}
          onCheckedChange={setHappened}
        />
      </div>

      <fieldset
        disabled={!happened}
        className={cn(
          "flex flex-col gap-4",
          !happened && "opacity-50 pointer-events-none",
        )}
      >
        <div className="grid gap-2">
          <Label>Attendees</Label>
          {profiles.length === 0 ? (
            <p className="text-sm text-slate-500">No team members yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-2">
              {profiles.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <Checkbox
                    name="attendees"
                    value={p.id}
                    defaultChecked
                    disabled={!happened}
                  />
                  <span className="truncate">
                    {p.full_name?.trim() || "Unnamed teammate"}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            name="summary"
            rows={4}
            required={happened}
            minLength={happened ? 10 : 0}
            placeholder="What did the team discuss? Decisions, progress, next steps."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="blockers">Blockers (optional)</Label>
          <Textarea
            id="blockers"
            name="blockers"
            rows={2}
            placeholder="Anything stuck or waiting on someone."
          />
        </div>
      </fieldset>

      <DialogFooter className="mt-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save standup"}
        </Button>
      </DialogFooter>
    </form>
  );
}
