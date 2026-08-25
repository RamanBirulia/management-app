# Roadmap Addendum — Teams & Completion Facts

- Статус: **Release 4.1 и Release 4.2 завершены**
- Основание: наблюдения после Release 4
- Положение в roadmap: два коротких этапа перед исходным Release 5 (Work Items)

Этот addendum расширяет Product Vision V1, не изменяя scope уже завершённых этапов. Исходный Release 5 начинается после двух этапов ниже.

## Release 4.1 — Completion facts для Task и Question — **завершён**

### Результат релиза

Для завершённой задачи или решённого вопроса можно восстановить не только текущий статус, но и кто и когда завершил последний актуальный цикл.

### Что сделать

- Для Task хранить `completed_at` и `completed_by_person_id`.
- Для Question хранить `resolved_at` и `resolved_by_person_id`.
- При переходе Task в `done` сервер фиксирует текущее время; `completed by` по умолчанию равен assignee, но пользователь может выбрать другого человека.
- При переходе Question в `resolved` пользователь выбирает человека, который закрыл вопрос. До появления авторизованных пользователей это явная ссылка на Person, а не «текущий пользователь».
- Если запись снова открыта, timestamp и person очищаются.
- Следующий переход в terminal status записывает новый timestamp и person. Хранится только последнее актуальное завершение, без полной истории переходов.
- В карточке и контекстных представлениях показывать компактное нейтральное уточнение: `done 25 авг, 16:40 · @Roman` или `resolved 25 авг, 16:40 · @Roman`.
- Добавить фильтры по диапазону completion/resolution date для будущих обзоров.

### Зафиксированная семантика

- `updated_at` остаётся временем любого редактирования и не заменяет completion timestamp.
- `occurred_at → completed_at` позволяет считать календарное время от постановки до завершения.
- Реальное время активной работы пока не рассчитывается: для него понадобится отдельная семантика `started_at`/`in_progress`, которой сейчас нет.
- Переход `done → open → done` не создаёт историю; после второго Done хранится только второй факт завершения.

### Как принять и протестировать

- Перевести Task в Done и проверить timestamp и человека после reload.
- Вернуть Task в Open: completion fields очищены.
- Снова перевести в Done другим человеком: сохранены только новые значения.
- Повторить тот же сценарий для Question Open/Resolved.
- Изменить текст завершённой записи: completion timestamp не меняется.

## Release 4.2 — Teams, membership и `@team` mentions — **завершён**

### Результат релиза

Можно создать команду, включить в неё нескольких людей, упомянуть команду через `@alias` и быстро увидеть, к кому обратиться.

### Доменная модель

- `teams`: immutable ID, display name, уникальный alias, note, active/archived lifecycle, timestamps.
- `team_people`: many-to-many membership между Team и Person.
- `log_teams`: структурированная связь Log Entry → Team.
- Один человек может входить в несколько команд.
- Person и Team используют общий case-insensitive namespace `@`; одинаковый alias у человека и команды запрещён, чтобы mention всегда был однозначным.
- Изменение состава Team не переписывает Log Entry: лог хранит Team ID, а hover-card показывает актуальный состав команды.

### Справочник

- Разделить справочник на People / Teams / Projects.
- Team CRUD: название, alias, note, список участников, archive/restore.
- В карточке Person заменить отдельные кнопки на меню `⋯`: `Изменить`, `В архив`, `Добавить в команду`.
- `Добавить в команду` открывает выбор активной Team и подтверждение.
- В карточке и контекстной странице Person показывать все команды человека; membership можно удалить.
- В карточке Team показывать участников столбцом и позволять добавлять/удалять людей.

### Journal и mentions

- Autocomplete после `@` ищет одновременно People и Teams и визуально отмечает тип результата.
- `@team` рендерится inline отдельно от Person mention, но в той же спокойной цветовой системе.
- Hover/focus на Team mention открывает небольшой popover со списком активных участников в столбик.
- Popover доступен клавиатурой и не зависит только от hover.
- Двойной клик по Team mention открывает редактирование Team, как сейчас для Person.
- Архивная Team не предлагается в autocomplete, но старые mentions и прямые ссылки остаются читаемыми.

### Как принять и протестировать

- Создать Team из трёх People и увидеть membership с обеих сторон.
- Добавить Person через меню `⋯ → Добавить в команду` и проверить после reload.
- Упомянуть Person и Team в одной записи; после сохранения обе связи имеют разные immutable IDs.
- Навести указатель и перевести keyboard focus на Team mention: список участников одинаков.
- Переименовать Team: старые записи показывают новое имя.
- Попробовать создать Team с alias существующего Person и получить понятную collision error.
- Архивировать Team: она исчезает из autocomplete, но остаётся читаемой в старом логе.

## Последовательность после addendum

1. Release 4.1 — Completion facts.
2. Release 4.2 — Teams & membership.
3. Release 5 — Work Items и дерево проекта из Product Vision V1.
4. Release 5.1 — Reviewable Imports & Jira Intake.
5. Release 5.2 — Context Export.
6. Release 6 — единый cross-project priority и planning health.
7. Release 7 — Sprint settings и представления List / Sprints.
8. Последующие релизы Product Vision продолжаются без перенумерации.

Модель Release 5–7 уточнена в [Cross-functional Priority & Sprint Planning](roadmap-addendum-priority-sprint-planning.md).

## Не входит

- История всех membership changes.
- Роли внутри команды, team leads и проценты allocation.
- Автоматическое раскрытие Team mention в отдельные Person relations.
- Полная история переходов Task/Question между статусами.
- Учёт фактически затраченных часов.
