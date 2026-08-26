import AppShell from "../app-shell";
import WorkItemsClient from "../work-items-client";

export default function PlanningPage() {
  return <AppShell active="planning" eyebrow="Release 5" title="Работа и приоритет" description={<>Единые Work Items: дерево декомпозиции и общий порядок исполнения для всех <code>#projects</code>.</>}><WorkItemsClient /></AppShell>;
}
