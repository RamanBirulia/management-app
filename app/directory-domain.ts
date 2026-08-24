export type DirectoryStatus = "active" | "archived";

export type Person = {
  id: string;
  displayName: string;
  alias: string;
  status: DirectoryStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  status: DirectoryStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export function normalizeHandle(value: string) {
  return value.trim().replace(/^[@#]/, "").toLowerCase();
}

export function validateHandle(value: string, label: "alias" | "slug") {
  const normalized = normalizeHandle(value);
  if (!normalized) return `${label} обязателен`;
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(normalized)) {
    return `${label} должен содержать 2–40 латинских букв, цифр, _ или -`;
  }
  return null;
}

export function isUniqueViolation(error: unknown) {
  return error instanceof Error && /unique constraint|SQLITE_CONSTRAINT/i.test(error.message);
}
