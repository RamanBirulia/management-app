export type DirectoryStatus = "active" | "archived";
export type ProjectColor = "amber" | "coral" | "purple" | "rose" | "graphite" | "brown";
export const PROJECT_COLORS: Array<{ value: ProjectColor; label: string; hex: string }> = [
  { value: "amber", label: "Янтарный", hex: "#c4872f" }, { value: "coral", label: "Коралловый", hex: "#c4624f" },
  { value: "purple", label: "Фиолетовый", hex: "#8064a9" }, { value: "rose", label: "Розовый", hex: "#ad607c" },
  { value: "graphite", label: "Графитовый", hex: "#69747b" }, { value: "brown", label: "Коричневый", hex: "#8a6852" },
];
export function isProjectColor(value: unknown): value is ProjectColor { return PROJECT_COLORS.some((item) => item.value === value); }
export function projectColorHex(value: ProjectColor) { return PROJECT_COLORS.find((item) => item.value === value)?.hex ?? PROJECT_COLORS[0].hex; }
export function defaultProjectColor(seed: string): ProjectColor { let hash = 0; for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0; return PROJECT_COLORS[hash % PROJECT_COLORS.length].value; }

export type Person = {
  id: string;
  displayName: string;
  alias: string;
  note: string;
  status: DirectoryStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  color: ProjectColor;
  note: string;
  status: DirectoryStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type TeamMember = Pick<Person, "id" | "displayName" | "alias" | "status">;

export type Team = {
  id: string;
  name: string;
  alias: string;
  note: string;
  status: DirectoryStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  people: TeamMember[];
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
