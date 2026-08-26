# Release 6 — Planning Scope & Team Priority

- Статус: **завершён**
- Предыдущий этап: Release 5.2.1 — Project Color Coding

## Результат

Planning стал командным межпроектным представлением. Для каждой Team можно выбрать набор Projects, после чего вкладка List показывает каждый Work Item один раз в едином глобальном priority order. Проектный фильтр сужает этот список, не создавая отдельного rank.

## Реализовано

- Durable Planning Scope: одна запись на Team и many-to-many набор Projects.
- Team selector и настройка scope непосредственно в Planning.
- `List` стал основной вкладкой; `Tree` остаётся представлением декомпозиции.
- Drag-and-drop в List меняет единый глобальный rank.
- Planning health проверяет повреждённые/повторяющиеся ranks, пустой scope, Projects в нескольких scopes и незаполненную design readiness.
- Для нарушенного rank доступно явное действие восстановления строгого порядка.
- Work Item получил независимые design readiness fields: owner, draft URL, target date и note.
- Design readiness компактно отображается в строке Work Item и редактируется отдельно от lifecycle и workflow stage.

## Решения

- Scope меняет состав представления, но не создаёт собственную систему приоритетов.
- Project может быть связан с несколькими scopes на уровне хранения, однако planning health отмечает это как конфликт для ручного исправления.
- Readiness-проверка включается для активных Work Items на стадиях Design, PBR и Engineering; требуются design owner и draft URL.
- Sprint assignment, calendar и board не входят в Release 6 и остаются Release 7.

## Проверка

- Миграция добавляет только новые таблицы и nullable/defaulted columns без пересоздания Work Items.
- Domain tests проверяют канонический rank и выявление конфликтов.
- API scope валидирует Team и Projects до записи.

## Следующий этап

Release 7 — Sprint settings, конкретные Sprint assignments и board Product / Design / PBR / Engineering.
