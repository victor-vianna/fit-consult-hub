export type InterfaceMemoryStorage = "local" | "session";

export type InterfaceMemoryRecord<T> = {
  version: number;
  status: "in_progress";
  data: T;
  open: boolean;
  startedAt: string;
  updatedAt: string;
};

type BuildKeyParams = {
  scope: string;
  version: number;
};

type ReadParams<T> = BuildKeyParams & {
  storage?: InterfaceMemoryStorage;
  ttlMs?: number;
  hasContent: (data: T) => boolean;
};

type WriteParams<T> = BuildKeyParams & {
  storage?: InterfaceMemoryStorage;
  data: T;
  open?: boolean;
  hasContent: (data: T) => boolean;
};

type ClearParams = BuildKeyParams & {
  storage?: InterfaceMemoryStorage;
};

export function buildInterfaceMemoryKey({ scope, version }: BuildKeyParams) {
  return `pf:interface-memory:${scope}:v${version}`;
}

export function readInterfaceMemory<T>({
  scope,
  version,
  storage = "local",
  ttlMs,
  hasContent,
}: ReadParams<T>): InterfaceMemoryRecord<T> | null {
  const storageObj = getStorage(storage);
  if (!storageObj) return null;

  const key = buildInterfaceMemoryKey({ scope, version });

  try {
    const raw = storageObj.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<InterfaceMemoryRecord<T>>;
    if (
      parsed.version !== version ||
      parsed.status !== "in_progress" ||
      !parsed.data ||
      !hasContent(parsed.data)
    ) {
      storageObj.removeItem(key);
      return null;
    }

    if (ttlMs && isExpired(parsed.updatedAt, ttlMs)) {
      storageObj.removeItem(key);
      return null;
    }

    return {
      version,
      status: "in_progress",
      data: parsed.data,
      open: Boolean(parsed.open),
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : new Date().toISOString(),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    storageObj.removeItem(key);
    return null;
  }
}

export function writeInterfaceMemory<T>({
  scope,
  version,
  storage = "local",
  data,
  open = true,
  hasContent,
}: WriteParams<T>) {
  const storageObj = getStorage(storage);
  if (!storageObj) return;

  const key = buildInterfaceMemoryKey({ scope, version });

  try {
    if (!hasContent(data)) {
      storageObj.removeItem(key);
      return;
    }

    const previous = readInterfaceMemory<T>({ scope, version, storage, hasContent });
    const now = new Date().toISOString();
    const record: InterfaceMemoryRecord<T> = {
      version,
      status: "in_progress",
      data,
      open,
      startedAt: previous?.startedAt ?? now,
      updatedAt: now,
    };

    storageObj.setItem(key, JSON.stringify(record));
  } catch {
    // best-effort cache
  }
}

export function clearInterfaceMemory({ scope, version, storage = "local" }: ClearParams) {
  const storageObj = getStorage(storage);
  if (!storageObj) return;

  try {
    storageObj.removeItem(buildInterfaceMemoryKey({ scope, version }));
  } catch {
    // storage can be blocked
  }
}

export function hasMeaningfulValues(
  values: Record<string, unknown>,
  ignoredKeys: Iterable<string> = []
) {
  const ignored = new Set(ignoredKeys);

  return Object.entries(values).some(([key, value]) => {
    if (ignored.has(key)) return false;
    return hasMeaningfulValue(value);
  });
}

export function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === "object") return hasMeaningfulValues(value as Record<string, unknown>);
  return true;
}

function getStorage(storage: InterfaceMemoryStorage) {
  if (typeof window === "undefined") return null;
  return storage === "session" ? window.sessionStorage : window.localStorage;
}

function isExpired(updatedAt: unknown, ttlMs: number) {
  if (typeof updatedAt !== "string") return false;
  const updatedTime = new Date(updatedAt).getTime();
  return Number.isFinite(updatedTime) && Date.now() - updatedTime > ttlMs;
}
