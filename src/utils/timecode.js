export function parseTimecode(value) {
  if (value == null || value === '') {
    return null;
  }

  const normalized = String(value)
    .trim()
    .replace(',', '.');

  const parts = normalized.split(':');

  if (parts.length === 1) {
    const seconds = Number(parts[0]);

    return Number.isNaN(seconds)
      ? null
      : seconds;
  }

  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);

    if (
      Number.isNaN(minutes) ||
      Number.isNaN(seconds)
    ) {
      return null;
    }

    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      Number.isNaN(seconds)
    ) {
      return null;
    }

    return (
      hours * 3600 +
      minutes * 60 +
      seconds
    );
  }

  return null;
}

export function formatTimecode(seconds) {
  if (
    seconds == null ||
    Number.isNaN(seconds)
  ) {
    return '';
  }

  const totalSeconds = Number(seconds);

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const secs = (
    totalSeconds % 60
  ).toFixed(2);

  const paddedMinutes = String(
    minutes
  ).padStart(2, '0');

  const paddedSeconds = String(
    secs
  ).padStart(5, '0');

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

export function getCueDuration(cue) {
  const start = Number(cue.startTime);
  const end = Number(cue.endTime);

  if (
    Number.isNaN(start) ||
    Number.isNaN(end)
  ) {
    return null;
  }

  const duration = end - start;

  if (duration <= 0) {
    return null;
  }

  return duration;
}