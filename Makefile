.PHONY: help install init build up down restart logs clean osrm web test lint typecheck

network:
	docker network inspect logistics-net >/dev/null 2>&1 || docker network create logistics-net

help:
	@echo "help install init build up down restart logs clean osrm web test lint typecheck"

install:
	pnpm install

osrm:
	mkdir -p osrm-data

init: install osrm
	docker compose pull

build:
	pnpm build

up: network
	docker compose -f docker-compose.yml -f docker-compose.services.yml up -d

up-dev: network
	docker compose -f docker-compose.yml -f docker-compose.services.yml up -d

web:
	cd apps/web && pnpm dev

down:
	docker compose -f docker-compose.yml -f docker-compose.services.yml down

restart: down up

logs:
	docker compose -f docker-compose.yml -f docker-compose.services.yml logs -f

test:
	pnpm test

lint:
	pnpm lint

typecheck:
	pnpm typecheck

clean:
	docker compose -f docker-compose.yml -f docker-compose.services.yml down -v
	docker network rm logistics-net 2>/dev/null || true

clean-all: clean
	rm -rf node_modules osrm-data apps/*/dist apps/*/node_modules libs/*/dist libs/*/node_modules