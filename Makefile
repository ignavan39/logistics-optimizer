.PHONY: help install init build up up:dev down restart logs clean clean:all health-check proto test lint typecheck test:e2e test:grpc

network:
	docker network inspect logistics-net >/dev/null 2>&1 || docker network create logistics-net

help:
	@echo "Backend commands:"
	@echo "  make up          — Start Docker (infra + services)"
	@echo "  make up:dev      — Start Docker + frontend"
	@echo "  make down        — Stop Docker"
	@echo "  make restart     — Restart Docker"
	@echo "  make logs        — Tail all logs"
	@echo ""
	@echo "  make web         — Frontend only (localhost:5173)"
	@echo ""
	@echo "  make proto       — Build proto files"
	@echo ""
	@echo "  make typecheck   — TypeScript check"
	@echo "  make lint        — ESLint"
	@echo "  make test         — Unit tests"
	@echo "  make test:e2e    — E2E tests (needs infra)"
	@echo "  make test:grpc   — gRPC integration tests"
	@echo ""
	@echo "  make health-check — Verify infra is ready"
	@echo "  make clean        — Remove containers + volumes"
	@echo "  make clean:all    — Remove everything"

install:
	pnpm install

osrm:
	mkdir -p osrm-data

init: install osrm
	docker compose pull

build:
	pnpm build

proto:
	pnpm --filter @logistics/proto build

up: network
	docker compose -f docker-compose.yml -f docker-compose.services.yml up -d

up:dev: network
	docker compose -f docker-compose.yml -f docker-compose.services.yml up -d
	cd apps/web && pnpm dev

down:
	docker compose -f docker-compose.yml -f docker-compose.services.yml down

restart: down up

logs:
	docker compose -f docker-compose.yml -f docker-compose.services.yml logs -f

health-check:
	@echo "=== Docker Containers ===" && \
	docker compose -f docker-compose.yml -f docker-compose.services.yml ps 2>/dev/null | grep -E "(Up|Exit)" || echo "No containers running" && \
	@echo "" && \
	@echo "=== Git Status ===" && \
	git status --short && \
	@echo "" && \
	@echo "=== Quick Test ===" && \
	pnpm test 2>&1 | tail -5 || true

test:
	pnpm test

test:e2e:
	docker compose -f docker-compose.yml -f docker-compose.services.yml -f docker-compose.test.yml run --rm e2e-test-runner

test:grpc:
	./scripts/run-tests.sh --grpc-only

lint:
	pnpm lint

typecheck:
	pnpm typecheck

clean:
	docker compose -f docker-compose.yml -f docker-compose.services.yml down -v
	docker network rm logistics-net 2>/dev/null || true

clean:all: clean
	rm -rf node_modules osrm-data
	find apps libs -type d \( -name "dist" -o -name "node_modules" \) -exec rm -rf {} + 2>/dev/null || true