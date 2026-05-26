"use client";

import { format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";
import { LogStandupDialog } from "./log-standup-dialog";
import { StartMeetingDialog } from "./start-meeting-dialog";
import { StandupsList } from "./standups-list";
import type { Standup, StandupProfile } from "./types";

export function StandupsPage({
  standups,
  profiles,
  todayStandup,
  todayKey,
  existingDates,
}: {
  standups: Standup[];
  profiles: StandupProfile[];
  todayStandup: Standup | null;
  todayKey: string;
  existingDates: string[];
}) {
  const todayLabel = format(parseISO(`${todayKey}T00:00:00`), "EEEE, MMMM d");
  const logged = todayStandup != null;
  const preview = todayStandup?.summary?.trim().slice(0, 140) ?? "";
  const previewSuffix =
    todayStandup?.summary && todayStandup.summary.trim().length > 140
      ? "…"
      : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Standups</h1>
          <p className="text-sm text-slate-500">
            Daily syncs and the receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StartMeetingDialog />
          <LogStandupDialog
            profiles={profiles}
            existingDates={existingDates}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-semibold text-slate-900">{todayLabel}</p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
              logged
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-800",
            )}
          >
            {logged ? "Logged ✓" : "Not logged yet"}
          </span>
        </div>
        {logged && todayStandup ? (
          todayStandup.happened ? (
            preview ? (
              <p className="text-sm text-slate-600">
                {preview}
                {previewSuffix}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No summary recorded.
              </p>
            )
          ) : (
            <p className="text-sm text-slate-500 italic">
              Standup did not happen today.
            </p>
          )
        ) : (
          <p className="text-sm text-slate-500">
            Log today&apos;s standup to keep the team timeline complete.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Past standups
        </h2>
        <StandupsList standups={standups} />
      </div>
    </div>
  );
}
