type MentionHandles = { people: string[]; projects: string[] };

export function extractMentionHandles(content: string): MentionHandles {
  const people = [...content.matchAll(/(?:^|[\s([{])@([a-z0-9][a-z0-9._-]{1,39})(?=$|[\s)\]},.!?;:])/gi)].map((match) => match[1].toLowerCase());
  const projects = [...content.matchAll(/(?:^|[\s([{])#([a-z0-9][a-z0-9_-]{1,39})(?!\.[a-z0-9_-])(?=$|[\s)\]},.!?;:])/gi)].map((match) => match[1].toLowerCase());
  return { people: [...new Set(people)], projects: [...new Set(projects)] };
}

async function existingHandles(db: D1Database, table: "people" | "teams" | "projects", column: "alias" | "slug", handles: string[]) {
  if (!handles.length) return [] as { id: string; handle: string }[];
  const placeholders = handles.map(() => "?").join(",");
  const result = await db.prepare(`SELECT id, ${column} AS handle FROM ${table} WHERE ${column} IN (${placeholders})`).bind(...handles).all<{ id: string; handle: string }>();
  return result.results;
}

export async function resolveMentionIds(db: D1Database, content: string, explicitPersonIds: string[] = [], explicitProjectIds: string[] = [], explicitTeamIds: string[] = []) {
  const handles = extractMentionHandles(content);
  const [knownPeople, knownTeams, knownProjects] = await Promise.all([
    existingHandles(db, "people", "alias", handles.people), existingHandles(db, "teams", "alias", handles.people), existingHandles(db, "projects", "slug", handles.projects),
  ]);
  const knownPeopleByHandle = new Map(knownPeople.map((item) => [item.handle, item.id]));
  const knownTeamsByHandle = new Map(knownTeams.map((item) => [item.handle, item.id]));
  const knownProjectsByHandle = new Map(knownProjects.map((item) => [item.handle, item.id]));
  const inserts: D1PreparedStatement[] = [];

  for (const alias of handles.people) {
    if (!knownPeopleByHandle.has(alias) && !knownTeamsByHandle.has(alias)) {
      const id = crypto.randomUUID(); knownPeopleByHandle.set(alias, id);
      inserts.push(db.prepare("INSERT INTO people (id, display_name, alias) VALUES (?, ?, ?)").bind(id, alias, alias));
    }
  }
  for (const slug of handles.projects) {
    if (!knownProjectsByHandle.has(slug)) {
      const id = crypto.randomUUID(); knownProjectsByHandle.set(slug, id);
      inserts.push(db.prepare("INSERT INTO projects (id, name, slug) VALUES (?, ?, ?)").bind(id, slug, slug));
    }
  }
  if (inserts.length) await db.batch(inserts);

  return {
    personIds: [...new Set([...explicitPersonIds, ...knownPeopleByHandle.values()])],
    projectIds: [...new Set([...explicitProjectIds, ...knownProjectsByHandle.values()])],
    teamIds: [...new Set([...explicitTeamIds, ...knownTeamsByHandle.values()])],
  };
}
