#!/bin/bash
set -e

# Health Check Script — проверяет что все сервисы отвечают (TCP port check)
# Использование: ./scripts/health-check.sh

TIMEOUT=${1:-5}

# Format: "host|port|name|proto"
SERVICES=(
  "localhost|3011|Order Service|http"
  "localhost|3012|Invoice Service|http"
  "localhost|3013|Fleet Service|http"
  "localhost|3014|Routing Service|http"
  "localhost|3016|Counterparty Service|http"
  "localhost|50051|Order gRPC|grpc"
  "localhost|50052|Invoice gRPC|grpc"
  "localhost|50053|Fleet gRPC|grpc"
  "localhost|50054|Routing gRPC|grpc"
  "localhost|50055|Tracking gRPC|grpc"
  "localhost|50057|Counterparty gRPC|grpc"
)

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_port() {
  local host=$1
  local port=$2
  local name=$3
  local proto=$4

  if timeout "$TIMEOUT" bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
    log_info "✓ $name ($proto) port $port open"
    return 0
  else
    log_error "✗ $name ($proto) port $port closed"
    return 1
  fi
}

main() {
  echo "========================================"
  echo "  Logistics Health Check"
  echo "========================================"
  echo ""

  local failed=0

  for entry in "${SERVICES[@]}"; do
    local host=$(echo "$entry" | cut -d'|' -f1)
    local port=$(echo "$entry" | cut -d'|' -f2)
    local name=$(echo "$entry" | cut -d'|' -f3)
    local proto=$(echo "$entry" | cut -d'|' -f4)

    check_port "$host" "$port" "$name" "$proto" || ((failed++))
  done

  echo ""
  echo "========================================"

  if [ $failed -eq 0 ]; then
    log_info "All services healthy! ✓"
    exit 0
  else
    log_error "$failed service(s) unhealthy"
    exit 1
  fi
}

main "$@"