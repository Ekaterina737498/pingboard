export function parseTrustProxy(value: string | undefined): number {
  const hops = Number(value);
  return Number.isInteger(hops) && hops > 0 ? hops : 0;
}
