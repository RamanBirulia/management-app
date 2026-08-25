# Release 4.1 — Completion Facts

- Статус: **завершён**
- Предыдущий этап: Release 4 — Daily & Weekly Views

## Реализовано

- Task в статусе Done хранит `completed_at` и `completed_by_person_id`.
- Question в статусе Resolved хранит `resolved_at` и `resolved_by_person_id`.
- При первом переходе в terminal status сервер фиксирует текущее время.
- Для Task поле «Завершил» по умолчанию получает assignee; его можно изменить.
- Для Question поле «Решил» выбирается явно.
- Повторное сохранение завершённой записи не меняет timestamp, но позволяет исправить человека.
- Переход обратно в Open/Unassigned/Cancelled очищает completion facts.
- Следующий Done/Resolved создаёт новый актуальный timestamp; история предыдущих циклов не хранится.
- В журнале факт показан компактно в нейтральной metadata-строке.
- Фильтры `completedFrom` и `completedTo` работают для Task и Question через общий completion interval.

## Данные и миграция

- `log_entries.completed_at`.
- `log_entries.completed_by_person_id`.
- `log_entries.resolved_at`.
- `log_entries.resolved_by_person_id`.
- Индексы по `completed_at` и `resolved_at`.
- Migration: `drizzle/0005_closed_lady_bullseye.sql`.

## Правила

- Выбранный Person должен существовать и быть active.
- `updated_at` не используется вместо completion timestamp.
- Измеряется календарное время `occurred_at → completed_at/resolved_at`; active work duration пока не вычисляется.
- Полная история смены статусов не входит в этот релиз.

## Проверено

- Create Done фиксирует timestamp и assignee.
- Done → Open очищает timestamp и person.
- Open → Done создаёт новый completion fact.
- Question использует отдельные resolved fields.
- Изменение человека без смены terminal status сохраняет первоначальное время.
- Completion date boundaries используют `Europe/Tallinn`.
- Typecheck, lint, tests и production build проходят.

## Следующий этап

Release 4.2 — Teams, membership и `@team` mentions.
