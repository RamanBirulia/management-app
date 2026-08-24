import type { ReactNode } from "react";
import Link from "next/link";

export default function AppShell({ active, eyebrow, title, description, children }: { active: "logs" | "directory" | "context"; eyebrow: string; title: string; description: ReactNode; children: ReactNode }) {
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark">ML</div><div><p className="eyebrow">Management Log</p><p className="workspace">Personal workspace</p></div>
      <nav aria-label="Основная навигация">
        <Link className={`nav-item ${active === "logs" ? "active" : ""}`} href="/">Журнал</Link>
        <Link className={`nav-item ${active === "directory" ? "active" : ""}`} href="/directory">Справочники</Link>
        <a className="nav-item disabled" href="#planning" aria-disabled="true">Планирование <span>позже</span></a>
      </nav>
      <div className="sidebar-note"><span className="pulse" />Этап 3 · MVP</div>
    </aside>
    <section className="content">
      <header className="topbar"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lead">{description}</p></div><div className="stage-badge"><span className="status-dot" /> Stage 3</div></header>
      {children}
    </section>
  </main>;
}
