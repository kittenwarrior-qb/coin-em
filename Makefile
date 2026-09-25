.PHONY: help dev-up dev-down dev-logs dev-rebuild prod-up prod-down prod-logs prod-rebuild clean check-redis redis-cli metrics backup backup-fixture restore-fixture

help:
	@echo "EMCOIN Game - Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev-up       - Start dev environment"
	@echo "  make dev-down     - Stop dev environment"
	@echo "  make dev-logs     - View dev logs"
	@echo "  make dev-rebuild  - Rebuild dev containers"
	@echo ""
	@echo "Production:"
	@echo "  make prod-up      - Start production"
	@echo "  make prod-down    - Stop production"
	@echo "  make prod-logs    - View production logs"
	@echo "  make prod-rebuild - Rebuild production"
	@echo ""
	@echo "Debug:"
	@echo "  make check-redis  - Check Redis connection and data"
	@echo "  make redis-cli    - Open Redis CLI"
	@echo "  make metrics      - Show backend metrics"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Remove all containers and volumes"
	@echo "  make backup       - Backup data"
	@echo "  make backup-fixture - Run isolated fixture backup/checksum drill"
	@echo "  make restore-fixture - Run isolated fixture restore/checksum drill"

# Development
dev-up:
	docker-compose -f docker-compose.dev.yml up -d

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-rebuild:
	docker-compose -f docker-compose.dev.yml up -d --build

# Production
prod-up:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

prod-rebuild:
	docker-compose -f docker-compose.prod.yml up -d --build

# Maintenance
clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f

backup:
	@mkdir -p ./backup
	docker cp emcoin-backend-prod:/app/data ./backup/data-$$(date +%Y%m%d-%H%M%S)
	@echo "Backup completed: ./backup/data-$$(date +%Y%m%d-%H%M%S)"

# R00 evidence drills. These commands use only a temporary local fixture.
backup-fixture:
	@set -eu; d=$$(mktemp -d); trap 'rm -rf "$$d"' EXIT; mkdir -p "$$d/source" "$$d/backup"; printf '%s\n' '{"roomId":"fixture-room","players":[]}' > "$$d/source/room.json"; sha256sum "$$d/source/room.json" > "$$d/source/SHA256SUMS"; cp -a "$$d/source/room.json" "$$d/backup/"; (cd "$$d/backup" && sha256sum -c "../source/SHA256SUMS"); echo "Isolated fixture backup PASS"

restore-fixture:
	@set -eu; d=$$(mktemp -d); trap 'rm -rf "$$d"' EXIT; mkdir -p "$$d/source" "$$d/backup" "$$d/restored"; printf '%s\n' '{"roomId":"fixture-room","players":[]}' > "$$d/source/room.json"; sha256sum "$$d/source/room.json" > "$$d/source/SHA256SUMS"; cp -a "$$d/source/room.json" "$$d/backup/"; cp -a "$$d/backup/room.json" "$$d/restored/"; (cd "$$d/restored" && sha256sum -c "../source/SHA256SUMS"); grep -q 'fixture-room' "$$d/restored/room.json"; echo "Isolated fixture restore PASS: fixture-room readable"

# Debug
check-redis:
	docker exec -it emcoin-backend-prod npm run check-redis

redis-cli:
	docker exec -it emcoin-redis redis-cli

metrics:
	@curl -s http://localhost/metrics | python -m json.tool || curl -s http://localhost/metrics
