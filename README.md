# Management Log & Planning

Персональная система управленческого контекста, решений и планирования.

Проект развивается вертикальными релизами: сначала быстрый серверный журнал для ежедневной фиксации решений, вопросов и поручений, затем контекстные представления, планирование и периодические обзоры.

## Текущее состояние

**Release 4.2 — Teams & Membership завершён.** Приложение поддерживает ежедневную фиксацию, восстановление, периодический обзор, completion facts и команды:

- frontend на React/TypeScript;
- Node.js/Fastify API с `/health/live`, `/health/ready` и `/api/meta`;
- PostgreSQL и первая миграция для системных настроек;
- Docker Compose и Caddy для production-like запуска;
- проверка типов, lint, unit-тесты и deployment build;
- опубликованная тестовая версия: https://management-log.raman-birulia.chatgpt.site/.
- создание, редактирование, архивация и восстановление людей и проектов;
- case-insensitive aliases и slugs для будущих `@people` и `#projects`;
- серверная D1-база опубликованной Sites-версии и SQLite migration.
- Decision, Task и Question в едином журнале;
- `@people`/`#projects` autocomplete и структурированные связи;
- source-ссылки, assignee, due date и type-specific statuses;
- редактирование, подтверждаемое удаление и пагинация.
- shareable-фильтры по типу, статусу, людям, проектам и периоду;
- контекстные страницы людей и проектов на основе единого журнала.
- Daily timeline с навигацией по дням;
- Weekly review с группировкой по проектам и уникальным total.
- последнее время и ответственный за Done/Resolved;
- фильтрация по диапазону дат завершения.
- команды и many-to-many membership;
- общий namespace `@` для людей и команд;
- Team mentions с popover актуального состава.

Следующий продуктовый этап — **Release 5: универсальные Work Items и дерево проекта**. После него запланированы **Release 5.1: Reviewable Imports & Jira Intake** и **Release 5.2: Context Export**. Модель общего приоритета и Sprint planning уточнена отдельным addendum для Release 5–7.

## Документация

- [Навигация по документации](docs/README.md)
- [Product Vision V1](docs/management_log_product_vision_v1.docx)
- [Отчёт о Stage 0](docs/stage-0-foundation.md)
- [Отчёт о Stage 1](docs/stage-1-people-projects.md)
- [ADR-001: D1 для Sites runtime](docs/decisions/001-sites-d1-runtime.md)
- [Отчёт о Stage 2](docs/stage-2-composer-journal.md)
- [Отчёт о Stage 3](docs/stage-3-filters-context.md)
- [Отчёт о Release 4](docs/release-4-daily-weekly.md)
- [Roadmap Addendum: Teams & Completion Facts](docs/roadmap-addendum-teams-completion.md)
- [Roadmap Addendum: Reviewable Imports & Jira Intake](docs/roadmap-addendum-reviewable-imports.md)
- [Roadmap Addendum: Context Export](docs/roadmap-addendum-context-export.md)
- [Roadmap Addendum: Cross-functional Priority & Sprint Planning](docs/roadmap-addendum-priority-sprint-planning.md)
- [Отчёт о Release 4.1](docs/release-4.1-completion-facts.md)
- [Отчёт о Release 4.2](docs/release-4.2-teams-membership.md)

Product Vision является основным источником продуктовых требований. Отчёт Stage 0 фиксирует фактически реализованный baseline и известные ограничения.

## Локальная разработка

Требования: Node.js 22.13+, npm и PostgreSQL.

```bash
npm ci
npm run dev
npm run api:dev
```

API ожидает `DATABASE_URL`. Переменные окружения перечислены в `.env.example`.

## Проверка

```bash
npm run verify
docker compose config
```

## Production-like запуск

Скопируйте `.env.example` в `.env`, задайте безопасный пароль базы данных и `APP_HOST`, затем выполните:

```bash
docker compose up --build -d
```

После запуска проверьте `/health/live` и `/health/ready` через публичный домен. PostgreSQL не публикуется наружу; единственной публичной точкой входа остаётся Caddy.

На этапе тестовых данных аутентификация намеренно отключена. До загрузки реальных управленческих данных необходимо ограничить доступ и реализовать согласованный механизм входа.
