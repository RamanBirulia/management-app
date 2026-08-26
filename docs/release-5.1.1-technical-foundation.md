# Release 5.1.1 — Technical Foundation

- Статус: **завершён**
- Предыдущий этап: Release 5.1 — Reviewable Imports & Jira Intake

## Цель

Остановить накопление инфраструктурного долга до Context Export, team-scoped priority и Sprint planning. Пользовательская модель не меняется; релиз укрепляет хранение, write-flow, audit и границы API.

## Scope

- Drizzle migrations становятся единственным источником изменения production schema; request-time bootstrap больше не создаёт и не изменяет таблицы.
- Основные связи получают foreign keys с явными `CASCADE / RESTRICT / SET NULL` правилами.
- Write actions сохраняют actor из platform-authenticated headers.
- Создание канонического Log используется журналом и Import approve через один application service.
- Task → Work Item синхронизация получает durable outbox и безопасный повтор после частичного сбоя.
- Import contract v1 валидируется Zod целиком, включая source URLs и Jira keys.
- Hydration связанных сущностей выполняется за линейное время; API получает cursor boundary для больших журналов.
- Добавляются integration-oriented tests для новых invariants.

## Ограничения

- Приложение остаётся owner-only и single-workspace; полноценный `workspace_id` вводится вместе с моделью Planning Scope до multi-user открытия.
- D1 остаётся production datastore. Переезд на PostgreSQL не является целью этого этапа.
- Background scheduler для outbox не добавляется: очередь повторяется синхронно на связанных write/read flows и остаётся наблюдаемой в базе.

## Критерии приёмки

- Новая production schema разворачивается только миграциями и проходит локальный build.
- Нельзя оставить orphan relation обычными API-операциями.
- Import approve и обычное создание используют одинаковые правила canonical Log.
- Повторный import или повторная обработка outbox не создают второй Work Item.
- Audit actor сохраняется при наличии platform headers и остаётся nullable в локальной разработке.
- Все существующие и новые тесты проходят.

## Результат проверки

- Полная цепочка migrations `0000–0012` применена к пустой SQLite базе без ошибок.
- Upgrade `0009–0011` отдельно проверен на базе с существующими связями Log, People, Team, Project, Work Item, links, events и ImportSuggestion; данные сохранены, `foreign_key_check` пуст.
- Query planner использует составной индекс `type / occurred_at / id` для типового journal filter.
- Локальный runtime отвечает `200` на Imports API, а небезопасный `javascript:` source отклоняется с `400`.
- TypeScript, ESLint, 27 unit/API tests и production build проходят.

## Следующий этап

Release 5.2 — Context Export. Перед multi-user доступом и Release 6 отдельно вводятся `workspace_id` и явная сущность Planning Scope.
