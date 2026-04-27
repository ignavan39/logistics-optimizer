#!/bin/bash
set -e

# Run Integration Tests Script
# Запускает все интеграционные тесты
# Использование: ./scripts/run-tests.sh [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$ROOT_DIR/tests/e2e"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

usage() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --up          Запустить docker-compose перед тестами"
  echo "  --down       Остановить docker-compose после тестов"
  echo "  --health     Проверить здоровье сервисов перед тестами"
  echo "  --db-only    Только DB isolation тесты"
  echo "  --grpc-only  Только gRPC cross тесты (из docker сети)"
  echo "  --test-container Использовать отдельный контейнер для тестов"
  echo "  --kafka-only Только Kafka тесты"
  echo "  --help       Показать эту справку"
  echo ""
  echo "Примеры:"
  echo "  $0 --up --health         # Запустить, проверить, тесты"
  echo "  $0 --up --health --down # Полный цикл"
  echo "  $0 --db-only           # Только DB тесты"
  echo "  $0 --grpc-only --test-container  # gRPC через тестовый контейнер"
}

# Парсинг аргументов
DO_UP=false
DO_DOWN=false
DO_HEALTH=false
DB_ONLY=false
GRPC_ONLY=false
KAFKA_ONLY=false
USE_TEST_CONTAINER=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --up)
      DO_UP=true
      shift
      ;;
    --down)
      DO_DOWN=true
      shift
      ;;
    --health)
      DO_HEALTH=true
      shift
      ;;
    --db-only)
      DB_ONLY=true
      shift
      ;;
    --grpc-only)
      GRPC_ONLY=true
      shift
      ;;
    --test-container)
      USE_TEST_CONTAINER=true
      shift
      ;;
    --kafka-only)
      KAFKA_ONLY=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      log_error "Неизвестная опция: $1"
      usage
      exit 1
      ;;
  esac
done

check_health() {
  log_info "Проверка здоровья сервисов..."
  
  SERVICES=(
    "http://localhost:3000:API Gateway"
    "http://localhost:3011:Order Service"
    "http://localhost:3012:Invoice Service"
    "http://localhost:3013:Fleet Service"
    "http://localhost:3014:Routing Service"
    "http://localhost:3016:Counterparty Service"
  )

  local failed=0

  for entry in "${SERVICES[@]}"; do
    IFS=':' read -r url name <<< "$entry"
    
    if curl -sf --max-time 5 "$url/health" > /dev/null 2>&1; then
      log_info "✓ $name healthy"
    else
      log_error "✗ $name unhealthy"
      ((failed++))
    fi
  done

  if [ $failed -gt 0 ]; then
    log_error "$failed сервис(а/ов) недоступны"
    return 1
  fi
  
  log_info "Все сервисы здоровы ✓"
  return 0
}

run_db_tests() {
  log_info "Запуск DB isolation тестов..."
  cd "$ROOT_DIR"
  npx jest --config "$TEST_DIR/jest.config.js" db-isolation.spec.ts --testTimeout=30000
}

run_grpc_tests() {
  log_info "Запуск gRPC cross-service тестов..."
  cd "$ROOT_DIR"
  
  # Вариант 1: Из docker-compose.test.yml контейнера
  if [ "$USE_TEST_CONTAINER" = true ]; then
    docker compose -f docker-compose.test.yml run --rm e2e-test-runner --testPathPatterns=grpc --testTimeout=30000
  else
    # Вариант 2: Из api-gateway контейнера (старый способ)
    docker compose -f docker-compose.yml -f docker-compose.services.yml exec api-gateway sh -c "
      cd /app && npx jest --testPathPatterns=grpc --testTimeout=30000 --no-cache
    " || log_error "gRPC тесты не удалось запустить"
  fi
}

run_kafka_tests() {
  log_info "Запуск Kafka тестов..."
  cd "$ROOT_DIR"
  npx jest --config "$TEST_DIR/jest.config.js" kafka-events.spec.ts --testTimeout=30000
}

run_all_tests() {
  log_info "Запуск всех E2E тестов..."
  cd "$ROOT_DIR"
  
  if [ "$USE_TEST_CONTAINER" = true ]; then
    docker compose -f docker-compose.test.yml run --rm e2e-test-runner
  else
    npx jest --config "$TEST_DIR/jest.config.js" --testTimeout=30000
  fi
}

run_test_container() {
  log_info "Запуск тестов через изолированный контейнер..."
  cd "$ROOT_DIR"
  
  # Поднять тестовые БД если не запущены
  docker compose -f docker-compose.yml -f tests/e2e/docker-compose.yml up -d
  
  # Запустить все сервисы если не запущены
  docker compose -f docker-compose.yml -f docker-compose.services.yml up -d
  
  sleep 5
  
  # Запустить тесты из контейнера
  docker compose -f docker-compose.test.yml run --rm e2e-test-runner
}

main() {
  echo "========================================"
  echo "  Запуск интеграционных тестов"
  echo "========================================"
  echo ""

  if [ "$DO_UP" = true ]; then
    log_info "Запуск docker-compose..."
    cd "$ROOT_DIR"
    docker compose -f docker-compose.services.yml up -d
    sleep 10
  fi

  if [ "$DO_HEALTH" = true ]; then
    check_health || exit 1
    echo ""
  fi

  if [ "$DB_ONLY" = true ]; then
    run_db_tests
  elif [ "$GRPC_ONLY" = true ]; then
    run_grpc_tests
  elif [ "$KAFKA_ONLY" = true ]; then
    run_kafka_tests
  else
    run_all_tests
  fi

  local test_exit=$?

  if [ "$DO_DOWN" = true ]; then
    log_info "Остановка docker-compose..."
    cd "$ROOT_DIR"
    docker compose -f docker-compose.services.yml down
  fi

  if [ $test_exit -eq 0 ]; then
    echo ""
    log_info "========================================"
    log_info "Все тесты прошли успешно! ✓"
    log_info "========================================"
  else
    echo ""
    log_error "========================================"
    log_error "Тесты упали!"
    log_error "========================================"
  fi

  exit $test_exit
}

main "$@"