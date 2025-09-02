# Edulink Backend Makefile
# Provides convenient commands for development, testing, and deployment

# Variables
PYTHON := python
PIP := pip
MANAGE := $(PYTHON) manage.py
DOCKER := docker
DOCKER_COMPOSE := docker-compose
PORT := 8000
TEST_SETTINGS := Edulink.settings.test
DEV_SETTINGS := Edulink.settings.dev
PROD_SETTINGS := Edulink.settings.prod

# Colors for output
RED := \033[31m
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
MAGENTA := \033[35m
CYAN := \033[36m
WHITE := \033[37m
RESET := \033[0m

# Default target
.DEFAULT_GOAL := help

# Help target
.PHONY: help
help: ## Show this help message
	@echo "$(CYAN)Edulink Backend Development Commands$(RESET)"
	@echo ""
	@echo "$(YELLOW)Setup Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(install|setup|init)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Development Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(run|dev|serve|migrate|shell)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Testing Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(test|coverage|lint)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Docker Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(docker|build|up|down)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Deployment Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(deploy|prod|staging)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Utility Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -vE '(install|setup|init|run|dev|serve|migrate|shell|test|coverage|lint|docker|build|up|down|deploy|prod|staging)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'

# Setup Commands
.PHONY: install
install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(RESET)"
	$(PIP) install -r requirements.txt
	@echo "$(GREEN)Dependencies installed successfully!$(RESET)"

.PHONY: install-dev
install-dev: ## Install development dependencies
	@echo "$(BLUE)Installing development dependencies...$(RESET)"
	$(PIP) install -r requirements.txt
	$(PIP) install pre-commit pytest-django pytest-cov black isort flake8 mypy
	@echo "$(GREEN)Development dependencies installed successfully!$(RESET)"

.PHONY: setup
setup: install-dev migrate collectstatic ## Complete development setup
	@echo "$(BLUE)Setting up pre-commit hooks...$(RESET)"
	pre-commit install
	@echo "$(GREEN)Development environment setup complete!$(RESET)"

.PHONY: init
init: ## Initialize a new development environment
	@echo "$(BLUE)Initializing development environment...$(RESET)"
	$(PYTHON) -m venv venv
	@echo "$(YELLOW)Please activate the virtual environment and run 'make setup'$(RESET)"

# Development Commands
.PHONY: runserver
runserver: ## Run Django development server
	@echo "$(BLUE)Starting Django development server on port $(PORT)...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) runserver $(PORT)

.PHONY: dev
dev: runserver ## Alias for runserver

.PHONY: shell
shell: ## Open Django shell
	@echo "$(BLUE)Opening Django shell...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) shell

.PHONY: dbshell
dbshell: ## Open database shell
	@echo "$(BLUE)Opening database shell...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) dbshell

.PHONY: migrate
migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) migrate
	@echo "$(GREEN)Migrations completed successfully!$(RESET)"

.PHONY: makemigrations
makemigrations: ## Create new database migrations
	@echo "$(BLUE)Creating database migrations...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) makemigrations
	@echo "$(GREEN)Migrations created successfully!$(RESET)"

.PHONY: showmigrations
showmigrations: ## Show migration status
	@echo "$(BLUE)Showing migration status...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) showmigrations

.PHONY: collectstatic
collectstatic: ## Collect static files
	@echo "$(BLUE)Collecting static files...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) collectstatic --noinput
	@echo "$(GREEN)Static files collected successfully!$(RESET)"

.PHONY: createsuperuser
createsuperuser: ## Create a superuser
	@echo "$(BLUE)Creating superuser...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) createsuperuser

.PHONY: loaddata
loaddata: ## Load fixture data
	@echo "$(BLUE)Loading fixture data...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) loaddata fixtures/*.json
	@echo "$(GREEN)Fixture data loaded successfully!$(RESET)"

.PHONY: dumpdata
dumpdata: ## Dump database data to fixtures
	@echo "$(BLUE)Dumping database data...$(RESET)"
	mkdir -p fixtures
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) dumpdata --indent 2 > fixtures/data.json
	@echo "$(GREEN)Database data dumped successfully!$(RESET)"

# Testing Commands
.PHONY: test
test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest

.PHONY: test-fast
test-fast: ## Run fast tests only
	@echo "$(BLUE)Running fast tests...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest -m "not slow"

.PHONY: test-slow
test-slow: ## Run slow tests only
	@echo "$(BLUE)Running slow tests...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest -m slow

.PHONY: test-unit
test-unit: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest -m unit

.PHONY: test-integration
test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest -m integration

.PHONY: test-api
test-api: ## Run API tests
	@echo "$(BLUE)Running API tests...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest -m api

.PHONY: test-models
test-models: ## Run model tests
	@echo "$(BLUE)Running model tests...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest -m models

.PHONY: test-views
test-views: ## Run view tests
	@echo "$(BLUE)Running view tests...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest -m views

.PHONY: test-parallel
test-parallel: ## Run tests in parallel
	@echo "$(BLUE)Running tests in parallel...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest -n auto

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(TEST_SETTINGS) $(PYTHON) -m pytest --cov=. --cov-report=html --cov-report=term
	@echo "$(GREEN)Coverage report generated in htmlcov/$(RESET)"

.PHONY: coverage
coverage: test-coverage ## Alias for test-coverage

.PHONY: coverage-report
coverage-report: ## Generate coverage report
	@echo "$(BLUE)Generating coverage report...$(RESET)"
	coverage html
	coverage report
	@echo "$(GREEN)Coverage report available in htmlcov/index.html$(RESET)"

# Code Quality Commands
.PHONY: lint
lint: ## Run all linting tools
	@echo "$(BLUE)Running linting tools...$(RESET)"
	flake8 .
	black --check .
	isort --check-only .
	mypy .
	@echo "$(GREEN)Linting completed!$(RESET)"

.PHONY: format
format: ## Format code with black and isort
	@echo "$(BLUE)Formatting code...$(RESET)"
	black .
	isort .
	@echo "$(GREEN)Code formatted successfully!$(RESET)"

.PHONY: check
check: ## Run Django system checks
	@echo "$(BLUE)Running Django system checks...$(RESET)"
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) check
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) check --deploy
	@echo "$(GREEN)System checks passed!$(RESET)"

.PHONY: security
security: ## Run security checks
	@echo "$(BLUE)Running security checks...$(RESET)"
	bandit -r . -x tests/
	safety check
	@echo "$(GREEN)Security checks completed!$(RESET)"

.PHONY: pre-commit
pre-commit: ## Run pre-commit hooks
	@echo "$(BLUE)Running pre-commit hooks...$(RESET)"
	pre-commit run --all-files

# Docker Commands
.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(RESET)"
	$(DOCKER) build -t edulink-backend .
	@echo "$(GREEN)Docker image built successfully!$(RESET)"

.PHONY: docker-run
docker-run: ## Run Docker container
	@echo "$(BLUE)Running Docker container...$(RESET)"
	$(DOCKER) run -p $(PORT):$(PORT) edulink-backend

.PHONY: docker-up
docker-up: ## Start all services with docker-compose
	@echo "$(BLUE)Starting all services...$(RESET)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)All services started!$(RESET)"

.PHONY: docker-down
docker-down: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(RESET)"
	$(DOCKER_COMPOSE) down
	@echo "$(GREEN)All services stopped!$(RESET)"

.PHONY: docker-logs
docker-logs: ## Show docker-compose logs
	@echo "$(BLUE)Showing service logs...$(RESET)"
	$(DOCKER_COMPOSE) logs -f

.PHONY: docker-shell
docker-shell: ## Open shell in running container
	@echo "$(BLUE)Opening shell in container...$(RESET)"
	$(DOCKER_COMPOSE) exec web bash

.PHONY: docker-migrate
docker-migrate: ## Run migrations in Docker
	@echo "$(BLUE)Running migrations in Docker...$(RESET)"
	$(DOCKER_COMPOSE) exec web python manage.py migrate

.PHONY: docker-test
docker-test: ## Run tests in Docker
	@echo "$(BLUE)Running tests in Docker...$(RESET)"
	$(DOCKER_COMPOSE) exec web python -m pytest

# Database Commands
.PHONY: db-reset
db-reset: ## Reset database (WARNING: destroys all data)
	@echo "$(RED)WARNING: This will destroy all database data!$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Resetting database...$(RESET)"; \
		rm -f db.sqlite3; \
		DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) migrate; \
		echo "$(GREEN)Database reset completed!$(RESET)"; \
	else \
		echo "$(YELLOW)Database reset cancelled.$(RESET)"; \
	fi

