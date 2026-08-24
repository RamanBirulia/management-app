const foundations = [
  { label: "Web", value: "React + Tailwind", state: "готово" },
  { label: "API", value: "Node.js + Fastify", state: "готово" },
  { label: "Data", value: "PostgreSQL + migrations", state: "готово" },
  { label: "Edge", value: "Caddy reverse proxy", state: "готово" },
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">ML</div>
        <div><p className="eyebrow">Management Log</p><p className="workspace">Personal workspace</p></div>
        <nav aria-label="Основная навигация">
          <a className="nav-item active" href="#overview">Обзор</a>
          <a className="nav-item disabled" href="#logs" aria-disabled="true">Логи <span>скоро</span></a>
          <a className="nav-item disabled" href="#people" aria-disabled="true">Люди <span>скоро</span></a>
          <a className="nav-item disabled" href="#projects" aria-disabled="true">Проекты <span>скоро</span></a>
        </nav>
        <div className="sidebar-note"><span className="pulse" />Этап 0 · foundation</div>
      </aside>
      <section className="content" id="overview">
        <header className="topbar">
          <div><p className="eyebrow">24 августа 2026</p><h1>Каркас готов к первым данным</h1></div>
          <div className="environment"><span className="status-dot" /> development</div>
        </header>
        <div className="notice">
          <div className="notice-icon">✓</div>
          <div><strong>Этап 0 завершён на уровне кода</strong><p>Frontend, API, база, health checks и deployment-конфигурация собраны в одном проекте.</p></div>
        </div>
        <section className="section-block" aria-labelledby="foundation-title">
          <div className="section-heading"><div><p className="eyebrow">Foundation</p><h2 id="foundation-title">Компоненты системы</h2></div><span className="counter">4 / 4</span></div>
          <div className="foundation-grid">
            {foundations.map((item) => <article className="foundation-card" key={item.label}><div className="card-top"><span>{item.label}</span><span className="ready">{item.state}</span></div><strong>{item.value}</strong><div className="progress"><span /></div></article>)}
          </div>
        </section>
        <section className="next-step">
          <div><p className="eyebrow">Следующий вертикальный slice</p><h2>Люди и проекты</h2><p>Создать стабильные сущности для будущих <code>@mentions</code> и <code>#projects</code>.</p></div>
          <span className="step-number">01</span>
        </section>
      </section>
    </main>
  );
}
