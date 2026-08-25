# Release 4 — Daily & Weekly Views

- Статус: **завершён**
- Предыдущий этап: Stage 3 — Filters & Context Pages (MVP complete)

## Реализовано

- Переключатель All / Daily / Weekly поверх единого набора Log Entry.
- Daily показывает выбранный календарный день как timeline с дневным разделителем.
- Weekly использует ISO-неделю Monday–Sunday в `Europe/Tallinn` и группирует записи по проектам.
- Запись с несколькими проектами присутствует в каждой соответствующей группе, но верхний total считает уникальные Log IDs.
- Записи без проекта собраны в отдельной группе «Без проекта».
- Для каждой проектной группы показаны счётчики Decision, Task, Question и открытых элементов.
- Previous / current / next переключают день или неделю.
- `view` и `date` сохраняются в URL вместе с фильтрами; ссылку можно скопировать и открыть на другом устройстве.
- Existing filters продолжают применяться к Daily и Weekly; произвольный date range остаётся в All.

## Правила периода

- Daily: `from = date`, `to = date`.
- Weekly: ISO Monday–Sunday для даты-якоря.
- API переводит календарные границы в UTC с учётом Tallinn DST.
- Периодные представления загружают до 200 записей на страницу; дальнейшая пагинация сохраняется.

## Проверено

- ISO week корректно пересекает границу года.
- Multi-project запись попадает во все проектные группы без изменения unique total.
- Daily, Weekly и period API routes отвечают успешно.
- Typecheck, lint, 18 tests и production build проходят.

## Не входит

- AI summary.
- Monthly/Quarterly charts.
- Work Item hierarchy и planning.

## Следующий этап

Release 5 — универсальные Work Items и дерево проекта.