.PHONY: db-backup
db-backup: ## Backup database
	@echo "$(BLUE)Creating database backup...$(RESET)"
	mkdir -p backups
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) dumpdata --indent 2 > backups/backup_$(shell date +%Y%m%d_%H%M%S).json
	@echo "$(GREEN)Database backup created!$(RESET)"

.PHONY: db-restore
db-restore: ## Restore database from backup (specify BACKUP_FILE)
	@echo "$(BLUE)Restoring database from backup...$(RESET)"
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Please specify BACKUP_FILE=path/to/backup.json$(RESET)"; \
		exit 1; \
	fi
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) loaddata $(BACKUP_FILE)
	@echo "$(GREEN)Database restored successfully!$(RESET)"

# Deployment Commands
.PHONY: deploy-staging
deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(RESET)"
	# Add your staging deployment commands here
	@echo "$(GREEN)Deployed to staging successfully!$(RESET)"

.PHONY: deploy-prod
deploy-prod: ## Deploy to production environment
	@echo "$(BLUE)Deploying to production...$(RESET)"
	# Add your production deployment commands here
	@echo "$(GREEN)Deployed to production successfully!$(RESET)"

# Utility Commands
.PHONY: clean
clean: ## Clean up temporary files
	@echo "$(BLUE)Cleaning up temporary files...$(RESET)"
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.orig" -delete
	find . -type f -name "*.rej" -delete
	find . -type f -name "*.bak" -delete
	find . -type f -name "*.swp" -delete
	find . -type f -name "*.swo" -delete
	find . -type f -name "*~" -delete
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	@echo "$(GREEN)Cleanup completed!$(RESET)"

