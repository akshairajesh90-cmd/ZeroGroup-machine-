import { startOfWeek, endOfWeek, subDays, addDays } from "date-fns";

export function getSaturdayWeek(date: Date) {
  // If today is Sunday, the week actually started last Monday. 
  // If today is Monday-Saturday, the week started this Monday.
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = addDays(weekStart, 5); // Saturday
  return { weekStart, weekEnd };
}
