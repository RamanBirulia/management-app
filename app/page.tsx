import AppShell from "./app-shell";
import LogsClient from "./logs-client";

export default function Home() {
  return <AppShell active="logs" eyebrow="Capture first" title="Управленческий журнал" description={<>Decision, Task и Question со структурированными <code>@people</code>, <code>#projects</code> и источниками.</>}><LogsClient /></AppShell>;
}
