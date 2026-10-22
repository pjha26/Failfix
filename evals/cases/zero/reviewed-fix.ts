export function retryCount(value: number | undefined): number {
  return value ?? 3;
}
