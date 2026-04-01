export function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'just now';
  }
  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    return `${minutes} min ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} hr ago`;
  }

  const days = Math.round(diff / day);
  return `${days} d ago`;
}
