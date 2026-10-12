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
	@echo "  make backup       - Disabled: owner opted out of room/VPS backups"
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
	@echo "Backup disabled by owner policy. Existing archives are not modified."
	@exit 1

# R00 evidence drills. These commands use only a temporary local fixture.
backup-fixture:
	cd be && npx vitest run tests/integration/recovery-fixture.test.ts -t "restores a checksummed fixture"

restore-fixture:
	cd be && npx vitest run tests/integration/recovery-fixture.test.ts -t "restores a checksummed fixture"

# Debug
check-redis:
	docker exec -it emcoin-backend-prod npm run check-redis

redis-cli:
	docker exec -it emcoin-redis redis-cli

metrics:
	@curl -s http://localhost/metrics | python -m json.tool || curl -s http://localhost/metrics
