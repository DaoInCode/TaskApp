"use client";

import { format, parseISO } from "date-fns";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  avatarColorForId,
  initialFor,
} from "@/app/(app)/tasks/types";
import type { Standup, StandupProfile } from "./types";

const MAX_VISIBLE_ATTENDEES = 6;

function attendeeProfiles(standup: Standup): StandupProfile[] {
  return standup.attendees
    .map((a) => a.profile)
    .filter((p): p is StandupProfile => p != null);
}

function previewSummary(summary: string | null): string {
  if (!summary) return "";
  const trimmed = summary.trim();
  if (trimmed.length <= 100) return trimmed;
  return `${trimmed.slice(0, 100).trimEnd()}…`;
}

function formatStandupDate(value: string): string {
  // standup_date is a Postgres date column → "YYYY-MM-DD". Parse without TZ.
  try {
    return format(parseISO(`${value}T00:00:00`), "EEE, MMM d, yyyy");
  } catch {
    return value;
  }
}

export function StandupsList({ standups }: { standups: Standup[] }) {
  if (standups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-slate-500">
          No standups logged yet. Log one to start your team history.
        </p>
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      className="rounded-lg border border-slate-200 bg-white px-4"
    >
      {standups.map((standup) => {
        const attendees = attendeeProfiles(standup);
        const overflow = Math.max(0, attendees.length - MAX_VISIBLE_ATTENDEES);
        const visible = attendees.slice(0, MAX_VISIBLE_ATTENDEES);
        const preview = previewSummary(standup.summary);
        const hasBody =
          (standup.summary != null && standup.summary.trim().length > 0) ||
          (standup.blockers != null &&
            standup.blockers.trim().length > 0);

        return (
          <AccordionItem key={standup.id} value={standup.id}>
            <AccordionTrigger>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="shrink-0 text-sm font-medium text-slate-900">
                  {formatStandupDate(standup.standup_date)}
                </span>
                {standup.happened ? (
                  <>
                    {visible.length > 0 && (
                      <span className="flex shrink-0 items-center -space-x-1.5">
                        {visible.map((p) => (
                          <span
                            key={p.id}
                            aria-hidden="true"
                            title={p.full_name ?? undefined}
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-medium",
                              avatarColorForId(p.id),
                            )}
                          >
                            {initialFor(p.full_name)}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <span
                            className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-medium text-slate-600"
                            aria-label={`${overflow} more`}
                          >
                            +{overflow}
                          </span>
                        )}
                      </span>
                    )}
                    {preview && (
                      <span className="truncate text-sm text-slate-500">
                        {preview}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-slate-500 italic">
                    Standup did not happen
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {hasBody ? (
                <div className="flex flex-col gap-3">
                  {standup.summary?.trim() && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-500 uppercase">
                        Summary
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {standup.summary}
                      </p>
                    </div>
                  )}
                  {standup.blockers?.trim() && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-500 uppercase">
                        Blockers
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {standup.blockers}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No details recorded.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
