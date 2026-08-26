# Release 5 — Universal Work Items & Project Tree

- Статус: **завершён**
- Дата: 26 августа 2026
- Предыдущий этап: Release 4.2 — Teams & Membership

## Результат

Management Log теперь разделяет управленческий журнал и план работ, сохраняя между ними структурированную связь. В разделе «Планирование» доступны дерево декомпозиции и единая линейная очередь Work Items.

## Реализовано

### Доменная модель

- `work_items`: title, Markdown description, parent, lifecycle status, workflow stage, assignee, due date, глобальный rank и optional source Task-log.
- `work_item_projects`: many-to-many связь Work Item с Project.
- `work_item_links`: внешние ссылки с label и URL.
- `work_item_events`: базовый журнал created/updated/synced/detached для будущей ретроспективы.
- `app_settings`: default project.
- Lifecycle status отделён от workflow stage: `backlog / product / design / pbr / engineering`.
- Положение в дереве не определяет priority rank.

### Task-log → Work Item

- Новая запись Task автоматически создаёт связанный Work Item.
- Изменение title, description, status, assignee, due date, проектов и sources Task-log синхронизирует Work Item.
- `done/cancelled` Task преобразуется в соответствующий lifecycle status Work Item.
- Если Task меняет тип или удаляется, Work Item сохраняется, но связь с журналом снимается.
- При отсутствии `#project` применяется default project; если настройка ещё не задана, выбирается первый активный Project либо создаётся `General`.

### Tree

- Дерево поддерживает произвольную глубину, expand/collapse и создание дочерней задачи.
- Parent можно изменить в редакторе Work Item.
- Сервер запрещает назначить задачу собственным родителем или потомком.
- Удаление родителя с дочерними задачами запрещено до явного переноса детей.

### Backlog и rank

- Backlog показывает каждый Work Item один раз в общем глобальном порядке.
- Проектный backlog является фильтром того же порядка.
- Drag-and-drop меняет rank и безопасно ребалансирует последовательность.
- Rank хранится как строка фиксированной ширины и не показывается пользователю как числовой priority.
- Уникальный индекс не допускает duplicate ranks.

### UI и навигация

- Активирован раздел `Планирование`.
- Представления `Tree / Backlog`.
- Создание и редактирование title, description, projects, parent, lifecycle, workflow stage, assignee, due date и external links.
- Настройка default project доступна в planning toolbar.
- Страница Project содержит действие `Открыть backlog`.

## Проверка

- TypeScript, ESLint и production build проходят.
- 25 unit/API tests проходят.
- Тесты rank подтверждают строгий порядок и вставку между соседями.
- Тесты дерева подтверждают блокировку циклов и разрешение валидного переноса subtree.
- Миграция `0007_woozy_fantastic_four.sql` содержит все таблицы и индексы Release 5.

## Известные ограничения

- Release 5 даёт общий rank, но team-scoped priority, readiness и planning health относятся к Release 6.
- Sprint assignment относится к Release 7.
- UI истории Work Item events пока отсутствует.
- Drag-and-drop реализован для desktop Backlog; доступная keyboard reordering появится вместе с полноценным priority view.
- Dependencies, capacity и rollout пока не входят в модель.

## Следующий этап

По дополненному roadmap следующий небольшой этап — Release 5.1 Reviewable Imports & Jira Intake. После него Release 5.2 добавляет Context Export, а Release 6 развивает Work Items в team-scoped cross-project planning.
