import DirectoryClient from "./directory-client";

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">ML</div>
        <div><p className="eyebrow">Management Log</p><p className="workspace">Personal workspace</p></div>
        <nav aria-label="Основная навигация">
          <a className="nav-item" href="#overview">Обзор</a>
          <a className="nav-item disabled" href="#logs" aria-disabled="true">Логи <span>этап 2</span></a>
          <a className="nav-item active" href="#directory">Справочники</a>
          <a className="nav-item disabled" href="#planning" aria-disabled="true">Планирование <span>позже</span></a>
        </nav>
        <div className="sidebar-note"><span className="pulse" />Этап 1 · directory</div>
      </aside>
      <section className="content" id="directory">
        <header className="topbar">
          <div><p className="eyebrow">Структурированный контекст</p><h1>Люди и проекты</h1><p className="lead">Стабильные справочники для будущих <code>@people</code> и <code>#projects</code> упоминаний.</p></div>
          <div className="stage-badge"><span className="status-dot" /> Stage 1</div>
        </header>
        <DirectoryClient />
      </section>
    </main>
  );
}
