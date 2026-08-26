import AppShell from "../app-shell";
import DirectoryClient from "../directory-client";

export default function DirectoryPage() {
  return <AppShell active="directory" eyebrow="Структурированный контекст" title="Люди, команды и проекты" description={<>Стабильные справочники для <code>@people</code>, <code>@teams</code> и <code>#projects</code>.</>}><DirectoryClient /></AppShell>;
}
