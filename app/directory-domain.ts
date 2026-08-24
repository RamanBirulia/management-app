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
  const pattern = label === "alias"
    ? /^[a-z0-9][a-z0-9._-]{1,39}$/
    : /^[a-z0-9][a-z0-9_-]{1,39}$/;
  if (!pattern.test(normalized)) {
    const symbols = label === "alias" ? "точки, _ или -" : "_ или -";
    return `${label} должен содержать 2–40 латинских букв, цифр, ${symbols}`;
  }
  return null;
}

function generateHandle(value: string, separator: "." | "_") {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, separator)
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/[._-]+/g, separator)
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 40);
}

export function generatePersonAlias(displayName: string) {
  return generateHandle(displayName, ".");
}

export function generateProjectSlug(name: string) {
  return generateHandle(name, "_");
}

export function isUniqueViolation(error: unknown) {
  return error instanceof Error && /unique constraint|SQLITE_CONSTRAINT/i.test(error.message);
}
