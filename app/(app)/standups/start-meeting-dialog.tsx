"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { startMeeting } from "./actions";
import type { BroadcastResult } from "./types";

function looksLikeMeet(link: string) {
  return link.toLowerCase().includes("meet.google.com");
}

export function StartMeetingDialog() {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  function handleOpenChange(next: boolean) {
    if (!next) setInstance((n) => n + 1);
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Video className="size-4" aria-hidden="true" />
          Start meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a meeting</DialogTitle>
          <DialogDescription>
            Broadcast the Google Meet link to your team over WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <StartMeetingForm key={instance} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function StartMeetingForm({ onClose }: { onClose: () => void }) {
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmedLink = link.trim();
  const canSend = trimmedLink.length > 0 && !pending && result == null;
  const showMeetWarning =
    trimmedLink.length > 0 && !looksLikeMeet(trimmedLink);

  function handleSend() {
    startTransition(async () => {
      const res = await startMeeting(trimmedLink, note);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult(res.result);
      const { sent, failed, skipped } = res.result;
      toast.success(
        `Sent to ${sent}${failed ? `, ${failed} failed` : ""}${skipped ? `, ${skipped} skipped` : ""}`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="meet_link">Google Meet link</Label>
        <Input
          id="meet_link"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://meet.google.com/abc-defg-hij"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={result != null}
        />
        {showMeetWarning && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700">
            <AlertTriangle
              className="size-3.5 shrink-0 translate-y-0.5"
              aria-hidden="true"
            />
            <span>
              That doesn&apos;t look like a meet.google.com link — double-check
              before sending.
            </span>
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="meet_note">Add a note (optional)</Label>
        <Textarea
          id="meet_note"
          rows={2}
          placeholder="e.g. we're discussing the launch today"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={result != null}
        />
      </div>

      {result && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Sent to <strong>{result.sent}</strong> people,{" "}
          <strong>{result.failed}</strong> failed,{" "}
          <strong>{result.skipped}</strong> skipped (no WhatsApp setup).
        </div>
      )}

      <DialogFooter className="mt-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={pending}
        >
          {result ? "Close" : "Cancel"}
        </Button>
        {result == null && (
          <Button type="button" onClick={handleSend} disabled={!canSend}>
            {pending ? "Sending…" : "Send to team"}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
