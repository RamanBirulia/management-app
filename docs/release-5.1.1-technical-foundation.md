# Release 5.1.1 — Technical Foundation

- Статус: **завершён**
- Предыдущий этап: Release 5.1 — Reviewable Imports & Jira Intake

## Цель

Остановить накопление инфраструктурного долга до Context Export, team-scoped priority и Sprint planning. Пользовательская модель не меняется; релиз укрепляет хранение, write-flow, audit и границы API.

## Scope

- Drizzle migrations становятся единственным источником изменения production schema; request-time bootstrap больше не создаёт и не изменяет таблицы.
- Все write flows проходят через canonical services, которые проверяют ссылки и выполняют явные cleanup-операции.
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
- Добавление native foreign keys в существующие D1-таблицы потребовало бы их пересоздания, а Sites migration runner не принимает составные SQLite triggers. Поэтому текущий online-upgrade остаётся аддитивным, referential integrity существующих таблиц обеспечивают canonical application services. Для новых таблиц native foreign keys должны создаваться сразу; перенос старых связей остаётся отдельной shadow-table миграцией.

## Критерии приёмки

- Новая production schema разворачивается только миграциями и проходит локальный build.
- Нельзя оставить orphan relation обычными API-операциями через canonical services.
- Import approve и обычное создание используют одинаковые правила canonical Log.
- Повторный import или повторная обработка outbox не создают второй Work Item.
- Audit actor сохраняется при наличии platform headers и остаётся nullable в локальной разработке.
- Все существующие и новые тесты проходят.

## Результат проверки

- Полная цепочка migrations `0000–0012` применена к пустой SQLite базе без ошибок.
- Upgrade `0009–0012` отдельно проверен на базе с существующими связями Log, People, Team, Project, Work Item, links, events и ImportSuggestion; данные сохранены без destructive table rebuild.
- Query planner использует составной индекс `type / occurred_at / id` для типового journal filter.
- Локальный runtime отвечает `200` на Imports API, а небезопасный `javascript:` source отклоняется с `400`.
- TypeScript, ESLint, 27 unit/API tests и production build проходят.

## Следующий этап

Release 5.2 — Context Export. Перед multi-user доступом и Release 6 отдельно вводятся `workspace_id` и явная сущность Planning Scope.
