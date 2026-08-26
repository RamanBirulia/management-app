import AppShell from "../app-shell";
import WorkItemsClient from "../work-items-client";

export default function PlanningPage() {
  return <AppShell active="planning" eyebrow="Release 6" title="Командный приоритет" description={<>Один строгий порядок Work Items для выбранной команды и её <code>#projects</code>, readiness и проверяемый planning health.</>}><WorkItemsClient /></AppShell>;
}
