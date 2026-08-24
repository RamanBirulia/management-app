# Stage 2 — MVP Composer & Journal

- Статус: **завершён**
- Product Vision: V1
- Предыдущий этап: Stage 1 — People & Projects

## Цель этапа

Запустить первый ежедневный продуктовый сценарий: быстро фиксировать Decision, Task и Question, связывать запись с людьми, проектами и источниками и восстанавливать её после перезагрузки.

## Пользовательские возможности

- Composer с выбором Decision / Task / Question.
- Дата и время события с текущим временем по умолчанию.
- `@people` и `#projects` autocomplete с клавиатурной навигацией.
- Структурированные связи с immutable IDs людей и проектов.
- Для Task: status, assignee и due date.
- Для Question: open/resolved status.
- Несколько source-ссылок с label и валидным HTTP(S) URL.
- Единый All Logs в обратной хронологии.
- Постраничная загрузка по 20 записей.
- Редактирование всей записи и подтверждаемое удаление.
- Защита от повторной отправки; при сетевой ошибке composer сохраняет черновик.
- Отдельный раздел справочников Stage 1.

## Данные и API

- `log_entries`: основной текст, тип, occurred_at, type-specific status, assignee и due date.
- `log_people`, `log_projects`: структурированные many-to-many связи.
- `sources`: несколько ссылок на одну запись.
- `GET/POST /api/logs`.
- `PATCH/DELETE /api/logs/:id`.
- Migration: `drizzle/0002_magenta_tyrannus.sql`.
- Индексы: `drizzle/0003_sour_stone_men.sql`.

## Правила

- Текст записи обязателен и ограничен 5 000 символами.
- Source URL принимает только `http` и `https`.
- Decision не имеет status.
- Task status: unassigned/open/done/cancelled.
- Question status: open/resolved.
- Связи записываются как IDs, а не восстанавливаются из текста при чтении.
- Hard delete удаляет запись и её relation/source rows только после подтверждения.

## Проверено

- Round-trip всех трёх типов записей.
- Decision с человеком, проектом и source-ссылкой.
- Task с assignee, due date, сменой статуса и source-ссылкой.
- Question create/delete.
- Редактирование пересоздаёт структурированные связи и сохраняет основной ID.
- Validation, typecheck, lint, API tests и deployment build.

## Не входит

- Фильтры и shareable query URL.
- Контекстные страницы человека и проекта.
- Daily/Weekly views.
- Rich text, attachments, reminders, comments и recurring tasks.

## Следующий этап

Stage 3 — фильтры All Logs, URL query params, страницы человека и проекта, empty/loading/error states и завершение MVP.
