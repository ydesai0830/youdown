export function formatDate(date?: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDayLabel(date?: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTimeRange(start?: Date | null, end?: Date | null) {
  if (!start) return "Time TBD";

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) return formatter.format(start);
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function formatDateTimeRange(start?: Date | null, end?: Date | null) {
  if (!start) return "Date TBD";

  const day = formatDate(start);
  const time = formatTimeRange(start, end);

  return `${day} · ${time}`;
}
