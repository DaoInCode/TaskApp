"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateProfile, type ProfileActionState } from "./actions";

export type ProfileFormProfile = {
  full_name: string | null;
  whatsapp_number: string | null;
  callmebot_apikey: string | null;
  notify_whatsapp: boolean | null;
};

export function ProfileForm({ profile }: { profile: ProfileFormProfile }) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updateProfile, null);

  const [whatsappNumber, setWhatsappNumber] = useState(
    profile.whatsapp_number ?? "",
  );
  const [apiKey, setApiKey] = useState(profile.callmebot_apikey ?? "");
  const [notify, setNotify] = useState(profile.notify_whatsapp ?? false);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Profile updated");
    } else {
      toast.error(state.error);
    }
  }, [state]);

  const showWarning = notify && (!whatsappNumber.trim() || !apiKey.trim());

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {showWarning && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle
            className="size-4 shrink-0 translate-y-0.5 text-amber-600"
            aria-hidden="true"
          />
          <p>
            WhatsApp notifications are enabled but your number or API key is
            missing — you won&apos;t receive notifications until both are set.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Update your name and WhatsApp notification settings.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              defaultValue={profile.full_name ?? ""}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="whatsapp_number">WhatsApp number</Label>
            <Input
              id="whatsapp_number"
              name="whatsapp_number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+252612345678"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Format: +countrycode and number, no spaces, e.g. +252612345678
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="callmebot_apikey" className="gap-1.5">
              <span>CallMeBot API key</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="What is the CallMeBot API key?"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-full focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                  >
                    <HelpCircle className="size-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Get this by sending &quot;I allow callmebot to send me
                  messages&quot; to the CallMeBot WhatsApp number — they&apos;ll
                  reply with your personal API key.
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="callmebot_apikey"
              name="callmebot_apikey"
              type="text"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border border-slate-200 px-4 py-3">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="notify_whatsapp"
                className="text-sm font-medium text-slate-900"
              >
                WhatsApp notifications
              </Label>
              <p className="text-muted-foreground text-xs">
                Send reminders and daily standups to your WhatsApp.
              </p>
            </div>
            <Switch
              id="notify_whatsapp"
              name="notify_whatsapp"
              checked={notify}
              onCheckedChange={setNotify}
            />
          </div>
        </CardContent>

        <CardFooter className="mt-2 justify-end border-t border-slate-200 pt-6">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
