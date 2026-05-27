import { CheckSquare, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { getMyProfile, requireUser } from "@/lib/auth";
import { SidebarNav } from "./sidebar-nav";

function getInitials(name: string | null | undefined, fallback: string) {
  const source = name?.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getMyProfile();

  const fullName = profile?.full_name ?? "";
  const email = profile?.email ?? user.email ?? "";
  const initials = getInitials(fullName, email);

  return (
    <div className="flex flex-1 bg-white">
      <aside className="flex w-14 shrink-0 flex-col border-r border-slate-200 bg-white md:w-60">
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
          <CheckSquare
            className="size-5 shrink-0 text-slate-900"
            aria-hidden="true"
          />
          <span className="hidden font-semibold text-slate-900 md:inline">
            Taskapp
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 flex-1 flex-col md:flex">
              <span className="truncate text-sm font-medium text-slate-900">
                {fullName || email}
              </span>
              {fullName && (
                <span className="truncate text-xs text-slate-500">
                  {email}
                </span>
              )}
            </div>
          </div>
          <form action="/logout" method="post" className="mt-3">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-center md:justify-start"
              title="Log out"
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Log out</span>
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10">
        {children}
      </main>

      <Toaster position="bottom-right" />
    </div>
  );
}
