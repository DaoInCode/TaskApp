import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-slate prose-sm max-w-none",
        // Slightly tighter spacing for headings/lists in app context.
        "prose-headings:font-semibold prose-headings:text-slate-900",
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
        "prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-slate-800 prose-code:before:content-none prose-code:after:content-none",
        "prose-a:text-slate-900 prose-a:underline-offset-2 hover:prose-a:underline",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
