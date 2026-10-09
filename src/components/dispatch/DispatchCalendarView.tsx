import React from "react";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

interface DispatchCalendarViewProps {
  dispatches: any[];
  urlView: "month" | "week" | "day";
  currentDate: Date;
  onNavigate: (newDate: Date) => void;
  onViewChange: (newView: string) => void;
  onDrillDown: (date: Date, newView: string) => void;
  onSelectEvent: (eventResource: any) => void;
}

export function DispatchCalendarView({
  dispatches,
  urlView,
  currentDate,
  onNavigate,
  onViewChange,
  onDrillDown,
  onSelectEvent,
}: DispatchCalendarViewProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-xl text-slate-900 h-[650px] overflow-hidden mb-6">
      <BigCalendar
        localizer={localizer}
        events={dispatches.map((d) => ({
          title: `${d.customer?.name} - ${d.machine?.category || "Labor"}`,
          start: new Date(d.dateOfService),
          end: new Date(d.dateOfService),
          resource: d,
        }))}
        startAccessor="start"
        endAccessor="end"
        views={["month", "week", "day"]}
        view={urlView}
        date={currentDate}
        onNavigate={onNavigate}
        onView={onViewChange as any}
        onDrillDown={onDrillDown as any}
        onSelectEvent={(event: any) => onSelectEvent(event.resource)}
        eventPropGetter={(event: any) => {
          const d = event.resource;
          if (d.incidentType || d.status === "FLAGGED_MAINTENANCE") {
            return {
              style: {
                backgroundColor: d.incidentType ? "#7f1d1d" : "#78350f", // red-900 or amber-900
                color: "white",
                border: "none",
              },
            };
          }
          return {
            style: {
              backgroundColor: "#1e293b", // slate-800
              color: "white",
              border: "none",
            },
          };
        }}
        className="font-sans"
        popup
      />
    </div>
  );
}
