export const ATTACHMENT_LOGBOOK_FORMAT_VERSION = 'edulink_attachment_logbook_v1';

export const ATTACHMENT_WEEKDAYS = [
  { key: 'MON', label: 'Monday', offset: 0 },
  { key: 'TUE', label: 'Tuesday', offset: 1 },
  { key: 'WED', label: 'Wednesday', offset: 2 },
  { key: 'THU', label: 'Thursday', offset: 3 },
  { key: 'FRI', label: 'Friday', offset: 4 },
] as const;

export type AttachmentWeekdayKey = typeof ATTACHMENT_WEEKDAYS[number]['key'];

export interface StandardDailyLogEntry {
  day: AttachmentWeekdayKey;
  label: string;
  date: string;
  description: string;
}

export interface StandardLogbookMetadata {
  format_version: typeof ATTACHMENT_LOGBOOK_FORMAT_VERSION;
  logbook_type: 'INDUSTRIAL_ATTACHMENT';
  week_start_date: string;
  week_ending_date: string;
  weekly_summary: string;
  daily_entries: StandardDailyLogEntry[];
  entries: Record<string, string>;
}

const parseLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

export const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (dateStr: string, days: number) => {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
};

export const getWeekEndingDate = (weekStartDate: string) => addDays(weekStartDate, 4);

export const buildStandardDailyEntries = (
  weekStartDate: string,
  entries: Record<string, string>
): StandardDailyLogEntry[] => ATTACHMENT_WEEKDAYS.map(day => {
  const date = addDays(weekStartDate, day.offset);
  return {
    day: day.key,
    label: day.label,
    date,
    description: entries[date] || '',
  };
});

export const buildStandardLogbookMetadata = ({
  weekStartDate,
  entries,
  weeklySummary,
}: {
  weekStartDate: string;
  entries: Record<string, string>;
  weeklySummary: string;
}): StandardLogbookMetadata => ({
  format_version: ATTACHMENT_LOGBOOK_FORMAT_VERSION,
  logbook_type: 'INDUSTRIAL_ATTACHMENT',
  week_start_date: weekStartDate,
  week_ending_date: getWeekEndingDate(weekStartDate),
  weekly_summary: weeklySummary.trim(),
  daily_entries: buildStandardDailyEntries(weekStartDate, entries),
  entries,
});

export const countCompletedStandardDays = (entries: Record<string, string>, weekStartDate: string) =>
  buildStandardDailyEntries(weekStartDate, entries).filter(entry => entry.description.trim()).length;
