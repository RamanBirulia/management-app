# Stage 0 — Foundation

- Статус: **завершён как технический baseline**
- Дата фиксации: 24 августа 2026
- Product Vision: V1

## Цель этапа

Убрать основной инфраструктурный риск до накопления реальных данных и подготовить воспроизводимый каркас, на котором можно последовательно реализовывать доменные вертикальные срезы.

## Что реализовано

### Web

- React 19 и TypeScript.
- Базовая оболочка Management Log с навигацией и явным отображением статуса Stage 0.
- Сборка для Cloudflare Sites через Vinext/Vite.
- Metadata приложения и development-preview marker.

### API

- Node.js/Fastify приложение.
- `GET /health/live` для проверки процесса без обращения к БД.
- `GET /health/ready` для проверки доступности PostgreSQL.
- `GET /api/meta` с номером этапа, timezone и статусом аутентификации.
- Базовый rate limit и доверие reverse proxy.

### Data

- PostgreSQL для production-like окружения.
- Механизм SQL migrations.
- Первая миграция создаёт `schema_migrations` и `app_settings`.
- Начальные настройки: `Europe/Tallinn` и место для `default_project_id`.

### Deployment

- Отдельные Dockerfile для web и API.
- Docker Compose для frontend, backend, PostgreSQL и Caddy.
- Caddy как единая публичная точка входа и reverse proxy.
- Конфигурация не публикует порт PostgreSQL наружу.
- Sites-проект связан через `.openai/hosting.json`.
- Тестовая web-версия опубликована по адресу https://management-log.raman-birulia.chatgpt.site/.

### Quality gates

- TypeScript typecheck.
- ESLint.
- Unit-тесты health endpoints.
- Проверка отрендеренного HTML.
- Deployment build.
- Единая команда `npm run verify`.

## Принятые решения

- Один пользователь и только тестовые данные.
- Аутентификация намеренно отключена на Stage 0.
- Product timezone: `Europe/Tallinn`; недели ISO Monday–Sunday.
- Default project хранится в `app_settings.default_project_id`.
- Доменные экраны и таблицы не входят в Stage 0.
- Реальные управленческие данные нельзя загружать до ограничения доступа и внедрения согласованной аутентификации.

## Что не входит

- CRUD людей и проектов.
- Composer и журнал Decision / Task / Question.
- Mentions, sources и фильтры.
- Login, password reset, SSO и роли.
- Backup/restore automation и проверенный disaster-recovery процесс.
- IP allowlist для реальных данных.
- Подключение workflow к целевому GitHub-репозиторию; сам workflow `.github/workflows/ci.yml` уже подготовлен.

## Критерии проверки

- `npm run verify` проходит локально.
- `docker compose config` валиден.
- `/health/live` возвращает HTTP 200 без зависимости от БД.
- `/health/ready` возвращает HTTP 200 при доступной БД и HTTP 503 при недоступной.
- Production-like запуск сохраняет состояние PostgreSQL между перезапусками.
- Публичный URL показывает Stage 0 foundation без доменных данных.

## Известные ограничения

- Опубликованная Sites-версия подтверждает web-часть, но не заменяет проверку полного Docker Compose окружения с PostgreSQL и Caddy на выделенной машине.
- GitHub Actions начнёт выполняться после подключения и первой отправки кода в целевой GitHub-репозиторий.
- Security boundary пока рассчитан только на тестовые данные.

## Следующий этап

Stage 1 — справочники людей и проектов: стабильные сущности, уникальные aliases/slugs, archive lifecycle и подготовка основы для будущих `@people` и `#projects` mentions.
