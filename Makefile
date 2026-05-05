# ═══════════════════════════════════════════════════════════════════════════════
# Logistics Optimizer — Makefile
# ═══════════════════════════════════════════════════════════════════════════════

.PHONY: help install init build up up:dev down restart logs clean clean:all osrm web test lint typecheck

# ─────────────────────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────────────────────

help:
	@echo "📦 Logistics Optimizer — Доступные команды:"
	@echo ""
	@echo "  make install       Установить зависимости (pnpm + node_modules)"
	@echo "  make osrm         Скачать OSM данные для маршрутизации (~12GB)"
	@echo "  make init         Полная инициализация (install + osrm + docker pull)"
	@echo ""
	@echo "  make build        Собрать все сервисы"
	@echo "  make up          Запустить Docker"
	@echo "  make up:dev      Docker + фронтенд"
	@echo "  make web         Только фронтенд"
	@echo "  make down        Остановить Docker"
	@echo "  make restart     Перезапустить"
	@echo "  make logs        Логи Docker"
	@echo ""
	@echo "  make test        Запустить тесты"
	@echo "  make lint        Линтинг"
	@echo "  make typecheck  Проверка типов"
	@echo ""
	@echo "  make clean       Удалить контейнеры и тома"
	@echo "  make clean:all  + node_modules и osrm-data"

# ═══════════════════════════════════════════════════════════════════════════════
# Инициализация
# ═══════════════════════════════════════════════════════════════════════════════

install:
	@echo "📥 Установка зависимостей..."
	pnpm install

osrm:
	@echo "🗺️ Скачивание OSM данных для России (~12GB)..."
	@mkdir -p osrm-data
	@if [ -f osrm-data/russia-latest.osm.pbf ]; then \
		echo "✅ Данные уже есть"; \
	else \
		wget -q --show-progress -P osrm-data \
		https://download.geofabrik.de/russia-latest.osm.pbf; \
	fi
	@echo "✅ OSM данные готовы. Запустите: docker compose up -d"

init: install osrm
	@echo "🐳 Загрузка Docker образов..."
	docker compose pull
	@echo ""
	@echo "✅ Готово! Запустите: make up"

# ═══════════════════════════════════════════════════════════════════════════════
# Сборка и запуск
# ═══════════════════════════════════════════════════════════════════════════════

build:
	@echo "🏗️ Сборка..."
	pnpm build

# Запуск Docker + фронтенд
up:dev:
	@echo "🚀 Запуск Docker + Frontend..."
	docker compose -f docker-compose.yml -f docker-compose.services.yml up -d
	@echo "🌐 Запуск фронтенда..."
	cd apps/web && pnpm dev

# Запуск только фронтенда
web:
	@echo "🌐 Запуск фронтенда..."
	cd apps/web && pnpm dev

up:
	@echo "🚀 Запуск..."
	docker compose -f docker-compose.yml -f docker-compose.services.yml up -d

down:
	@echo "⏹️ Остановка..."
	docker compose -f docker-compose.yml -f docker-compose.services.yml down

restart: down up

logs:
	docker compose -f docker-compose.yml -f docker-compose.services.yml logs -f

# ═══════════════════════════════════════════════════════════════════════════════
# Quality Assurance
# ═══════════════════════════════════════════════════════════════════════════════

test:
	pnpm test

lint:
	pnpm lint

typecheck:
	pnpm typecheck

# ═══════════════════════════════════════════════════════════════════════════════
# Cleanup
# ═══════════════════════════════════════════════════════════════════════════════

clean:
	@echo "🧹 Очистка Docker..."
	docker compose -f docker-compose.yml -f docker-compose.services.yml down -v

clean:all:
	@echo "🧹 Полная очистка..."
	docker compose -f docker-compose.yml -f docker-compose.services.yml down -v
	rm -rf node_modules
	rm -rf osrm-data
	rm -rf apps/*/dist
	rm -rf apps/*/node_modules
	rm -rf libs/*/dist
	rm -rf libs/*/node_modules
