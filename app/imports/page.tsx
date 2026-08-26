import AppShell from "../app-shell";
import ImportsClient from "./imports-client";

export default function ImportsPage() {
  return <AppShell active="imports" eyebrow="Release 5.1" title="Проверяемый импорт" description="Внешний текст и Jira intake сначала становятся предложениями. В журнал они попадут только после вашего подтверждения."><ImportsClient /></AppShell>;
}
