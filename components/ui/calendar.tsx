"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayPickerProps,
} from "react-day-picker";

import { cn } from "@/lib/utils";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn(
          "relative flex flex-col gap-4 sm:flex-row",
          defaults.months,
        ),
        month: cn("flex w-full flex-col gap-4", defaults.month),
        month_caption: cn(
          "flex h-7 items-center justify-center text-sm font-medium",
          defaults.month_caption,
        ),
        caption_label: cn("text-sm font-medium", defaults.caption_label),
        nav: cn(
          "absolute inset-x-0 top-0 flex h-7 items-center justify-between px-1",
          defaults.nav,
        ),
        button_previous: cn(
          "inline-flex size-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-50",
          defaults.button_previous,
        ),
        button_next: cn(
          "inline-flex size-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-50",
          defaults.button_next,
        ),
        month_grid: cn("w-full border-collapse", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "w-9 text-xs font-normal text-slate-500",
          defaults.weekday,
        ),
        week: cn("mt-1 flex w-full", defaults.week),
        day: cn(
          "relative size-9 p-0 text-center text-sm",
          defaults.day,
        ),
        day_button: cn(
          "inline-flex size-9 items-center justify-center rounded-md font-normal text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 aria-selected:bg-slate-900 aria-selected:text-white aria-selected:hover:bg-slate-900",
          defaults.day_button,
        ),
        today: cn("font-semibold text-slate-900", defaults.today),
        outside: cn("text-slate-400 opacity-50", defaults.outside),
        disabled: cn("opacity-40", defaults.disabled),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" aria-hidden="true" {...rest} />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" {...rest} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
