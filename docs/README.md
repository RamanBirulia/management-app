# Документация Management Log

Эта папка хранит продуктовый замысел, состояние реализованных этапов и будущие технические решения проекта.

## Основные документы

1. [Product Vision V1](management_log_product_vision_v1.docx) — основной источник продуктового контекста: проблема, гипотеза, доменная модель, границы MVP, архитектурные рекомендации и roadmap.
2. [Stage 0 — Foundation](stage-0-foundation.md) — фактически реализованный baseline, способ проверки и ограничения этапа.
3. [Stage 1 — People & Projects](stage-1-people-projects.md) — справочники людей и проектов, API, хранение данных и критерии приёмки.
4. [Stage 2 — Composer & Journal](stage-2-composer-journal.md) — ежедневная фиксация Decision, Task и Question.
5. [Stage 3 — Filters & Context Pages](stage-3-filters-context.md) — shareable-фильтры и страницы контекста человека/проекта.
6. [Release 4 — Daily & Weekly Views](release-4-daily-weekly.md) — дневной timeline и недельный обзор по проектам.
7. [Roadmap Addendum — Teams & Completion Facts](roadmap-addendum-teams-completion.md) — запланированные Release 4.1 и 4.2 перед Work Items.
8. [Release 4.1 — Completion Facts](release-4.1-completion-facts.md) — последнее завершение Task/Question и ответственный Person.
9. [Release 4.2 — Teams & Membership](release-4.2-teams-membership.md) — команды, membership, общий `@` namespace и Team mentions.
10. [Release 5 — Universal Work Items & Project Tree](release-5-work-items.md) — связанный с Task-log план работ, дерево и общий backlog.
11. [Roadmap Addendum — Reviewable Imports & Jira Intake](roadmap-addendum-reviewable-imports.md) — безопасный импорт AI-предложений, транскриптов и задач Jira с обязательным подтверждением.
12. [Roadmap Addendum — Context Export](roadmap-addendum-context-export.md) — экспорт текущей выборки в plain text для анализа, принятия решений и планирования.
13. [Roadmap Addendum — Cross-functional Priority & Sprint Planning](roadmap-addendum-priority-sprint-planning.md) — уточнённая модель Work Items, общего приоритета, стадий и sprint calendar для Release 5–7.
14. [Release 5.1 — Reviewable Imports & Jira Intake](release-5.1-reviewable-imports.md) — versioned intake, review flow, дедупликация и project skill.
14. [ADR-001: D1 для Sites runtime](decisions/001-sites-d1-runtime.md) — решение о серверной базе для опубликованной версии.

## Иерархия источников

- Product Vision определяет направление продукта и границы релизов.
- Документы этапов фиксируют фактически принятое и реализованное состояние.
- Исходный код, миграции и автоматические тесты являются проверяемой реализацией.
- При расхождении между замыслом и реализацией расхождение фиксируется в документе этапа до следующей разработки.

## Правило развития документации

Для каждого следующего этапа создаётся отдельный Markdown-документ с целью, scope, решениями, критериями приёмки, результатами проверки и известными ограничениями. Существенные продуктовые изменения сначала отражаются в новой версии Product Vision или отдельном decision record.
