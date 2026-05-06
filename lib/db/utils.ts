export function createId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();

  if (randomId) {
    return `${prefix}-${randomId}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getNowIsoString(): string {
  return new Date().toISOString();
}

export function toSqliteBoolean(value: boolean): number {
  return value ? 1 : 0;
}

export function fromSqliteBoolean(value: number | boolean): boolean {
  return value === true || value === 1;
}
