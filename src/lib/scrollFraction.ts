interface Args {
  scrollY: number;
  scrollHeight: number;
  viewportHeight: number;
}

export function computeScrollFraction({scrollY, scrollHeight, viewportHeight}: Args): number {
  const max = scrollHeight - viewportHeight;
  if (max <= 0) return 0;
  const raw = scrollY / max;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}
