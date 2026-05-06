export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number) => {
  let safeMinutes = Math.floor(minutes % 1440);
  if (safeMinutes < 0) {
    safeMinutes += 1440;
  }
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const minutesToAngle = (minutes: number) => (minutes / 1440) * 360;
export const angleToMinutes = (angle: number) => Math.round((angle / 360) * 1440);
