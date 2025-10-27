.PHONY: help install dev build test lint format seed reset clean

help:
	@echo "Invora Email Filter - Available Commands:"
	@echo ""
	@echo "  make install    - Install all dependencies"
	@echo "  make dev        - Run backend and add-in in development mode"
	@echo "  make build      - Build backend and add-in for production"
	@echo "  make test       - Run all tests"
	@echo "  make lint       - Lint all code"
	@echo "  make format     - Format all code"
	@echo "  make seed       - Seed database with initial data"
	@echo "  make reset      - Reset database"
	@echo "  make clean      - Clean build artifacts"
	@echo ""

install:
	@echo "Installing dependencies..."
	npm install
	npm install --workspace=backend
	npm install --workspace=addin

dev:
	@echo "Starting development servers..."
	npm run dev

build:
	@echo "Building for production..."
	npm run build

test:
	@echo "Running tests..."
	npm run test

test-runner:
	@echo "Running synthetic email tests..."
	cd backend && npm run build && node dist/scripts/test-runner.js

lint:
	@echo "Linting code..."
	npm run lint

format:
	@echo "Formatting code..."
	npm run format

seed:
	@echo "Seeding database..."
	npm run seed

reset:
	@echo "Resetting database..."
	npm run reset

clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/dist
	rm -rf addin/dist
	rm -rf backend/data/*.db
	rm -rf node_modules/*/node_modules

