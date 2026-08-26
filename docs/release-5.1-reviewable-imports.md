# Release 5.1 — Reviewable Imports & Jira Intake

- Статус: **завершён**
- Дата: 26 августа 2026
- Предыдущий этап: Release 5 — Universal Work Items & Project Tree

## Результат

Добавлен безопасный intake внешнего контекста: импорт создаёт только предложения, а каноническая запись Decision, Task или Question появляется после отдельного подтверждения. Подтверждённый Task проходит существующий путь синхронизации в Work Item.

## Реализовано

- Versioned contract `formatVersion: 1` и компактный plain-text формат `Decision: / Task: / Question:`.
- `ImportBatch` и `ImportSuggestion` с provenance, состояниями pending/approved/rejected и ссылкой на канонический log.
- Review UI `/imports` с отдельными действиями «Да, добавить» и «Нет» для каждой карточки.
- Content hash делает повтор одного batch идемпотентным.
- Jira `externalKey` хранится с namespace источника и не импортируется повторно.
- `@people`, `@teams` и `#projects` разрешаются существующим механизмом только в момент approve.
- Project skill `skills/management-log-import/SKILL.md` готовит JSON, но никогда не пишет напрямую в журнал.

## Решения первой версии

- Raw text внутри сайта разбирается только детерминированно по явным префиксам; AI-анализ выполняется отдельно через skill.
- Jira поддерживается как ручной intake JSON/CSV-подготовки без OAuth и фоновой синхронизации.
- Отклонённые предложения сохраняются как минимальный audit trail.

## Следующий этап

Release 5.2 — экспорт текущей отфильтрованной выборки в переносимый plain text.
