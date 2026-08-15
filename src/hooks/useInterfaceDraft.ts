import { useCallback, useMemo, useState } from "react";
import {
  clearInterfaceMemory,
  readInterfaceMemory,
  writeInterfaceMemory,
  type InterfaceMemoryStorage,
} from "@/utils/interfaceMemory";

type Params<T> = {
  scope: string;
  version: number;
  hasContent: (data: T) => boolean;
  storage?: InterfaceMemoryStorage;
  ttlMs?: number;
};

export function useInterfaceDraft<T>({
  scope,
  version,
  hasContent,
  storage = "local",
  ttlMs,
}: Params<T>) {
  const options = useMemo(
    () => ({ scope, version, storage, ttlMs, hasContent }),
    [scope, version, storage, ttlMs, hasContent]
  );
  const [record, setRecord] = useState(() => readInterfaceMemory<T>(options));

  const refresh = useCallback(() => {
    const next = readInterfaceMemory<T>(options);
    setRecord(next);
    return next;
  }, [options]);

  const persist = useCallback(
    (data: T, open = true) => {
      writeInterfaceMemory({ scope, version, storage, data, open, hasContent });
      setRecord(readInterfaceMemory<T>(options));
    },
    [hasContent, options, scope, storage, version]
  );

  const clear = useCallback(() => {
    clearInterfaceMemory({ scope, version, storage });
    setRecord(null);
  }, [scope, storage, version]);

  return {
    record,
    data: record?.data ?? null,
    shouldRestoreOpen: Boolean(record?.open),
    refresh,
    persist,
    clear,
  };
}
