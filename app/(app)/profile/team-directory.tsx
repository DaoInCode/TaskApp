"use client";

import { Download } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type TeamMember = {
  id: string;
  full_name: string | null;
  whatsapp_number: string | null;
};

function escapeVcardText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function safeFilename(name: string) {
  const cleaned = name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_.-]/g, "");
  return cleaned || "contact";
}

function getInitial(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
}

function downloadVcard(fullName: string, whatsappNumber: string) {
  const vcard =
    [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVcardText(fullName)}`,
      `TEL;TYPE=CELL,VOICE:${whatsappNumber}`,
      "END:VCARD",
    ].join("\r\n") + "\r\n";

  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(fullName)}.vcf`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Defer revoke so the browser can start the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function MemberRow({
  member,
  isMe,
}: {
  member: TeamMember;
  isMe: boolean;
}) {
  const name = member.full_name?.trim() || "Unnamed teammate";
  const number = member.whatsapp_number?.trim() ?? "";

  return (
    <li className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <Avatar className="size-10">
        <AvatarFallback className="bg-slate-100 text-sm font-medium text-slate-700">
          {getInitial(member.full_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-slate-900">
          {name}
        </span>
        {number ? (
          <span className="truncate text-xs text-slate-500">{number}</span>
        ) : (
          <span className="truncate text-xs text-slate-400">
            No WhatsApp number
          </span>
        )}
      </div>

      <div className="shrink-0">
        {isMe ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            you
          </span>
        ) : number ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadVcard(name, number)}
          >
            <Download className="size-4" aria-hidden="true" />
            Save to phone
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled
            className="text-slate-400"
          >
            no number
          </Button>
        )}
      </div>
    </li>
  );
}

export function TeamDirectory({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  return (
    <section className="my-8 flex flex-col gap-6 border-t border-slate-200 pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Team contacts</h2>
        <p className="text-sm text-slate-500">
          Save your teammates to your phone in one tap
        </p>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-slate-500">No team members yet.</p>
      ) : (
        <ul className="flex flex-col">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isMe={member.id === currentUserId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