.PHONY: requirements
requirements: ## Update requirements.txt
	@echo "$(BLUE)Updating requirements.txt...$(RESET)"
	$(PIP) freeze > requirements.txt
	@echo "$(GREEN)Requirements updated!$(RESET)"

.PHONY: update
update: ## Update all dependencies
	@echo "$(BLUE)Updating dependencies...$(RESET)"
	$(PIP) install --upgrade pip
	$(PIP) install --upgrade -r requirements.txt
	@echo "$(GREEN)Dependencies updated!$(RESET)"

.PHONY: docs
docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(RESET)"
	# Add documentation generation commands here
	@echo "$(GREEN)Documentation generated!$(RESET)"

.PHONY: serve-docs
serve-docs: ## Serve documentation locally
	@echo "$(BLUE)Serving documentation...$(RESET)"
	# Add documentation serving commands here

.PHONY: celery-worker
celery-worker: ## Start Celery worker
	@echo "$(BLUE)Starting Celery worker...$(RESET)"
	celery -A Edulink worker -l info

.PHONY: celery-beat
celery-beat: ## Start Celery beat scheduler
	@echo "$(BLUE)Starting Celery beat scheduler...$(RESET)"
	celery -A Edulink beat -l info

.PHONY: celery-flower
celery-flower: ## Start Flower monitoring
	@echo "$(BLUE)Starting Flower monitoring...$(RESET)"
	celery -A Edulink flower

.PHONY: redis-cli
redis-cli: ## Open Redis CLI
	@echo "$(BLUE)Opening Redis CLI...$(RESET)"
	redis-cli

.PHONY: logs
logs: ## Show application logs
	@echo "$(BLUE)Showing application logs...$(RESET)"
	tail -f logs/*.log

.PHONY: status
status: ## Show system status
	@echo "$(BLUE)System Status:$(RESET)"
	@echo "$(YELLOW)Python Version:$(RESET) $(shell python --version)"
	@echo "$(YELLOW)Django Version:$(RESET) $(shell python -c 'import django; print(django.get_version())')"
	@echo "$(YELLOW)Database Status:$(RESET)"
	@DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(MANAGE) check --database default > /dev/null 2>&1 && echo "$(GREEN)✓ Connected$(RESET)" || echo "$(RED)✗ Not Connected$(RESET)"
	@echo "$(YELLOW)Redis Status:$(RESET)"
	@redis-cli ping > /dev/null 2>&1 && echo "$(GREEN)✓ Connected$(RESET)" || echo "$(RED)✗ Not Connected$(RESET)"

.PHONY: info
info: ## Show project information
	@echo "$(CYAN)Edulink Backend Project Information$(RESET)"
	@echo "$(YELLOW)Project:$(RESET) Edulink Internship Management System"
	@echo "$(YELLOW)Version:$(RESET) 1.0.0"
	@echo "$(YELLOW)Python:$(RESET) $(shell python --version)"
	@echo "$(YELLOW)Django:$(RESET) $(shell python -c 'import django; print(django.get_version())')"
	@echo "$(YELLOW)Environment:$(RESET) Development"
	@echo "$(YELLOW)Port:$(RESET) $(PORT)"
	@echo "$(YELLOW)Documentation:$(RESET) docs/"

# Phony targets
.PHONY: all
all: clean install migrate test lint ## Run full development cycle

# Make sure intermediate files are not deleted
.PRECIOUS: %.py

# Disable built-in rules
.SUFFIXES: