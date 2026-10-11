ENGINE ?= podman
COMPOSE = $(ENGINE) compose -f compose.yaml $(if $(filter podman,$(ENGINE)),-f compose.podman.yaml,)
DEV = $(COMPOSE) -f compose.dev.yaml
SERVICE ?=
TAIL ?= 100
SINCE ?=
FOLLOW ?= 1

.PHONY: up dev build down restart logs ps check docs
up:
	$(COMPOSE) up -d --build
dev:
	$(DEV) up -d --build
build:
	$(COMPOSE) build
down:
	$(COMPOSE) down
restart:
	$(COMPOSE) restart
logs:
	$(COMPOSE) logs $(if $(filter 1,$(FOLLOW)),-f,) --tail=$(TAIL) $(if $(SINCE),--since=$(SINCE),) $(SERVICE)
ps:
	$(COMPOSE) ps
check:
	$(COMPOSE) config --quiet
docs:
	bun scripts/generate-code-map.mjs

# Optional local research commands are not part of the application repository.
-include Makefile.local
