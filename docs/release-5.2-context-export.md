# Release 5.2 — Context Export

- Статус: **завершён**
- Предыдущий этап: Release 5.1.1 — Technical Foundation

## Результат

Журнал экспортирует всю текущую выборку в versioned Markdown-compatible plain text. Экспорт учитывает типы, статусы, людей, команды, проекты, период и completion period, сохраняет обратную хронологию и не ограничивается загруженной страницей интерфейса.

## Возможности

- Действие `Экспорт` рядом с журналом.
- Точное количество записей до копирования или скачивания.
- Предпросмотр полного текста.
- `Скопировать как текст` и `Скачать .txt` используют один серверный результат.
- Title, description, status, assignee, due date, completion facts и source links входят в экспорт.
- Inline mentions остаются в переносимом виде `@alias` и `#alias`.
- Заголовок содержит формат `management-log-context/v1`, время экспорта и читаемое описание фильтров.
- Пустая выборка не создаёт файл.

## Архитектура

API журнала и экспорт используют общий query path. Экспорт последовательно читает все страницы через cursor pagination, поэтому UI pagination не влияет на состав результата. Форматирование вынесено в чистый domain-модуль и покрыто unit tests.

## Ограничения первой версии

- Только Markdown-compatible plain text; JSON, PDF и DOCX не входят в релиз.
- Экспорт planning order, Sprint и иерархии Work Items будет добавлен после появления полной Sprint model.
- Экспорт запускается явно и не отправляет данные во внешние AI-сервисы.

## Следующий этап

Release 6 — Planning Scope и team-scoped cross-project priority как основа Sprint planning.
