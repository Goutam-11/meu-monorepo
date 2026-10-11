# MEU services

See the [repository guide](../README.md) for the full frontend/service map and fix notes (local evidence, excluded from Git) for execution restrictions and rollout.

- [Scheduler and workers](schedulerService/README.md): Mongo source of truth, Redis registry, BullMQ delayed jobs, LLM analysis and guarded broker tools.
- [Notification consumer](notificationService/README.md): Mongo notification persistence, Web Push, and shared queue contract.

The frontend is in `../meu_frontend`. Each project has its own dependencies and environment template.
