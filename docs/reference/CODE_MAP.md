# Generated source and function index

Generated from repository source by `bun scripts/generate-code-map.mjs`. This generator reads TypeScript syntax; it never imports the application or reads environment files.

## Scope and limits

This index lists static imports, literal dynamic imports and named functions/methods for the four source areas. Direct call expressions are recorded per named function; nested named functions get separate rows. Anonymous callbacks, runtime provider/strategy registries, framework routing and database relationships cannot be inferred reliably from syntax. Calls such as `safety.executeOrder` or `prisma.agent.update` name an interface/member, not a proven implementation. Read the curated [module map](../MODULES.md) and [architecture flows](../ARCHITECTURE.md) for those boundaries. Generated clients, dependencies and tests are excluded. Stubs/experimental source are included; presence is not proof that an entry point invokes them.

## File index

| Source | Named functions | Local dependency files |
|---|---:|---:|
| [meu/notificationService/src/index.ts](#file-a4bffa29adad) | 6 | 2 |
| [meu/notificationService/src/logger.ts](#file-2e9c14c312be) | 3 | 0 |
| [meu/notificationService/src/push-validation.ts](#file-f870d3f0c2aa) | 3 | 0 |
| [meu/schedulerService/index.ts](#file-b5c082703924) | 2 | 5 |
| [meu/schedulerService/src/agents/llm/prompts/cryptoAgentPrompt.ts](#file-901becb5c0bf) | 0 | 0 |
| [meu/schedulerService/src/agents/llm/prompts/stockAgentPrompt.ts](#file-44561f276203) | 0 | 0 |
| [meu/schedulerService/src/agents/llm/prompts/tradingPrompt.ts](#file-ce309e1095e3) | 0 | 0 |
| [meu/schedulerService/src/agents/llm/prompts/zerodhaAgentPrompt.ts](#file-d6d4afdba380) | 0 | 0 |
| [meu/schedulerService/src/agents/llm/providers.ts](#file-52ea280ce42d) | 4 | 0 |
| [meu/schedulerService/src/agents/llm/runMemory.ts](#file-f4f060233fd7) | 5 | 0 |
| [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661) | 2 | 8 |
| [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e) | 4 | 7 |
| [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f) | 1 | 4 |
| [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586) | 8 | 12 |
| [meu/schedulerService/src/algorithms/emaCrossover.ts](#file-14a300d88a33) | 0 | 1 |
| [meu/schedulerService/src/algorithms/kite/kiteEmaSignals.ts](#file-7d719200c45d) | 1 | 2 |
| [meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts](#file-670f89e9ba10) | 2 | 4 |
| [meu/schedulerService/src/brokers/binance/binanceExecution.ts](#file-1fc4930582ed) | 6 | 2 |
| [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886) | 12 | 4 |
| [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) | 16 | 5 |
| [meu/schedulerService/src/brokers/delta/deltaReconciliation.ts](#file-c1cc1175ff3a) | 1 | 2 |
| [meu/schedulerService/src/brokers/delta/deltaStart.ts](#file-6557ced7c80f) | 3 | 2 |
| [meu/schedulerService/src/brokers/kite/kiteTokenManager.ts](#file-2e463653a27f) | 4 | 2 |
| [meu/schedulerService/src/config/config.ts](#file-9ba5db203d2d) | 2 | 0 |
| [meu/schedulerService/src/config/encryption.ts](#file-17ef44ed3ae4) | 3 | 0 |
| [meu/schedulerService/src/db/db.ts](#file-8327b69a7bcf) | 2 | 1 |
| [meu/schedulerService/src/execution/crypto/cryptoTools.ts](#file-c523be50b1bf) | 17 | 6 |
| [meu/schedulerService/src/execution/dailyRiskUsage.ts](#file-103be3729f36) | 1 | 2 |
| [meu/schedulerService/src/execution/kite/stockTools.ts](#file-162fdce9c91b) | 13 | 4 |
| [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) | 5 | 2 |
| [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) | 8 | 0 |
| [meu/schedulerService/src/lib/marketHours.ts](#file-81bfe3a96d76) | 7 | 0 |
| [meu/schedulerService/src/lib/notifications.ts](#file-61beab0a29e6) | 2 | 2 |
| [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b) | 8 | 1 |
| [meu/schedulerService/src/lib/toolLogging.ts](#file-314810885502) | 1 | 1 |
| [meu/schedulerService/src/market-data/cryptoAnalysis.ts](#file-1502d3e4c75f) | 7 | 1 |
| [meu/schedulerService/src/market-data/emaSnapshot.ts](#file-569b06ff8f40) | 1 | 2 |
| [meu/schedulerService/src/market-data/indicators.ts](#file-d2e1147adc7f) | 3 | 0 |
| [meu/schedulerService/src/market-data/stockAnalysis.ts](#file-e312506c168c) | 4 | 1 |
| [meu/schedulerService/src/queue/queue.ts](#file-288fb59dec9a) | 0 | 2 |
| [meu/schedulerService/src/schedulers/exchangeScheduler.ts](#file-aa69a844ce0a) | 0 | 0 |
| [meu/schedulerService/src/schedulers/scheduler.ts](#file-7bac4a80687d) | 5 | 5 |
| [meu/schedulerService/src/server/kiteCallbackServer.ts](#file-ca7985984e9f) | 0 | 0 |
| [meu/schedulerService/src/state/setStates.ts](#file-69401e8508aa) | 3 | 2 |
| [meu/schedulerService/src/state/state.ts](#file-cfa1bd7ef921) | 0 | 0 |
| [meu/schedulerService/src/watchers/exchangeWatcher.ts](#file-7bd004ca62ea) | 3 | 2 |
| [meu/schedulerService/src/watchers/watcher.ts](#file-3269cd2c1301) | 3 | 3 |
| [meu/schedulerService/src/workers/executionFailure.ts](#file-131187bc349f) | 1 | 4 |
| [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de) | 9 | 29 |
| [meu_frontend/src/app/(auth)/layout.tsx](#file-bcfd1ec380c1) | 1 | 1 |
| [meu_frontend/src/app/(auth)/login/page.tsx](#file-8418dee91050) | 1 | 2 |
| [meu_frontend/src/app/(auth)/signup/page.tsx](#file-d7cb34fa9ca0) | 1 | 2 |
| [meu_frontend/src/app/(dashboard)/agents/[agentId]/edit/page.tsx](#file-313c27dc4df3) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/agents/[agentId]/page.tsx](#file-6903106b05fd) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/agents/create/page.tsx](#file-5b7fe1f94a73) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/agents/page.tsx](#file-968870bfc4bb) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/charts/page.tsx](#file-67b8a16fdcc7) | 1 | 2 |
| [meu_frontend/src/app/(dashboard)/credentials/[credentialId]/edit/page.tsx](#file-052bcf1e24b9) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/credentials/[credentialId]/page.tsx](#file-36e5ab6db543) | 1 | 0 |
| [meu_frontend/src/app/(dashboard)/credentials/create/page.tsx](#file-dbffdf68cab5) | 1 | 2 |
| [meu_frontend/src/app/(dashboard)/credentials/page.tsx](#file-a7babf3707cc) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/dashboard/page.tsx](#file-eff5f999ef04) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/error.tsx](#file-590cbaa3d7b3) | 1 | 3 |
| [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/edit/page.tsx](#file-713bcbfecf18) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/page.tsx](#file-9e76096f5498) | 1 | 0 |
| [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/reconciliation/page.tsx](#file-b387ed1faddf) | 1 | 2 |
| [meu_frontend/src/app/(dashboard)/exchanges/create/page.tsx](#file-04b1ab4df132) | 1 | 2 |
| [meu_frontend/src/app/(dashboard)/exchanges/page.tsx](#file-dbb98e596cb7) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/help/page.tsx](#file-6143dc6a7c8f) | 1 | 2 |
| [meu_frontend/src/app/(dashboard)/layout.tsx](#file-dcdce6cb6d1f) | 1 | 4 |
| [meu_frontend/src/app/(dashboard)/loading.tsx](#file-bb5313af01a6) | 1 | 1 |
| [meu_frontend/src/app/(dashboard)/notifications/[notificationId]/page.tsx](#file-5150ab73d730) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/notifications/page.tsx](#file-af888a812245) | 1 | 5 |
| [meu_frontend/src/app/(dashboard)/settings/page.tsx](#file-c6b71346cae2) | 5 | 6 |
| [meu_frontend/src/app/(dashboard)/strategies/page.tsx](#file-833f53dd6014) | 1 | 2 |
| [meu_frontend/src/app/api/auth/[...all]/route.ts](#file-77ec7a0ab574) | 0 | 1 |
| [meu_frontend/src/app/api/client-errors/route.ts](#file-996af6889829) | 2 | 3 |
| [meu_frontend/src/app/api/exchange/[id]/route.ts](#file-8c016e19d984) | 1 | 3 |
| [meu_frontend/src/app/api/health/route.ts](#file-2afea93d4a3f) | 1 | 0 |
| [meu_frontend/src/app/api/push/subscribe/route.ts](#file-9b8b767a7f1d) | 3 | 5 |
| [meu_frontend/src/app/api/trpc/[trpc]/route.ts](#file-45fb100e52b8) | 3 | 3 |
| [meu_frontend/src/app/layout.tsx](#file-9f5b43d9b9de) | 1 | 1 |
| [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) | 1 | 1 |
| [meu_frontend/src/components/appHeader.tsx](#file-0f4a984bf6aa) | 2 | 5 |
| [meu_frontend/src/components/appSidebar.tsx](#file-60b41959bf0a) | 5 | 6 |
| [meu_frontend/src/components/auth-shell.tsx](#file-7cc37ddf222d) | 1 | 1 |
| [meu_frontend/src/components/entityComponents/Empty.tsx](#file-e1341d0db420) | 0 | 1 |
| [meu_frontend/src/components/entityComponents/EntityAvatar.tsx](#file-d9686ce9473d) | 1 | 1 |
| [meu_frontend/src/components/entityComponents/EntityBadge.tsx](#file-09f652494ac0) | 1 | 1 |
| [meu_frontend/src/components/entityComponents/EntityContainer.tsx](#file-c50e046c4d82) | 1 | 2 |
| [meu_frontend/src/components/entityComponents/EntityHeader.tsx](#file-abbdd2d5aa24) | 1 | 1 |
| [meu_frontend/src/components/entityComponents/EntityItem.tsx](#file-ab7840c4ffc7) | 3 | 4 |
| [meu_frontend/src/components/entityComponents/EntityList.tsx](#file-51b6547cb94e) | 1 | 1 |
| [meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx](#file-341d99006f0d) | 3 | 1 |
| [meu_frontend/src/components/entityComponents/EntityPagination.tsx](#file-4998906ae439) | 1 | 1 |
| [meu_frontend/src/components/entityComponents/EntitySearch.tsx](#file-ea60ae8d3698) | 1 | 3 |
| [meu_frontend/src/components/entityComponents/EntityStates.tsx](#file-d1a5439e4c25) | 3 | 2 |
| [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) | 0 | 11 |
| [meu_frontend/src/components/login.tsx](#file-b650cf92caec) | 4 | 5 |
| [meu_frontend/src/components/meu-icons.tsx](#file-e3bf63df54cd) | 10 | 0 |
| [meu_frontend/src/components/meu-logo.tsx](#file-6af34cce3d3d) | 1 | 1 |
| [meu_frontend/src/components/password-input.tsx](#file-392b4a261058) | 1 | 2 |
| [meu_frontend/src/components/signup.tsx](#file-5cb998c8a647) | 4 | 5 |
| [meu_frontend/src/components/ui-settings.tsx](#file-10bad29dc90f) | 9 | 2 |
| [meu_frontend/src/components/ui/accordion.tsx](#file-eff37b7f84f0) | 4 | 1 |
| [meu_frontend/src/components/ui/alert-dialog.tsx](#file-ed34d47c4dac) | 11 | 2 |
| [meu_frontend/src/components/ui/alert.tsx](#file-4b3b987cd573) | 3 | 1 |
| [meu_frontend/src/components/ui/aspect-ratio.tsx](#file-ef7b0e00a902) | 1 | 0 |
| [meu_frontend/src/components/ui/avatar.tsx](#file-e322d48e8673) | 3 | 1 |
| [meu_frontend/src/components/ui/badge.tsx](#file-96008f791b5c) | 1 | 1 |
| [meu_frontend/src/components/ui/breadcrumb.tsx](#file-f311fadbc5f0) | 7 | 1 |
| [meu_frontend/src/components/ui/button-group.tsx](#file-f6c6961b6694) | 3 | 2 |
| [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) | 1 | 1 |
| [meu_frontend/src/components/ui/calendar.tsx](#file-5f2a05aae429) | 6 | 2 |
| [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) | 7 | 1 |
| [meu_frontend/src/components/ui/carousel.tsx](#file-5cbde50d17bf) | 6 | 2 |
| [meu_frontend/src/components/ui/chart.tsx](#file-f34345485153) | 6 | 1 |
| [meu_frontend/src/components/ui/checkbox.tsx](#file-11a7e2a3811d) | 1 | 1 |
| [meu_frontend/src/components/ui/collapsible.tsx](#file-0c800d60a959) | 3 | 0 |
| [meu_frontend/src/components/ui/command.tsx](#file-f880b52c3559) | 9 | 2 |
| [meu_frontend/src/components/ui/context-menu.tsx](#file-8230cddfc2c2) | 15 | 1 |
| [meu_frontend/src/components/ui/dialog.tsx](#file-4beaf9ef9641) | 10 | 1 |
| [meu_frontend/src/components/ui/drawer.tsx](#file-f5484344fc4d) | 10 | 1 |
| [meu_frontend/src/components/ui/dropdown-menu.tsx](#file-a909309f87df) | 15 | 1 |
| [meu_frontend/src/components/ui/empty.tsx](#file-81bcf9c30795) | 6 | 1 |
| [meu_frontend/src/components/ui/field.tsx](#file-f4505bee987d) | 10 | 3 |
| [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) | 7 | 2 |
| [meu_frontend/src/components/ui/hover-card.tsx](#file-ec8c56a7a926) | 3 | 1 |
| [meu_frontend/src/components/ui/input-group.tsx](#file-527fa4f479a7) | 6 | 4 |
| [meu_frontend/src/components/ui/input-otp.tsx](#file-3a75b4c20de8) | 4 | 1 |
| [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) | 1 | 1 |
| [meu_frontend/src/components/ui/item.tsx](#file-aa2bd4eb0462) | 10 | 2 |
| [meu_frontend/src/components/ui/kbd.tsx](#file-b21d8d189df5) | 2 | 1 |
| [meu_frontend/src/components/ui/label.tsx](#file-729f4f420ef1) | 1 | 1 |
| [meu_frontend/src/components/ui/menubar.tsx](#file-74314c0f564a) | 16 | 1 |
| [meu_frontend/src/components/ui/navigation-menu.tsx](#file-4a474d0a0863) | 8 | 1 |
| [meu_frontend/src/components/ui/pagination.tsx](#file-56f81f70501f) | 7 | 2 |
| [meu_frontend/src/components/ui/popover.tsx](#file-ee0b115629d8) | 4 | 1 |
| [meu_frontend/src/components/ui/progress.tsx](#file-908f8d4c4daf) | 1 | 1 |
| [meu_frontend/src/components/ui/radio-group.tsx](#file-0962ccbebd06) | 2 | 1 |
| [meu_frontend/src/components/ui/resizable.tsx](#file-ee5d87634e98) | 3 | 1 |
| [meu_frontend/src/components/ui/scroll-area.tsx](#file-4cf97c5b3cd2) | 2 | 1 |
| [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) | 10 | 1 |
| [meu_frontend/src/components/ui/separator.tsx](#file-53a723ab88ef) | 1 | 1 |
| [meu_frontend/src/components/ui/sheet.tsx](#file-91354f28c1fd) | 10 | 1 |
| [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76) | 25 | 8 |
| [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) | 1 | 1 |
| [meu_frontend/src/components/ui/slider.tsx](#file-0cba7d7b0991) | 1 | 1 |
| [meu_frontend/src/components/ui/sonner.tsx](#file-426a7748ae3f) | 2 | 0 |
| [meu_frontend/src/components/ui/spinner.tsx](#file-323294c82ba3) | 1 | 1 |
| [meu_frontend/src/components/ui/switch.tsx](#file-5956445d8878) | 1 | 1 |
| [meu_frontend/src/components/ui/table.tsx](#file-71ac7e7f4274) | 8 | 1 |
| [meu_frontend/src/components/ui/tabs.tsx](#file-2a712ece64d3) | 4 | 1 |
| [meu_frontend/src/components/ui/textarea.tsx](#file-263dd5b6b75d) | 1 | 1 |
| [meu_frontend/src/components/ui/toggle-group.tsx](#file-6d0286bae86d) | 2 | 2 |
| [meu_frontend/src/components/ui/toggle.tsx](#file-d9f27669dfb9) | 1 | 1 |
| [meu_frontend/src/components/ui/tooltip.tsx](#file-696410254fcf) | 4 | 1 |
| [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5) | 4 | 10 |
| [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd) | 5 | 15 |
| [meu_frontend/src/features/agents/components/agent-budget-fields.tsx](#file-4c202d5fe0ed) | 3 | 6 |
| [meu_frontend/src/features/agents/components/agent-form-feedback.tsx](#file-91c03a95890b) | 2 | 0 |
| [meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](#file-00d290523c22) | 1 | 7 |
| [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98) | 1 | 8 |
| [meu_frontend/src/features/agents/components/agent.tsx](#file-3984b831a40c) | 2 | 4 |
| [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952) | 13 | 18 |
| [meu_frontend/src/features/agents/components/entry-preview.tsx](#file-568e139a6989) | 2 | 7 |
| [meu_frontend/src/features/agents/hooks/use-agent.ts](#file-2750ed7a6002) | 16 | 1 |
| [meu_frontend/src/features/agents/server/edit-crypto-agent.ts](#file-5129a594abff) | 3 | 6 |
| [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3) | 5 | 8 |
| [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2) | 5 | 9 |
| [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa) | 2 | 9 |
| [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4) | 5 | 14 |
| [meu_frontend/src/features/agents/validation.ts](#file-c2df22aab9af) | 2 | 1 |
| [meu_frontend/src/features/backtests/chart/analysis.ts](#file-dac1b352656a) | 5 | 4 |
| [meu_frontend/src/features/backtests/components/agent-launch.tsx](#file-af786abb6830) | 2 | 5 |
| [meu_frontend/src/features/backtests/components/backtest-price-chart.tsx](#file-33ffc77904e1) | 6 | 6 |
| [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4) | 14 | 14 |
| [meu_frontend/src/features/backtests/components/paper-portfolio.tsx](#file-fc0f457d3c6a) | 2 | 5 |
| [meu_frontend/src/features/backtests/daily-loss.ts](#file-944013acde80) | 1 | 0 |
| [meu_frontend/src/features/backtests/server/delta-data.ts](#file-e9ab06d56b34) | 0 | 1 |
| [meu_frontend/src/features/backtests/server/router.ts](#file-077c1fd7ba8c) | 2 | 8 |
| [meu_frontend/src/features/backtests/validation.ts](#file-530f00338d26) | 0 | 0 |
| [meu_frontend/src/features/charts/components/candle-chart.tsx](#file-c9aab20b58a0) | 6 | 4 |
| [meu_frontend/src/features/charts/components/charts-workspace.tsx](#file-8c2aa8a37e03) | 4 | 5 |
| [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2) | 3 | 8 |
| [meu_frontend/src/features/charts/indicators.ts](#file-1ea0270f41af) | 4 | 1 |
| [meu_frontend/src/features/charts/server/data.ts](#file-d00596a1e24e) | 6 | 1 |
| [meu_frontend/src/features/charts/server/router.ts](#file-f9d982eae1de) | 1 | 4 |
| [meu_frontend/src/features/charts/types.ts](#file-3149635beb0a) | 1 | 0 |
| [meu_frontend/src/features/credentials/components/EditCred.tsx](#file-ad04fd87d941) | 3 | 8 |
| [meu_frontend/src/features/credentials/components/createCred.tsx](#file-a61b47d55b05) | 3 | 8 |
| [meu_frontend/src/features/credentials/components/credentials.tsx](#file-9f89f43602b3) | 4 | 3 |
| [meu_frontend/src/features/credentials/components/model-picker.tsx](#file-00eb873b472a) | 0 | 6 |
| [meu_frontend/src/features/credentials/hooks/use-credentials.ts](#file-1382f3bd3f99) | 14 | 2 |
| [meu_frontend/src/features/credentials/server/models.ts](#file-2d782da7bfbc) | 11 | 3 |
| [meu_frontend/src/features/credentials/server/router.ts](#file-5813a830e726) | 1 | 6 |
| [meu_frontend/src/features/credentials/validation.ts](#file-1d0f7e5fb2e6) | 0 | 1 |
| [meu_frontend/src/features/exchange/components/EditExchange.tsx](#file-c8683f166fff) | 2 | 7 |
| [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba) | 4 | 11 |
| [meu_frontend/src/features/exchange/components/account-execution-panel.tsx](#file-561367eaad9f) | 3 | 5 |
| [meu_frontend/src/features/exchange/components/createEx.tsx](#file-752d2ba61e29) | 2 | 7 |
| [meu_frontend/src/features/exchange/components/exchange.tsx](#file-a53ef3559020) | 3 | 3 |
| [meu_frontend/src/features/exchange/components/portfolio-overview.tsx](#file-71c3b269af63) | 5 | 4 |
| [meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx](#file-9f41ee2d0004) | 3 | 3 |
| [meu_frontend/src/features/exchange/hooks/use-exchange.ts](#file-40f9c8c0bd38) | 16 | 1 |
| [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a) | 3 | 4 |
| [meu_frontend/src/features/exchange/server/reconciliation.ts](#file-d0180098de88) | 5 | 4 |
| [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f) | 6 | 12 |
| [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1) | 2 | 9 |
| [meu_frontend/src/features/help/components/help-workspace.tsx](#file-3ad2ca352d6e) | 3 | 2 |
| [meu_frontend/src/features/markets/components/ticker-picker.tsx](#file-1ecde0d5ac74) | 0 | 5 |
| [meu_frontend/src/features/markets/server/catalog.ts](#file-caa7eb406200) | 9 | 3 |
| [meu_frontend/src/features/notifications/components/NotificationView.tsx](#file-69429fa545c9) | 4 | 5 |
| [meu_frontend/src/features/notifications/components/notification-bell.tsx](#file-660ac2be4da1) | 1 | 4 |
| [meu_frontend/src/features/notifications/components/notification-watcher.tsx](#file-11d66e1b38b9) | 1 | 2 |
| [meu_frontend/src/features/notifications/components/notifications.tsx](#file-7f59b6fb5baf) | 5 | 5 |
| [meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts](#file-1f343c494dac) | 11 | 1 |
| [meu_frontend/src/features/notifications/hooks/use-notifications.ts](#file-c84e6c94eb3d) | 18 | 2 |
| [meu_frontend/src/features/notifications/server/router.ts](#file-6674456ea0f0) | 0 | 4 |
| [meu_frontend/src/features/settings/server/router.ts](#file-2d0a959134b6) | 0 | 2 |
| [meu_frontend/src/hooks/use-mobile.ts](#file-2ac5bd1a5826) | 2 | 0 |
| [meu_frontend/src/instrumentation.ts](#file-c0e3f54a8a6d) | 4 | 1 |
| [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) | 2 | 1 |
| [meu_frontend/src/lib/auth-client.ts](#file-a6e64c486914) | 0 | 0 |
| [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) | 2 | 1 |
| [meu_frontend/src/lib/auth.ts](#file-88f27c02508d) | 0 | 1 |
| [meu_frontend/src/lib/client-error-report.ts](#file-eea9cb8bcbfc) | 1 | 0 |
| [meu_frontend/src/lib/client-error-validation.ts](#file-6d8ab70e2e1a) | 2 | 0 |
| [meu_frontend/src/lib/config.ts](#file-217ac8c08a1d) | 1 | 4 |
| [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) | 0 | 1 |
| [meu_frontend/src/lib/encryption.ts](#file-fadfe6773757) | 3 | 0 |
| [meu_frontend/src/lib/kite.ts](#file-e4ebd94e8111) | 7 | 3 |
| [meu_frontend/src/lib/log-safety.ts](#file-8763257ce406) | 3 | 0 |
| [meu_frontend/src/lib/notification-events.ts](#file-205cdec58c8d) | 6 | 0 |
| [meu_frontend/src/lib/push-validation.ts](#file-c82bb8b2781e) | 3 | 0 |
| [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) | 3 | 0 |
| [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) | 5 | 2 |
| [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) | 0 | 2 |
| [meu_frontend/src/trpc/query-client.ts](#file-f3f53cdac28e) | 4 | 1 |
| [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195) | 0 | 9 |
| [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) | 1 | 3 |
| [shared/trading/accountRisk.ts](#file-60aebedf84e9) | 0 | 0 |
| [shared/trading/brokerCapabilities.ts](#file-a654820bbc46) | 1 | 0 |
| [shared/trading/delta-data.ts](#file-780ed3a879a0) | 9 | 0 |
| [shared/trading/emaCrossover.ts](#file-1d7dd8e6da1e) | 8 | 0 |
| [shared/trading/executionCosts.ts](#file-a7506f843f73) | 0 | 0 |
| [shared/trading/exitPolicy.ts](#file-6d32b175ded4) | 2 | 0 |
| [shared/trading/marketDay.ts](#file-79c73731e830) | 5 | 0 |
| [shared/trading/paperTrading.ts](#file-39c515f77d12) | 5 | 6 |
| [shared/trading/perpetualBacktest.ts](#file-14821081d1df) | 6 | 5 |
| [shared/trading/sizing.ts](#file-864c148ae550) | 6 | 1 |
| [shared/trading/strategies.ts](#file-08c346741655) | 8 | 1 |

<a id="file-a4bffa29adad"></a>

## meu/notificationService/src/index.ts

[meu/notificationService/src/index.ts](../../meu/notificationService/src/index.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./logger` | [meu/notificationService/src/logger.ts](#file-2e9c14c312be) |
| `./push-validation` | [meu/notificationService/src/push-validation.ts](#file-f870d3f0c2aa) |

External or unresolved imports: `bullmq`, `ioredis`, `mongodb`, `node:crypto`, `web-push`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `redisConnection` | [38](../../meu/notificationService/src/index.ts#L38) | `Number` |
| `configureWebPush` | [45](../../meu/notificationService/src/index.ts#L45) | `webpush.setVapidDetails` |
| `sendPush` | [61](../../meu/notificationService/src/index.ts#L61) | `Date.now`, `Promise.allSettled`, `configureWebPush`, `db.collection`, `deliveryLog.info`, `deliveryLog.warn`, `log.child`, `randomUUID`, `results.filter`, `subs.slice` |
| `createNotificationProcessor` | [149](../../meu/notificationService/src/index.ts#L149) | — |
| `main` | [189](../../meu/notificationService/src/index.ts#L189) | `connection.on`, `createNotificationProcessor`, `db.collection`, `log.info`, `mongo.connect`, `mongo.db`, `process.on`, `redisConnection`, `worker.on` |
| `shutdown` | [226](../../meu/notificationService/src/index.ts#L226) | `connection.quit`, `errMeta`, `log.error`, `log.info`, `mongo.close`, `process.exit`, `worker.close` |

<a id="file-2e9c14c312be"></a>

## meu/notificationService/src/logger.ts

[meu/notificationService/src/logger.ts](../../meu/notificationService/src/logger.ts)

### Imported by

- [meu/notificationService/src/index.ts](#file-a4bffa29adad)

External or unresolved imports: `pino`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `errMeta` | [11](../../meu/notificationService/src/logger.ts#L11) | `Number.isInteger`, `Number.isSafeInteger`, `errorNames.has` |
| `safeFields` | [23](../../meu/notificationService/src/logger.ts#L23) | `Number.isFinite`, `Object.assign`, `errMeta`, `events.has` |
| `logMethod` | [54](../../meu/notificationService/src/logger.ts#L54) | `method.apply`, `safeFields` |

<a id="file-f870d3f0c2aa"></a>

## meu/notificationService/src/push-validation.ts

[meu/notificationService/src/push-validation.ts](../../meu/notificationService/src/push-validation.ts)

### Imported by

- [meu/notificationService/src/index.ts](#file-a4bffa29adad)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `validPushEndpoint` | [1](../../meu/notificationService/src/push-validation.ts#L1) | `host.endsWith` |
| `validPushKeys` | [11](../../meu/notificationService/src/push-validation.ts#L11) | `decoded` |
| `decoded` | [12](../../meu/notificationService/src/push-validation.ts#L12) | `Buffer.from`, `bytes.toString`, `value.replace` |

<a id="file-b5c082703924"></a>

## meu/schedulerService/index.ts

[meu/schedulerService/index.ts](../../meu/schedulerService/index.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/db/db` | [meu/schedulerService/src/db/db.ts](#file-8327b69a7bcf) |
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/schedulers/scheduler` | [meu/schedulerService/src/schedulers/scheduler.ts](#file-7bac4a80687d) |
| `@/state/setStates` | [meu/schedulerService/src/state/setStates.ts](#file-69401e8508aa) |
| `@/watchers/watcher` | [meu/schedulerService/src/watchers/watcher.ts](#file-3269cd2c1301) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `main` | [12](../../meu/schedulerService/index.ts#L12) | `bootstrapAgents`, `connectDB`, `db.collection`, `log.info`, `startScheduler`, `startWatcher` |
| `shutdown` | [44](../../meu/schedulerService/index.ts#L44) | `closeDB`, `errMeta`, `log.info`, `log.warn`, `process.exit` |

<a id="file-901becb5c0bf"></a>

## meu/schedulerService/src/agents/llm/prompts/cryptoAgentPrompt.ts

[meu/schedulerService/src/agents/llm/prompts/cryptoAgentPrompt.ts](../../meu/schedulerService/src/agents/llm/prompts/cryptoAgentPrompt.ts)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-44561f276203"></a>

## meu/schedulerService/src/agents/llm/prompts/stockAgentPrompt.ts

[meu/schedulerService/src/agents/llm/prompts/stockAgentPrompt.ts](../../meu/schedulerService/src/agents/llm/prompts/stockAgentPrompt.ts)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-ce309e1095e3"></a>

## meu/schedulerService/src/agents/llm/prompts/tradingPrompt.ts

[meu/schedulerService/src/agents/llm/prompts/tradingPrompt.ts](../../meu/schedulerService/src/agents/llm/prompts/tradingPrompt.ts)

### Imported by

- [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-d6d4afdba380"></a>

## meu/schedulerService/src/agents/llm/prompts/zerodhaAgentPrompt.ts

[meu/schedulerService/src/agents/llm/prompts/zerodhaAgentPrompt.ts](../../meu/schedulerService/src/agents/llm/prompts/zerodhaAgentPrompt.ts)

### Imported by

- [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-52ea280ce42d"></a>

## meu/schedulerService/src/agents/llm/providers.ts

[meu/schedulerService/src/agents/llm/providers.ts](../../meu/schedulerService/src/agents/llm/providers.ts)

### Imported by

- [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661)
- [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `@ai-sdk/amazon-bedrock`, `@ai-sdk/openai-compatible`, `ai`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `openAICompatibleProvider` | [36](../../meu/schedulerService/src/agents/llm/providers.ts#L36) | — |
| `createModel` | [41](../../meu/schedulerService/src/agents/llm/providers.ts#L41) | `client.chatModel`, `createOpenAICompatible` |
| `createModel` | [59](../../meu/schedulerService/src/agents/llm/providers.ts#L59) | `apiKey.trim`, `createAmazonBedrock`, `createOpenAICompatible` |
| `resolveLLMProvider` | [111](../../meu/schedulerService/src/agents/llm/providers.ts#L111) | — |

<a id="file-f4f060233fd7"></a>

## meu/schedulerService/src/agents/llm/runMemory.ts

[meu/schedulerService/src/agents/llm/runMemory.ts](../../meu/schedulerService/src/agents/llm/runMemory.ts)

### Imported by

- [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661)
- [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `node:crypto`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `operationReceipt` | [23](../../meu/schedulerService/src/agents/llm/runMemory.ts#L23) | `intent.action.slice`, `intent.symbol.slice`, `intent.tradingsymbol.slice` |
| `buildRunMemory` | [31](../../meu/schedulerService/src/agents/llm/runMemory.ts#L31) | `JSON.parse`, `receipts.filter`, `receipts.slice`, `response.lastIndexOf`, `response.matchAll`, `response.slice`, `summarySchema.safeParse` |
| `canonical` | [55](../../meu/schedulerService/src/agents/llm/runMemory.ts#L55) | `Array.isArray`, `Object.entries`, `Object.fromEntries`, `value.map` |
| `memoryContext` | [62](../../meu/schedulerService/src/agents/llm/runMemory.ts#L62) | `Boolean`, `JSON.stringify`, `String`, `canonical`, `createHash` |
| `formatRunMemory` | [74](../../meu/schedulerService/src/agents/llm/runMemory.ts#L74) | `JSON.stringify`, `Number.isFinite`, `String`, `date.getTime`, `date.toISOString` |

<a id="file-72efcf4de661"></a>

## meu/schedulerService/src/agents/llm/vercelAgent.ts

[meu/schedulerService/src/agents/llm/vercelAgent.ts](../../meu/schedulerService/src/agents/llm/vercelAgent.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../brokers/crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |
| `../../execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `./runMemory` | [meu/schedulerService/src/agents/llm/runMemory.ts](#file-f4f060233fd7) |
| `@/agents/llm/prompts/tradingPrompt` | [meu/schedulerService/src/agents/llm/prompts/tradingPrompt.ts](#file-ce309e1095e3) |
| `@/agents/llm/providers` | [meu/schedulerService/src/agents/llm/providers.ts](#file-52ea280ce42d) |
| `@/execution/crypto/cryptoTools` | [meu/schedulerService/src/execution/crypto/cryptoTools.ts](#file-c523be50b1bf) |
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/market-data/cryptoAnalysis` | [meu/schedulerService/src/market-data/cryptoAnalysis.ts](#file-1502d3e4c75f) |

### Imported by

- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `ai`, `ccxt`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `formatRecentTrades` | [45](../../meu/schedulerService/src/agents/llm/vercelAgent.ts#L45) | `lines.join`, `trades.slice` |
| `tradingAgent` | [54](../../meu/schedulerService/src/agents/llm/vercelAgent.ts#L54) | `AbortSignal.timeout`, `Coin.map`, `Date.now`, `JSON.stringify`, `Object.entries`, `TPROMPT.replace`, `analysis.push`, `coins.toString`, `exchange.fetchBalance`, `exchange.fetchMyTrades`, `exchange.fetchPositions`, `exchange.market`, `formatMarketAnalysis`, `formatRecentTrades`, `formatTradingPolicy`, `getCryptoTools`, `getIntradayIndicators`, `log.info`, `marketData.push`, `normalizeCryptoPositions`, `openPositions.map`, `provider.createModel`, `resolveLLMProvider`, `result.steps.at`, `result.steps.reduce`, `result.text.trim`, `tradingAgent.generate` |

<a id="file-d253cec9e69e"></a>

## meu/schedulerService/src/agents/llm/zerodhaAgent.ts

[meu/schedulerService/src/agents/llm/zerodhaAgent.ts](../../meu/schedulerService/src/agents/llm/zerodhaAgent.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `./runMemory` | [meu/schedulerService/src/agents/llm/runMemory.ts](#file-f4f060233fd7) |
| `@/agents/llm/prompts/zerodhaAgentPrompt` | [meu/schedulerService/src/agents/llm/prompts/zerodhaAgentPrompt.ts](#file-d6d4afdba380) |
| `@/agents/llm/providers` | [meu/schedulerService/src/agents/llm/providers.ts](#file-52ea280ce42d) |
| `@/execution/kite/stockTools` | [meu/schedulerService/src/execution/kite/stockTools.ts](#file-162fdce9c91b) |
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/market-data/indicators` | [meu/schedulerService/src/market-data/indicators.ts](#file-d2e1147adc7f) |

### Imported by

- [meu/schedulerService/src/algorithms/kite/kiteEmaSignals.ts](#file-7d719200c45d)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `ai`, `kiteconnect`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `getNseInstrumentMap` | [36](../../meu/schedulerService/src/agents/llm/zerodhaAgent.ts#L36) | `Date.now`, `all.map`, `kc.getInstruments` |
| `describeCandles` | [50](../../meu/schedulerService/src/agents/llm/zerodhaAgent.ts#L50) | `candles.map`, `ema`, `macd`, `rsi` |
| `zerodhaTradingAgent` | [72](../../meu/schedulerService/src/agents/llm/zerodhaAgent.ts#L72) | `AbortSignal.timeout`, `Date.now`, `JSON.stringify`, `agent.generate`, `describeCandles`, `errMeta`, `fmt`, `formatTradingPolicy`, `getNseInstrumentMap`, `getZerodhaTools`, `instruments.map`, `kc.getHistoricalData`, `kc.getHoldings`, `kc.getMargins`, `kc.getOrders`, `kc.getPositions`, `log.info`, `log.warn`, `provider.createModel`, `recentRuns.map`, `resolveLLMProvider`, `result.steps.at`, `result.steps.reduce`, `result.text.trim`, `symbols.join`, `today.getTime`, `tokenBySymbol.get` |
| `fmt` | [90](../../meu/schedulerService/src/agents/llm/zerodhaAgent.ts#L90) | — |

<a id="file-8a3ab198552f"></a>

## meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts

[meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](../../meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/delta-data` | [shared/trading/delta-data.ts](#file-780ed3a879a0) |
| `../../../../../shared/trading/exitPolicy` | [shared/trading/exitPolicy.ts](#file-6d32b175ded4) |
| `../../../../../shared/trading/perpetualBacktest` | [shared/trading/perpetualBacktest.ts](#file-14821081d1df) |
| `../../../../../shared/trading/strategies` | [shared/trading/strategies.ts](#file-08c346741655) |

### Imported by

- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu/schedulerService/src/workers/executionFailure.ts](#file-131187bc349f)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)
- [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `validateCryptoStrategy` | [12](../../meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts#L12) | `Math.abs`, `Number.isFinite`, `Number.isSafeInteger`, `Object.hasOwn`, `validateExitPolicy`, `validateStrategy` |

<a id="file-75b27250a586"></a>

## meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts

[meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](../../meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/delta-data` | [shared/trading/delta-data.ts](#file-780ed3a879a0) |
| `../../../../../shared/trading/emaCrossover` | [shared/trading/emaCrossover.ts](#file-1d7dd8e6da1e) |
| `../../../../../shared/trading/paperTrading` | [shared/trading/paperTrading.ts](#file-39c515f77d12) |
| `../../../../../shared/trading/perpetualBacktest` | [shared/trading/perpetualBacktest.ts](#file-14821081d1df) |
| `../../../../../shared/trading/sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `../../../../../shared/trading/strategies` | [shared/trading/strategies.ts](#file-08c346741655) |
| `../../brokers/crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |
| `../../brokers/delta/deltaStart` | [meu/schedulerService/src/brokers/delta/deltaStart.ts](#file-6557ced7c80f) |
| `../../execution/crypto/cryptoTools` | [meu/schedulerService/src/execution/crypto/cryptoTools.ts](#file-c523be50b1bf) |
| `../../execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `../../lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `./cryptoStrategyConfig` | [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f) |

### Imported by

- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `ccxt`, `mongodb`, `node:crypto`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `history` | [20](../../meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts#L20) | `Date.now`, `Math.floor`, `Math.max`, `loadDeltaBacktestData` |
| `sameContract` | [27](../../meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts#L27) | — |
| `runPaperStrategy` | [30](../../meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts#L30) | `advancePaperState`, `data.candles.at`, `db.collection`, `history`, `initializePaperState`, `log.info`, `records.findOne`, `records.insertOne`, `records.replaceOne`, `result.state.cash.toFixed`, `safety.assertActive`, `sameContract`, `strategyStateKey` |
| `invoke` | [48](../../meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts#L48) | `tool.execute` |
| `ownedPosition` | [52](../../meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts#L52) | `Number`, `Number.isFinite` |
| `runLiveCryptoStrategy` | [57](../../meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts#L57) | `Date.now`, `Math.abs`, `Math.min`, `Number`, `Number.isSafeInteger`, `Promise.all`, `createHash`, `cryptoEntryMarket`, `cryptoEntrySnapshot`, `data.candles.at`, `db.collection`, `entry.clientOrderId?.startsWith`, `errMeta`, `evaluateStrategy`, `exchange.fetchOrder`, `exchange.fetchPositions`, `exchange.fetchTicker`, `exchange.priceToPrecision`, `fetchCryptoLeverage`, `fetchCryptoOpenOrders`, `getCryptoTools`, `history`, `initialOrders.some`, `invoke`, `log.info`, `normalizeCryptoPositions`, `orders.some`, `ownedPosition`, `previewAutomaticCryptoLeverage`, `records.findOne`, `records.insertOne`, `records.replaceOne`, `safety.assertActive`, `safety.crypto.scopeSnapshot`, `safety.executeOrder`, `sameContract`, `strategyStateKey`, `validateQuote` |
| `validateQuote` | [147](../../meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts#L147) | `Date.now`, `Math.max`, `Number`, `Number.isFinite`, `evaluateMeanReversionEntry`, `exchange.priceToPrecision` |
| `beforeWrite` | [187](../../meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts#L187) | `safety.assertActive` |

<a id="file-14a300d88a33"></a>

## meu/schedulerService/src/algorithms/emaCrossover.ts

[meu/schedulerService/src/algorithms/emaCrossover.ts](../../meu/schedulerService/src/algorithms/emaCrossover.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../shared/trading/emaCrossover` | [shared/trading/emaCrossover.ts](#file-1d7dd8e6da1e) |

### Imported by

- [meu/schedulerService/src/algorithms/kite/kiteEmaSignals.ts](#file-7d719200c45d)
- [meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts](#file-670f89e9ba10)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-7d719200c45d"></a>

## meu/schedulerService/src/algorithms/kite/kiteEmaSignals.ts

[meu/schedulerService/src/algorithms/kite/kiteEmaSignals.ts](../../meu/schedulerService/src/algorithms/kite/kiteEmaSignals.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../agents/llm/zerodhaAgent` | [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e) |
| `@/algorithms/emaCrossover` | [meu/schedulerService/src/algorithms/emaCrossover.ts](#file-14a300d88a33) |

### Imported by

- [meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts](#file-670f89e9ba10)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `kiteconnect`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `getKiteEmaSignals` | [15](../../meu/schedulerService/src/algorithms/kite/kiteEmaSignals.ts#L15) | `Number`, `evaluateEmaCrossover`, `getNseInstrumentMap`, `instruments.map`, `kc.getHistoricalData`, `kc.getPositions`, `now.getTime`, `now.toISOString`, `positions.net.find`, `raw.map`, `results.push`, `tokenBySymbol.get` |

<a id="file-670f89e9ba10"></a>

## meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts

[meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts](../../meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../execution/kite/stockTools` | [meu/schedulerService/src/execution/kite/stockTools.ts](#file-162fdce9c91b) |
| `../../execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `./kiteEmaSignals` | [meu/schedulerService/src/algorithms/kite/kiteEmaSignals.ts](#file-7d719200c45d) |
| `@/algorithms/emaCrossover` | [meu/schedulerService/src/algorithms/emaCrossover.ts](#file-14a300d88a33) |

### Imported by

- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `kiteconnect`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `getLastPrice` | [9](../../meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts#L9) | `Number`, `Number.isFinite` |
| `runKiteEmaStrategy` | [16](../../meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts#L16) | `Math.floor`, `Math.max`, `Number`, `Number.isSafeInteger`, `Promise.all`, `getKiteEmaSignals`, `getLastPrice`, `kc.getMargins`, `kc.getOrders`, `kc.getPositions`, `kc.getQuote`, `orders.filter`, `outcomes.join`, `outcomes.push`, `pending.reduce`, `positions.day.reduce`, `positions.net.reduce`, `sizeLongPosition`, `submitKiteOrder` |

<a id="file-1fc4930582ed"></a>

## meu/schedulerService/src/brokers/binance/binanceExecution.ts

[meu/schedulerService/src/brokers/binance/binanceExecution.ts](../../meu/schedulerService/src/brokers/binance/binanceExecution.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `../crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |

### Imported by

- [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886)
- [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c)
- [meu/schedulerService/src/brokers/delta/deltaReconciliation.ts](#file-c1cc1175ff3a)
- [meu/schedulerService/src/execution/crypto/cryptoTools.ts](#file-c523be50b1bf)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)

External or unresolved imports: `ccxt`, `node:crypto`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `prepareBinanceAccount` | [6](../../meu/schedulerService/src/brokers/binance/binanceExecution.ts#L6) | `Number.isInteger`, `Promise.all`, `beforeWrite`, `exchange.fetchBalance`, `exchange.fetchPositionMode`, `exchange.market`, `exchange.setLeverage`, `exchange.setMarginMode`, `fetchCryptoLeverage`, `flat` |
| `flat` | [9](../../meu/schedulerService/src/brokers/binance/binanceExecution.ts#L9) | `Promise.all`, `exchange.fetchPositions`, `fetchCryptoOpenOrders`, `orders.some`, `positions.some` |
| `loadBinanceTier` | [30](../../meu/schedulerService/src/brokers/binance/binanceExecution.ts#L30) | `Number`, `exchange.fetchMarketLeverageTiers`, `exchange.market`, `rows.find` |
| `fetchManagedCryptoOrder` | [39](../../meu/schedulerService/src/brokers/binance/binanceExecution.ts#L39) | `Number`, `Number.isFinite`, `String`, `exchange.fetchOrder` |
| `submitBinanceProtectedEntry` | [61](../../meu/schedulerService/src/brokers/binance/binanceExecution.ts#L61) | `createHash`, `cryptoEntryMarket`, `id`, `safety.executeOrder` |
| `id` | [65](../../meu/schedulerService/src/brokers/binance/binanceExecution.ts#L65) | `randomUUID` |

<a id="file-8c5d1a686886"></a>

## meu/schedulerService/src/brokers/crypto/cryptoAccount.ts

[meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/accountRisk` | [shared/trading/accountRisk.ts](#file-60aebedf84e9) |
| `../../execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `../binance/binanceExecution` | [meu/schedulerService/src/brokers/binance/binanceExecution.ts](#file-1fc4930582ed) |
| `./cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |

### Imported by

- [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)
- [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3)
- [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a)
- [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1)

External or unresolved imports: `ccxt`, `mongodb`, `node:crypto`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `deltaAccountKey` | [17](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L17) | `Number.isSafeInteger`, `String`, `createHash` |
| `identifyDeltaAccount` | [22](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L22) | `String`, `createHash`, `deltaAccountKey`, `exchange.request` |
| `registerDeltaAccount` | [39](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L39) | `accountRiskSchema.parse`, `accounts.findOne`, `accounts.updateOne`, `db.collection` |
| `createCryptoAccountContext` | [52](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L52) | `accountRiskSchema.parse`, `createHash`, `db.collection` |
| `productId` | [59](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L59) | `Number`, `Number.isSafeInteger`, `String`, `exchange.market` |
| `key` | [65](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L65) | `productId` |
| `verify` | [67](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L67) | `Math.abs`, `Number`, `Number.isFinite`, `fetchManagedCryptoOrder`, `orders.findOne`, `orders.updateOne`, `owners.updateOne`, `pending.some`, `periods.updateOne`, `positions.find` |
| `scopeSnapshot` | [105](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L105) | `Number.isFinite`, `daily.findOne`, `daily.updateOne`, `db.collection`, `history.filter`, `key`, `owned.add`, `owned.has`, `owners.find`, `owners.findOne`, `periods.find`, `snapshot.openSymbols.has`, `verify` |
| `assertOwnsPosition` | [135](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L135) | `fetchCryptoOpenOrders`, `key`, `owners.findOne`, `verify` |
| `recordSubmission` | [140](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L140) | `clientOrderId.startsWith`, `key`, `orders.insertOne`, `owners.findOne`, `owners.insertOne`, `owners.replaceOne`, `owners.updateOne`, `periods.insertOne`, `productId`, `randomUUID` |
| `recordAccepted` | [161](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L161) | `orders.findOne`, `orders.updateOne` |
| `recordRefused` | [167](../../meu/schedulerService/src/brokers/crypto/cryptoAccount.ts#L167) | `orders.updateOne` |

<a id="file-6357ab2b453c"></a>

## meu/schedulerService/src/brokers/crypto/cryptoRisk.ts

[meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/marketDay` | [shared/trading/marketDay.ts](#file-79c73731e830) |
| `../../../../../shared/trading/sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `../../execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `../binance/binanceExecution` | [meu/schedulerService/src/brokers/binance/binanceExecution.ts](#file-1fc4930582ed) |
| `./cryptoAccount` | [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886) |

### Imported by

- [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661)
- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu/schedulerService/src/brokers/binance/binanceExecution.ts](#file-1fc4930582ed)
- [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886)
- [meu/schedulerService/src/brokers/delta/deltaReconciliation.ts](#file-c1cc1175ff3a)
- [meu/schedulerService/src/brokers/delta/deltaStart.ts](#file-6557ced7c80f)
- [meu/schedulerService/src/execution/crypto/cryptoTools.ts](#file-c523be50b1bf)
- [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)
- [meu_frontend/src/features/agents/server/edit-crypto-agent.ts](#file-5129a594abff)
- [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)

External or unresolved imports: `ccxt`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `cryptoDayStart` | [15](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L15) | `Date.now`, `exchangeMarketTimezone`, `marketDayStart` |
| `number` | [19](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L19) | `Number`, `Number.isFinite` |
| `normalizeCryptoPositions` | [29](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L29) | `positions.map` |
| `cryptoEntryMarket` | [43](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L43) | `exchange.market`, `number` |
| `fetchCryptoLeverage` | [58](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L58) | `exchange.fetchLeverage`, `exchange.fetchLeverages`, `exchange.fetchMarginMode`, `exchange.market` |
| `deltaRows` | [66](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L66) | `deltaPage.parse`, `exchange.request`, `rows.push`, `seen.add`, `seen.has` |
| `fetchCryptoOpenOrders` | [84](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L84) | `Promise.all`, `deltaRows`, `exchange.fetchOpenOrders`, `raw.map` |
| `fetchDailyCryptoLossReport` | [111](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L111) | `Date.now`, `Date.parse`, `Math.max`, `Number`, `Number.isFinite`, `Number.isSafeInteger`, `String`, `cryptoDayStart`, `deltaRows`, `events.push`, `exchange.fetchLedger`, `number`, `seen.add`, `seen.has` |
| `fetchDailyCryptoLoss` | [162](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L162) | `Date.now`, `fetchDailyCryptoLossReport` |
| `cryptoEntrySnapshot` | [166](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L166) | `Math.max`, `Number`, `Promise.all`, `cryptoDayStart`, `cryptoEntryMarket`, `exchange.fetchBalance`, `exchange.fetchPositionMode`, `exchange.fetchPositions`, `exchange.fetchTicker`, `exchange.request`, `fetchCryptoLeverage`, `fetchCryptoOpenOrders`, `fetchDailyCryptoLossReport`, `loadBinanceTier`, `metrics.push`, `normalizeCryptoPositions`, `number`, `openSymbols.add` |
| `accountHeadroom` | [255](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L255) | `Math.min`, `account.openSymbols.has`, `values.every` |
| `sizeCryptoEntry` | [269](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L269) | `Math.max`, `Math.min`, `Number`, `Number.isFinite`, `Number.isInteger`, `accountHeadroom`, `assertOrderAllowed`, `exchange.amountToPrecision`, `number`, `policy.symbols.find`, `sizeEntry`, `sizeProtectedFuturesEntry`, `snapshot.openSymbols.has`, `validateSizingPolicy` |
| `roundDown` | [307](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L307) | `Number`, `exchange.amountToPrecision` |
| `sizeProtectedFuturesEntry` | [353](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L353) | `Math.max`, `Math.min`, `Number.isSafeInteger`, `accountHeadroom`, `number`, `sizeEntry`, `snapshot.openSymbols.has` |
| `roundDown` | [416](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L416) | `Number`, `exchange.amountToPrecision` |
| `previewAutomaticCryptoLeverage` | [428](../../meu/schedulerService/src/brokers/crypto/cryptoRisk.ts#L428) | `selectAutomaticLeverage` |

<a id="file-c1cc1175ff3a"></a>

## meu/schedulerService/src/brokers/delta/deltaReconciliation.ts

[meu/schedulerService/src/brokers/delta/deltaReconciliation.ts](../../meu/schedulerService/src/brokers/delta/deltaReconciliation.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../binance/binanceExecution` | [meu/schedulerService/src/brokers/binance/binanceExecution.ts](#file-1fc4930582ed) |
| `../crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |

### Imported by

- [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2)
- [meu_frontend/src/features/exchange/server/reconciliation.ts](#file-d0180098de88)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)

External or unresolved imports: `ccxt`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `inspectDeltaOwnership` | [17](../../meu/schedulerService/src/brokers/delta/deltaReconciliation.ts#L17) | `Date.now`, `Math.abs`, `Number`, `Number.isFinite`, `Promise.all`, `exchange.fetchPositions`, `fetchCryptoOpenOrders`, `fetchManagedCryptoOrder`, `issues.push`, `managed.find`, `normalizeCryptoPositions`, `observed.set`, `orderRows.push`, `owner.orderRefs.includes`, `owner.orderRefs.map`, `owners.find`, `owners.some`, `pending.filter`, `pending.map`, `positions.find`, `positions.map`, `positions.some`, `refs.reduce`, `refs.some` |

<a id="file-6557ced7c80f"></a>

## meu/schedulerService/src/brokers/delta/deltaStart.ts

[meu/schedulerService/src/brokers/delta/deltaStart.ts](../../meu/schedulerService/src/brokers/delta/deltaStart.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `../crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |

### Imported by

- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu/schedulerService/src/execution/crypto/cryptoTools.ts](#file-c523be50b1bf)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)

External or unresolved imports: `ccxt`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `acknowledged` | [11](../../meu/schedulerService/src/brokers/delta/deltaStart.ts#L11) | — |
| `prepareDeltaStrategyAccount` | [18](../../meu/schedulerService/src/brokers/delta/deltaStart.ts#L18) | `Number.isInteger`, `Number.isSafeInteger`, `Promise.all`, `String`, `acknowledged`, `checkFlatAgain`, `cryptoEntryMarket`, `exchange.fetchMarginMode`, `exchange.fetchPositions`, `exchange.request`, `exchange.setLeverage`, `fetchCryptoLeverage`, `fetchCryptoOpenOrders`, `normalizeCryptoPositions`, `openPositions.some`, `options.beforeWrite`, `orders.some`, `positions.filter` |
| `checkFlatAgain` | [46](../../meu/schedulerService/src/brokers/delta/deltaStart.ts#L46) | `Promise.all`, `exchange.fetchPositions`, `fetchCryptoOpenOrders`, `latestOrders.some`, `nonzero.some`, `normalizeCryptoPositions` |

<a id="file-2e463653a27f"></a>

## meu/schedulerService/src/brokers/kite/kiteTokenManager.ts

[meu/schedulerService/src/brokers/kite/kiteTokenManager.ts](../../meu/schedulerService/src/brokers/kite/kiteTokenManager.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/notifications` | [meu/schedulerService/src/lib/notifications.ts](#file-61beab0a29e6) |

### Imported by

- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `kiteconnect`, `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `isTokenFresh` | [30](../../meu/schedulerService/src/brokers/kite/kiteTokenManager.ts#L30) | `ist.format` |
| `kiteLoginUrl` | [42](../../meu/schedulerService/src/brokers/kite/kiteTokenManager.ts#L42) | — |
| `notifyTokenNeeded` | [55](../../meu/schedulerService/src/brokers/kite/kiteTokenManager.ts#L55) | `String`, `emitNotification`, `kiteLoginUrl` |
| `getKiteForExchange` | [74](../../meu/schedulerService/src/brokers/kite/kiteTokenManager.ts#L74) | `String`, `errMeta`, `isTokenFresh`, `kc.getProfile`, `kc.setAccessToken`, `log.info`, `notifyTokenNeeded` |

<a id="file-9ba5db203d2d"></a>

## meu/schedulerService/src/config/config.ts

[meu/schedulerService/src/config/config.ts](../../meu/schedulerService/src/config/config.ts)

### Imported by

- [meu/schedulerService/src/schedulers/scheduler.ts](#file-7bac4a80687d)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)
- [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a)

External or unresolved imports: `ccxt`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `configureCryptoExchange` | [16](../../meu/schedulerService/src/config/config.ts#L16) | `exchange.setSandboxMode` |
| `formatSecondsToCycle` | [35](../../meu/schedulerService/src/config/config.ts#L35) | — |

<a id="file-17ef44ed3ae4"></a>

## meu/schedulerService/src/config/encryption.ts

[meu/schedulerService/src/config/encryption.ts](../../meu/schedulerService/src/config/encryption.ts)

### Imported by

- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `node:crypto`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `key` | [4](../../meu/schedulerService/src/config/encryption.ts#L4) | `Buffer.from` |
| `encryptSecret` | [11](../../meu/schedulerService/src/config/encryption.ts#L11) | `Buffer.concat`, `cipher.final`, `cipher.getAuthTag`, `cipher.update`, `createCipheriv`, `key`, `randomBytes` |
| `decryptSecret` | [17](../../meu/schedulerService/src/config/encryption.ts#L17) | `Buffer.concat`, `createDecipheriv`, `decipher.final`, `decipher.setAuthTag`, `decipher.update`, `key`, `parts.map`, `value.slice`, `value.startsWith` |

<a id="file-8327b69a7bcf"></a>

## meu/schedulerService/src/db/db.ts

[meu/schedulerService/src/db/db.ts](../../meu/schedulerService/src/db/db.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |

### Imported by

- [meu/schedulerService/index.ts](#file-b5c082703924)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `connectDB` | [11](../../meu/schedulerService/src/db/db.ts#L11) | `client.connect`, `client.db`, `errMeta`, `log.error`, `log.info` |
| `closeDB` | [22](../../meu/schedulerService/src/db/db.ts#L22) | `client.close`, `log.info` |

<a id="file-c523be50b1bf"></a>

## meu/schedulerService/src/execution/crypto/cryptoTools.ts

[meu/schedulerService/src/execution/crypto/cryptoTools.ts](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../brokers/binance/binanceExecution` | [meu/schedulerService/src/brokers/binance/binanceExecution.ts](#file-1fc4930582ed) |
| `../../brokers/crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |
| `../../brokers/delta/deltaStart` | [meu/schedulerService/src/brokers/delta/deltaStart.ts](#file-6557ced7c80f) |
| `../tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/toolLogging` | [meu/schedulerService/src/lib/toolLogging.ts](#file-314810885502) |

### Imported by

- [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661)
- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)

External or unresolved imports: `ai`, `ccxt`, `node:crypto`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `getCryptoTools` | [15](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L15) | `createHash`, `instrumentTools`, `tool`, `z.enum`, `z.number`, `z.object`, `z.string` |
| `scopedSymbol` | [17](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L17) | `exchange.market`, `safety.policy.symbols.some` |
| `entryQuote` | [25](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L25) | `Number`, `Number.isFinite`, `exchange.fetchTicker`, `exchange.priceToPrecision` |
| `nativeStopPrice` | [31](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L31) | `Number`, `Number.isFinite`, `exchange.priceToPrecision` |
| `closePosition` | [39](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L39) | `randomUUID`, `safety.assertActive`, `safety.executeOrder`, `scopedSymbol` |
| `execute` | [76](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L76) | `Number`, `cryptoEntryMarket`, `entryQuote`, `errMeta`, `exchange.priceToPrecision`, `log.error`, `log.info`, `nativeStopPrice`, `randomUUID`, `safety.executeOrder`, `scopedSymbol`, `submitBinanceProtectedEntry` |
| `execute` | [153](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L153) | `cryptoEntryMarket`, `cryptoEntrySnapshot`, `entryQuote`, `errMeta`, `log.warn`, `nativeStopPrice`, `safety.assertActive`, `safety.crypto.scopeSnapshot`, `scopedSymbol`, `sizeCryptoEntry` |
| `execute` | [170](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L170) | `errMeta`, `fetchCryptoOpenOrders`, `log.warn`, `safety.policy.symbols.map` |
| `execute` | [181](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L181) | `errMeta`, `log.warn`, `safety.executeOrder`, `scopedSymbol` |
| `execute` | [200](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L200) | `cryptoEntryMarket`, `cryptoEntrySnapshot`, `entryQuote`, `errMeta`, `log.warn`, `nativeStopPrice`, `previewAutomaticCryptoLeverage`, `safety.assertActive`, `safety.crypto.scopeSnapshot`, `safety.executeOrder`, `scopedSymbol`, `snapshot.orders.some`, `snapshot.positions.some` |
| `beforeWrite` | [217](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L217) | `safety.assertActive` |
| `execute` | [233](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L233) | `errMeta`, `fetchCryptoLeverage`, `log.error`, `scopedSymbol` |
| `execute` | [260](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L260) | `errMeta`, `exchange.fetchMyTrades`, `log.error`, `log.info` |
| `execute` | [288](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L288) | `errMeta`, `exchange.fetchPositions`, `log.error`, `log.info`, `normalizeCryptoPositions` |
| `execute` | [316](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L316) | `closePosition`, `errMeta`, `log.warn` |
| `execute` | [324](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L324) | `Number`, `allowed.includes`, `closePosition`, `closed.push`, `errMeta`, `exchange.fetchPositions`, `log.warn`, `normalizeCryptoPositions`, `safety.policy.symbols.map` |
| `execute` | [342](../../meu/schedulerService/src/execution/crypto/cryptoTools.ts#L342) | `Object.entries`, `errMeta`, `exchange.fetchBalance`, `log.error`, `log.info` |

<a id="file-103be3729f36"></a>

## meu/schedulerService/src/execution/dailyRiskUsage.ts

[meu/schedulerService/src/execution/dailyRiskUsage.ts](../../meu/schedulerService/src/execution/dailyRiskUsage.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../shared/trading/marketDay` | [shared/trading/marketDay.ts](#file-79c73731e830) |
| `./tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |

### Imported by

- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `reserveDailyEntry` | [16](../../meu/schedulerService/src/execution/dailyRiskUsage.ts#L16) | `Number.isSafeInteger`, `db.collection`, `marketDate`, `now.getTime`, `usage.findOne`, `usage.updateOne` |

<a id="file-162fdce9c91b"></a>

## meu/schedulerService/src/execution/kite/stockTools.ts

[meu/schedulerService/src/execution/kite/stockTools.ts](../../meu/schedulerService/src/execution/kite/stockTools.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/marketHours` | [meu/schedulerService/src/lib/marketHours.ts](#file-81bfe3a96d76) |
| `@/lib/toolLogging` | [meu/schedulerService/src/lib/toolLogging.ts](#file-314810885502) |

### Imported by

- [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e)
- [meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts](#file-670f89e9ba10)

External or unresolved imports: `ai`, `kiteconnect`, `node:crypto`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `kiteAgentTag` | [14](../../meu/schedulerService/src/execution/kite/stockTools.ts#L14) | `createHash` |
| `previewKiteOrderMargin` | [32](../../meu/schedulerService/src/execution/kite/stockTools.ts#L32) | `Number.isFinite`, `Number.isSafeInteger`, `kc.orderMargins` |
| `submitKiteOrder` | [40](../../meu/schedulerService/src/execution/kite/stockTools.ts#L40) | `errMeta`, `kiteAgentTag`, `log.error`, `log.info`, `safety.executeOrder` |
| `getZerodhaTools` | [142](../../meu/schedulerService/src/execution/kite/stockTools.ts#L142) | `instrumentTools`, `tool`, `z.array`, `z.enum`, `z.number`, `z.object`, `z.string` |
| `execute` | [159](../../meu/schedulerService/src/execution/kite/stockTools.ts#L159) | `submitKiteOrder` |
| `execute` | [167](../../meu/schedulerService/src/execution/kite/stockTools.ts#L167) | `errMeta`, `kiteAgentTag`, `log.error`, `safety.assertActive`, `safety.executeOrder` |
| `execute` | [190](../../meu/schedulerService/src/execution/kite/stockTools.ts#L190) | `errMeta`, `kc.getOrders`, `log.warn` |
| `execute` | [217](../../meu/schedulerService/src/execution/kite/stockTools.ts#L217) | `errMeta`, `kc.getPositions`, `log.warn` |
| `execute` | [242](../../meu/schedulerService/src/execution/kite/stockTools.ts#L242) | `errMeta`, `holdings.map`, `kc.getHoldings`, `log.warn` |
| `execute` | [264](../../meu/schedulerService/src/execution/kite/stockTools.ts#L264) | `Object.entries`, `errMeta`, `kc.getQuote`, `log.warn`, `symbols.map` |
| `execute` | [294](../../meu/schedulerService/src/execution/kite/stockTools.ts#L294) | `candles.slice`, `errMeta`, `kc.getHistoricalData`, `log.warn` |
| `execute` | [325](../../meu/schedulerService/src/execution/kite/stockTools.ts#L325) | `previewKiteOrderMargin`, `safety.assertActive`, `safety.policy.symbols.includes` |
| `execute` | [336](../../meu/schedulerService/src/execution/kite/stockTools.ts#L336) | `errMeta`, `kc.getMargins`, `log.warn` |

<a id="file-d18977cdf0f6"></a>

## meu/schedulerService/src/execution/tradeGuard.ts

[meu/schedulerService/src/execution/tradeGuard.ts](../../meu/schedulerService/src/execution/tradeGuard.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../shared/trading/sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `../brokers/crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |

### Imported by

- [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661)
- [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e)
- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts](#file-670f89e9ba10)
- [meu/schedulerService/src/brokers/binance/binanceExecution.ts](#file-1fc4930582ed)
- [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886)
- [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c)
- [meu/schedulerService/src/brokers/delta/deltaStart.ts](#file-6557ced7c80f)
- [meu/schedulerService/src/execution/crypto/cryptoTools.ts](#file-c523be50b1bf)
- [meu/schedulerService/src/execution/dailyRiskUsage.ts](#file-103be3729f36)
- [meu/schedulerService/src/execution/kite/stockTools.ts](#file-162fdce9c91b)
- [meu/schedulerService/src/workers/executionFailure.ts](#file-131187bc349f)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)
- [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)

External or unresolved imports: `ccxt`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `formatTradingPolicy` | [57](../../meu/schedulerService/src/execution/tradeGuard.ts#L57) | `budget`, `policy.symbols.join` |
| `budget` | [58](../../meu/schedulerService/src/execution/tradeGuard.ts#L58) | `Number` |
| `assertOrderAllowed` | [89](../../meu/schedulerService/src/execution/tradeGuard.ts#L89) | `Math.max`, `Math.min`, `Number.isSafeInteger`, `policy.symbols.includes`, `validateSizingPolicy` |
| `sizeLongPosition` | [118](../../meu/schedulerService/src/execution/tradeGuard.ts#L118) | `Math.floor`, `Math.max`, `Math.min`, `Number.isSafeInteger`, `sizeEntry`, `validateSizingPolicy` |
| `roundDown` | [144](../../meu/schedulerService/src/execution/tradeGuard.ts#L144) | `Math.floor` |

<a id="file-6660d32e3f12"></a>

## meu/schedulerService/src/lib/logger.ts

[meu/schedulerService/src/lib/logger.ts](../../meu/schedulerService/src/lib/logger.ts)

### Imported by

- [meu/schedulerService/index.ts](#file-b5c082703924)
- [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661)
- [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e)
- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu/schedulerService/src/brokers/kite/kiteTokenManager.ts](#file-2e463653a27f)
- [meu/schedulerService/src/db/db.ts](#file-8327b69a7bcf)
- [meu/schedulerService/src/execution/crypto/cryptoTools.ts](#file-c523be50b1bf)
- [meu/schedulerService/src/execution/kite/stockTools.ts](#file-162fdce9c91b)
- [meu/schedulerService/src/lib/notifications.ts](#file-61beab0a29e6)
- [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b)
- [meu/schedulerService/src/lib/toolLogging.ts](#file-314810885502)
- [meu/schedulerService/src/queue/queue.ts](#file-288fb59dec9a)
- [meu/schedulerService/src/schedulers/scheduler.ts](#file-7bac4a80687d)
- [meu/schedulerService/src/state/setStates.ts](#file-69401e8508aa)
- [meu/schedulerService/src/watchers/exchangeWatcher.ts](#file-7bd004ca62ea)
- [meu/schedulerService/src/watchers/watcher.ts](#file-3269cd2c1301)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `node:async_hooks`, `pino`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `errMeta` | [10](../../meu/schedulerService/src/lib/logger.ts#L10) | `Number.isSafeInteger`, `errorNames.has` |
| `sanitizeLogValue` | [16](../../meu/schedulerService/src/lib/logger.ts#L16) | `Array.isArray`, `Number.isFinite`, `Object.entries`, `errMeta`, `sanitizeLogValue`, `seen.add`, `seen.has`, `sensitiveKey.test`, `value.slice` |
| `getCurrentRunId` | [34](../../meu/schedulerService/src/lib/logger.ts#L34) | `context.getStore` |
| `runWithLogContext` | [39](../../meu/schedulerService/src/lib/logger.ts#L39) | `context.run`, `sanitizeLogValue` |
| `mixin` | [46](../../meu/schedulerService/src/lib/logger.ts#L46) | `context.getStore` |
| `bindings` | [47](../../meu/schedulerService/src/lib/logger.ts#L47) | `sanitizeLogValue` |
| `logMethod` | [49](../../meu/schedulerService/src/lib/logger.ts#L49) | `method.apply`, `sanitizeLogValue` |
| `childLogger` | [67](../../meu/schedulerService/src/lib/logger.ts#L67) | `logger.child`, `sanitizeLogValue` |

<a id="file-81bfe3a96d76"></a>

## meu/schedulerService/src/lib/marketHours.ts

[meu/schedulerService/src/lib/marketHours.ts](../../meu/schedulerService/src/lib/marketHours.ts)

### Imported by

- [meu/schedulerService/src/execution/kite/stockTools.ts](#file-162fdce9c91b)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `envHolidays` | [58](../../meu/schedulerService/src/lib/marketHours.ts#L58) | — |
| `istDateKey` | [69](../../meu/schedulerService/src/lib/marketHours.ts#L69) | — |
| `istClock` | [79](../../meu/schedulerService/src/lib/marketHours.ts#L79) | `Number`, `fmt.formatToParts`, `get`, `istDateKey` |
| `get` | [88](../../meu/schedulerService/src/lib/marketHours.ts#L88) | `parts.find` |
| `isIndianMarketOpen` | [102](../../meu/schedulerService/src/lib/marketHours.ts#L102) | `holidays.has`, `istClock`, `verifiedCalendar` |
| `verifiedCalendar` | [110](../../meu/schedulerService/src/lib/marketHours.ts#L110) | `Number`, `dateKey.slice` |
| `nextMarketOpen` | [119](../../meu/schedulerService/src/lib/marketHours.ts#L119) | `after.getTime`, `cursor.setTime`, `holidays.has`, `isIndianMarketOpen`, `istClock`, `istDateKey`, `nextIstMidnight.getTime`, `verifiedCalendar` |

<a id="file-61beab0a29e6"></a>

## meu/schedulerService/src/lib/notifications.ts

[meu/schedulerService/src/lib/notifications.ts](../../meu/schedulerService/src/lib/notifications.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/redis` | [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b) |

### Imported by

- [meu/schedulerService/src/brokers/kite/kiteTokenManager.ts](#file-2e463653a27f)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `bullmq`, `mongodb`, `node:crypto`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `setLegacyNotificationCollection` | [48](../../meu/schedulerService/src/lib/notifications.ts#L48) | — |
| `emitNotification` | [58](../../meu/schedulerService/src/lib/notifications.ts#L58) | `errMeta`, `getCurrentRunId`, `legacyCollection.insertOne`, `log.error`, `log.info`, `log.warn`, `notificationQueue.add`, `randomUUID` |

<a id="file-5940bbec8c7b"></a>

## meu/schedulerService/src/lib/redis.ts

[meu/schedulerService/src/lib/redis.ts](../../meu/schedulerService/src/lib/redis.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |

### Imported by

- [meu/schedulerService/src/lib/notifications.ts](#file-61beab0a29e6)
- [meu/schedulerService/src/queue/queue.ts](#file-288fb59dec9a)
- [meu/schedulerService/src/schedulers/scheduler.ts](#file-7bac4a80687d)
- [meu/schedulerService/src/state/setStates.ts](#file-69401e8508aa)
- [meu/schedulerService/src/watchers/exchangeWatcher.ts](#file-7bd004ca62ea)
- [meu/schedulerService/src/watchers/watcher.ts](#file-3269cd2c1301)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)

External or unresolved imports: `ioredis`, `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `getAgentCached` | [50](../../meu/schedulerService/src/lib/redis.ts#L50) | `JSON.parse`, `errMeta`, `log.warn`, `redis.del`, `redis.get` |
| `setAgentCached` | [62](../../meu/schedulerService/src/lib/redis.ts#L62) | `JSON.stringify`, `pipeline.exec`, `pipeline.sadd`, `pipeline.set`, `pipeline.srem`, `redis.pipeline` |
| `touchAgentTtl` | [75](../../meu/schedulerService/src/lib/redis.ts#L75) | `redis.expire` |
| `deleteAgentCached` | [79](../../meu/schedulerService/src/lib/redis.ts#L79) | `redis.del`, `redis.srem` |
| `listRunningAgentsCached` | [84](../../meu/schedulerService/src/lib/redis.ts#L84) | `redis.smembers` |
| `getExchangeCached` | [92](../../meu/schedulerService/src/lib/redis.ts#L92) | `JSON.parse`, `JSON.stringify`, `db.collection`, `redis.del`, `redis.get`, `redis.set` |
| `invalidateExchangeCached` | [121](../../meu/schedulerService/src/lib/redis.ts#L121) | `redis.del` |
| `closeRedis` | [125](../../meu/schedulerService/src/lib/redis.ts#L125) | `redis.quit` |

<a id="file-314810885502"></a>

## meu/schedulerService/src/lib/toolLogging.ts

[meu/schedulerService/src/lib/toolLogging.ts](../../meu/schedulerService/src/lib/toolLogging.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |

### Imported by

- [meu/schedulerService/src/execution/crypto/cryptoTools.ts](#file-c523be50b1bf)
- [meu/schedulerService/src/execution/kite/stockTools.ts](#file-162fdce9c91b)

External or unresolved imports: `ai`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `instrumentTools` | [7](../../meu/schedulerService/src/lib/toolLogging.ts#L7) | `Object.entries` |

<a id="file-1502d3e4c75f"></a>

## meu/schedulerService/src/market-data/cryptoAnalysis.ts

[meu/schedulerService/src/market-data/cryptoAnalysis.ts](../../meu/schedulerService/src/market-data/cryptoAnalysis.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./indicators` | [meu/schedulerService/src/market-data/indicators.ts](#file-d2e1147adc7f) |

### Imported by

- [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661)
- [meu/schedulerService/src/market-data/emaSnapshot.ts](#file-569b06ff8f40)
- [meu/schedulerService/src/workers/executionFailure.ts](#file-131187bc349f)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `ccxt`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `analysisTimeframe` | [11](../../meu/schedulerService/src/market-data/cryptoAnalysis.ts#L11) | `ANALYSIS_TIMEFRAMES.includes` |
| `getOHLCV` | [30](../../meu/schedulerService/src/market-data/cryptoAnalysis.ts#L30) | `exchange.fetchOHLCV` |
| `getCompletedHistory` | [35](../../meu/schedulerService/src/market-data/cryptoAnalysis.ts#L35) | `Array.isArray`, `Date.now`, `Math.ceil`, `Math.floor`, `Math.max`, `Math.min`, `Number.isSafeInteger`, `Promise.race`, `clearTimeout`, `exchange.fetchOHLCV`, `history.at`, `history.push`, `rows.at` |
| `getIntradayIndicators` | [82](../../meu/schedulerService/src/market-data/cryptoAnalysis.ts#L82) | `Date.now`, `Number.isSafeInteger`, `getCompletedHistory`, `macd`, `ohlcv.at`, `ohlcv.slice`, `rsi` |
| `getSwingIndicators` | [100](../../meu/schedulerService/src/market-data/cryptoAnalysis.ts#L100) | `Date.now`, `getIntradayIndicators` |
| `getLongTermIndicators` | [103](../../meu/schedulerService/src/market-data/cryptoAnalysis.ts#L103) | `Date.now`, `getIntradayIndicators` |
| `formatMarketAnalysis` | [108](../../meu/schedulerService/src/market-data/cryptoAnalysis.ts#L108) | `data.ohlcv.map` |

<a id="file-569b06ff8f40"></a>

## meu/schedulerService/src/market-data/emaSnapshot.ts

[meu/schedulerService/src/market-data/emaSnapshot.ts](../../meu/schedulerService/src/market-data/emaSnapshot.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/market-data/cryptoAnalysis` | [meu/schedulerService/src/market-data/cryptoAnalysis.ts](#file-1502d3e4c75f) |
| `@/market-data/indicators` | [meu/schedulerService/src/market-data/indicators.ts](#file-d2e1147adc7f) |

External or unresolved imports: `ccxt`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `getIndicators` | [5](../../meu/schedulerService/src/market-data/emaSnapshot.ts#L5) | `Date.now`, `Math.max`, `closedOhlcv.slice`, `ema`, `emaFast.slice`, `emaSlow.slice`, `getOHLCV`, `ohlcv.map`, `ohlcv.slice` |

<a id="file-d2e1147adc7f"></a>

## meu/schedulerService/src/market-data/indicators.ts

[meu/schedulerService/src/market-data/indicators.ts](../../meu/schedulerService/src/market-data/indicators.ts)

### Imported by

- [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e)
- [meu/schedulerService/src/market-data/cryptoAnalysis.ts](#file-1502d3e4c75f)
- [meu/schedulerService/src/market-data/emaSnapshot.ts](#file-569b06ff8f40)
- [meu/schedulerService/src/market-data/stockAnalysis.ts](#file-e312506c168c)

External or unresolved imports: `ccxt`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ema` | [8](../../meu/schedulerService/src/market-data/indicators.ts#L8) | — |
| `macd` | [35](../../meu/schedulerService/src/market-data/indicators.ts#L35) | `closes.slice`, `ema`, `emaFast.slice`, `emaSlow.slice`, `histogram.slice`, `macdLine.map`, `macdLine.slice`, `ohlcv.map`, `signal.slice` |
| `rsi` | [78](../../meu/schedulerService/src/market-data/indicators.ts#L78) | `Array.isArray`, `Math.max`, `result.slice` |

<a id="file-e312506c168c"></a>

## meu/schedulerService/src/market-data/stockAnalysis.ts

[meu/schedulerService/src/market-data/stockAnalysis.ts](../../meu/schedulerService/src/market-data/stockAnalysis.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./indicators` | [meu/schedulerService/src/market-data/indicators.ts](#file-d2e1147adc7f) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `fetchYahooOHLCV` | [4](../../meu/schedulerService/src/market-data/stockAnalysis.ts#L4) | `candles.push`, `fetch`, `response.json` |
| `getStocksIntradayIndicators` | [57](../../meu/schedulerService/src/market-data/stockAnalysis.ts#L57) | `fetchYahooOHLCV`, `macd`, `midPrices.slice`, `ohlcv.map`, `rsi` |
| `getStocksSwingIndicators` | [73](../../meu/schedulerService/src/market-data/stockAnalysis.ts#L73) | `fetchYahooOHLCV`, `macd`, `midPrices.slice`, `ohlcv.map`, `rsi` |
| `getStocksLongTermIndicators` | [89](../../meu/schedulerService/src/market-data/stockAnalysis.ts#L89) | `fetchYahooOHLCV`, `macd`, `midPrices.slice`, `ohlcv.map`, `rsi` |

<a id="file-288fb59dec9a"></a>

## meu/schedulerService/src/queue/queue.ts

[meu/schedulerService/src/queue/queue.ts](../../meu/schedulerService/src/queue/queue.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/redis` | [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b) |

### Imported by

- [meu/schedulerService/src/schedulers/scheduler.ts](#file-7bac4a80687d)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `bullmq`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-aa69a844ce0a"></a>

## meu/schedulerService/src/schedulers/exchangeScheduler.ts

[meu/schedulerService/src/schedulers/exchangeScheduler.ts](../../meu/schedulerService/src/schedulers/exchangeScheduler.ts)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-7bac4a80687d"></a>

## meu/schedulerService/src/schedulers/scheduler.ts

[meu/schedulerService/src/schedulers/scheduler.ts](../../meu/schedulerService/src/schedulers/scheduler.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/config/config` | [meu/schedulerService/src/config/config.ts](#file-9ba5db203d2d) |
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/redis` | [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b) |
| `@/queue/queue` | [meu/schedulerService/src/queue/queue.ts](#file-288fb59dec9a) |
| `@/state/setStates` | [meu/schedulerService/src/state/setStates.ts](#file-69401e8508aa) |

### Imported by

- [meu/schedulerService/index.ts](#file-b5c082703924)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `jobIdFor` | [9](../../meu/schedulerService/src/schedulers/scheduler.ts#L9) | — |
| `scheduleAgentRun` | [12](../../meu/schedulerService/src/schedulers/scheduler.ts#L12) | `Date.now`, `Math.max`, `Number.isSafeInteger`, `agentQueue.add`, `jobIdFor`, `log.info` |
| `reconcileOnce` | [19](../../meu/schedulerService/src/schedulers/scheduler.ts#L19) | `Date.now`, `Number`, `Number.isSafeInteger`, `String`, `agentQueue.getJob`, `collection.findOne`, `collection.updateOne`, `errMeta`, `job.getState`, `jobIdFor`, `log.error`, `reconcileAgents`, `scheduleAgentRun`, `setAgentCached`, `toAgentCacheEntry` |
| `startScheduler` | [48](../../meu/schedulerService/src/schedulers/scheduler.ts#L48) | `setInterval`, `tick` |
| `tick` | [50](../../meu/schedulerService/src/schedulers/scheduler.ts#L50) | `errMeta`, `log.error`, `reconcileOnce` |

<a id="file-ca7985984e9f"></a>

## meu/schedulerService/src/server/kiteCallbackServer.ts

[meu/schedulerService/src/server/kiteCallbackServer.ts](../../meu/schedulerService/src/server/kiteCallbackServer.ts)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-69401e8508aa"></a>

## meu/schedulerService/src/state/setStates.ts

[meu/schedulerService/src/state/setStates.ts](../../meu/schedulerService/src/state/setStates.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/redis` | [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b) |

### Imported by

- [meu/schedulerService/index.ts](#file-b5c082703924)
- [meu/schedulerService/src/schedulers/scheduler.ts](#file-7bac4a80687d)
- [meu/schedulerService/src/watchers/watcher.ts](#file-3269cd2c1301)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

External or unresolved imports: `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `toAgentCacheEntry` | [7](../../meu/schedulerService/src/state/setStates.ts#L7) | `a._id.toString`, `a.credentialId?.toString`, `a.exchangeId?.toString` |
| `bootstrapAgents` | [26](../../meu/schedulerService/src/state/setStates.ts#L26) | `log.info`, `setAgentCached`, `toAgentCacheEntry` |
| `reconcileAgents` | [37](../../meu/schedulerService/src/state/setStates.ts#L37) | `a._id.toString`, `cachedIds.filter`, `deleteAgentCached`, `listRunningAgentsCached`, `log.info`, `mongoIds.add`, `setAgentCached`, `toAgentCacheEntry` |

<a id="file-cfa1bd7ef921"></a>

## meu/schedulerService/src/state/state.ts

[meu/schedulerService/src/state/state.ts](../../meu/schedulerService/src/state/state.ts)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-7bd004ca62ea"></a>

## meu/schedulerService/src/watchers/exchangeWatcher.ts

[meu/schedulerService/src/watchers/exchangeWatcher.ts](../../meu/schedulerService/src/watchers/exchangeWatcher.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/redis` | [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b) |

External or unresolved imports: `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `startExchangeWatcher` | [8](../../meu/schedulerService/src/watchers/exchangeWatcher.ts#L8) | `logger.child`, `start` |
| `handleChange` | [22](../../meu/schedulerService/src/watchers/exchangeWatcher.ts#L22) | `change.documentKey._id.toString`, `invalidateExchangeCached`, `log.debug` |
| `start` | [28](../../meu/schedulerService/src/watchers/exchangeWatcher.ts#L28) | `changeStream.on`, `collection.watch`, `log.info` |

<a id="file-3269cd2c1301"></a>

## meu/schedulerService/src/watchers/watcher.ts

[meu/schedulerService/src/watchers/watcher.ts](../../meu/schedulerService/src/watchers/watcher.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/redis` | [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b) |
| `@/state/setStates` | [meu/schedulerService/src/state/setStates.ts](#file-69401e8508aa) |

### Imported by

- [meu/schedulerService/index.ts](#file-b5c082703924)

External or unresolved imports: `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `startWatcher` | [6](../../meu/schedulerService/src/watchers/watcher.ts#L6) | `Promise.resolve`, `logger.child`, `start` |
| `start` | [13](../../meu/schedulerService/src/watchers/watcher.ts#L13) | `collection.watch`, `current.on` |
| `retry` | [17](../../meu/schedulerService/src/watchers/watcher.ts#L17) | `Math.min`, `current.close`, `setTimeout` |

<a id="file-131187bc349f"></a>

## meu/schedulerService/src/workers/executionFailure.ts

[meu/schedulerService/src/workers/executionFailure.ts](../../meu/schedulerService/src/workers/executionFailure.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../shared/trading/delta-data` | [shared/trading/delta-data.ts](#file-780ed3a879a0) |
| `../algorithms/crypto/cryptoStrategyConfig` | [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f) |
| `../execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `../market-data/cryptoAnalysis` | [meu/schedulerService/src/market-data/cryptoAnalysis.ts](#file-1502d3e4c75f) |

### Imported by

- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `executionFailure` | [13](../../meu/schedulerService/src/workers/executionFailure.ts#L13) | `JSON.parse`, `Number.isInteger`, `context.stage.replaceAll`, `error.details`, `error.message.slice`, `names.has` |

<a id="file-a0f114ee53de"></a>

## meu/schedulerService/src/workers/worker.ts

[meu/schedulerService/src/workers/worker.ts](../../meu/schedulerService/src/workers/worker.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../shared/trading/delta-data` | [shared/trading/delta-data.ts](#file-780ed3a879a0) |
| `../../../../shared/trading/marketDay` | [shared/trading/marketDay.ts](#file-79c73731e830) |
| `../../../../shared/trading/sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `./executionFailure` | [meu/schedulerService/src/workers/executionFailure.ts](#file-131187bc349f) |
| `@/agents/llm/providers` | [meu/schedulerService/src/agents/llm/providers.ts](#file-52ea280ce42d) |
| `@/agents/llm/runMemory` | [meu/schedulerService/src/agents/llm/runMemory.ts](#file-f4f060233fd7) |
| `@/agents/llm/vercelAgent` | [meu/schedulerService/src/agents/llm/vercelAgent.ts](#file-72efcf4de661) |
| `@/agents/llm/zerodhaAgent` | [meu/schedulerService/src/agents/llm/zerodhaAgent.ts](#file-d253cec9e69e) |
| `@/algorithms/crypto/cryptoStrategyConfig` | [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f) |
| `@/algorithms/crypto/runCryptoStrategy` | [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586) |
| `@/algorithms/emaCrossover` | [meu/schedulerService/src/algorithms/emaCrossover.ts](#file-14a300d88a33) |
| `@/algorithms/kite/kiteEmaSignals` | [meu/schedulerService/src/algorithms/kite/kiteEmaSignals.ts](#file-7d719200c45d) |
| `@/algorithms/kite/runKiteEmaStrategy` | [meu/schedulerService/src/algorithms/kite/runKiteEmaStrategy.ts](#file-670f89e9ba10) |
| `@/brokers/crypto/cryptoAccount` | [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886) |
| `@/brokers/crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |
| `@/brokers/kite/kiteTokenManager` | [meu/schedulerService/src/brokers/kite/kiteTokenManager.ts](#file-2e463653a27f) |
| `@/config/config` | [meu/schedulerService/src/config/config.ts](#file-9ba5db203d2d) |
| `@/config/encryption` | [meu/schedulerService/src/config/encryption.ts](#file-17ef44ed3ae4) |
| `@/db/db` | [meu/schedulerService/src/db/db.ts](#file-8327b69a7bcf) |
| `@/execution/dailyRiskUsage` | [meu/schedulerService/src/execution/dailyRiskUsage.ts](#file-103be3729f36) |
| `@/execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `@/lib/logger` | [meu/schedulerService/src/lib/logger.ts](#file-6660d32e3f12) |
| `@/lib/marketHours` | [meu/schedulerService/src/lib/marketHours.ts](#file-81bfe3a96d76) |
| `@/lib/notifications` | [meu/schedulerService/src/lib/notifications.ts](#file-61beab0a29e6) |
| `@/lib/redis` | [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b) |
| `@/market-data/cryptoAnalysis` | [meu/schedulerService/src/market-data/cryptoAnalysis.ts](#file-1502d3e4c75f) |
| `@/queue/queue` | [meu/schedulerService/src/queue/queue.ts](#file-288fb59dec9a) |
| `@/schedulers/scheduler` | [meu/schedulerService/src/schedulers/scheduler.ts](#file-7bac4a80687d) |
| `@/state/setStates` | [meu/schedulerService/src/state/setStates.ts](#file-69401e8508aa) |

External or unresolved imports: `bullmq`, `ccxt`, `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `createRunProcessor` | [39](../../meu/schedulerService/src/workers/worker.ts#L39) | `db.collection`, `setLegacyNotificationCollection` |
| `processRun` | [46](../../meu/schedulerService/src/workers/worker.ts#L46) | `Boolean`, `Date.now`, `Math.floor`, `Math.max`, `Math.min`, `Number`, `Number.isFinite`, `Number.isSafeInteger`, `ObjectId.isValid`, `Promise.resolve`, `String`, `accountRiskSchema.parse`, `acquired.push`, `actionable.map`, `agent.market.symbols.join`, `agentQueue.getJob`, `agentQueue.toKey`, `agents.find`, `agents.findOne`, `agents.updateOne`, `analysisTimeframe`, `buildRunMemory`, `configureCryptoExchange`, `connection.exists`, `createCryptoAccountContext`, `cryptoEntryMarket`, `cryptoEntrySnapshot`, `db.collection`, `decryptSecret`, `deleteAgentCached`, `deltaExchange.loadMarkets`, `emitNotification`, `errMeta`, `exchange.loadMarkets`, `exchange.market`, `exchangeDoc.name.toUpperCase`, `executionFailure`, `executions.findOne`, `executions.insertOne`, `executions.updateOne`, `failure.code.startsWith`, `failure.symbols.join`, `getKiteEmaSignals`, `getKiteForExchange`, `holder.createdAt.getTime`, `identifyDeltaAccount`, `isIndianMarketOpen`, `job.updateData`, `key.split`, `lastSuccessfulReview.getTime`, `lastSuccessfulReview.toISOString`, `links.map`, `locks.deleteOne`, `locks.findOne`, `locks.insertOne`, `log.error`, `log.info`, `log.warn`, `memoryContext`, `next`, `nextMarketOpen`, `open.getTime`, `others.some`, `ownerJob.getState`, `peers.some`, `receipts.every`, `recent.map`, `registerDeltaAccount`, `response.trim`, `runKiteEmaStrategy`, `runLiveCryptoStrategy`, `runPaperStrategy`, `safety.crypto.scopeSnapshot`, `signals.filter`, `tradingAgent`, `validateCryptoStrategy`, `validateEmaCrossoverParams`, `validateSizingPolicy`, `zerodhaTradingAgent` |
| `next` | [56](../../meu/schedulerService/src/workers/worker.ts#L56) | `agents.findOne`, `agents.updateOne`, `scheduleAgentRun`, `setAgentCached`, `toAgentCacheEntry` |
| `canonical` | [124](../../meu/schedulerService/src/workers/worker.ts#L124) | `deltaExchange!.market` |
| `assertActive` | [189](../../meu/schedulerService/src/workers/worker.ts#L189) | `agents.findOne` |
| `reserveDailyEntry` | [194](../../meu/schedulerService/src/workers/worker.ts#L194) | `exchangeMarketTimezone`, `reserveDailyEntry` |
| `executeOrder` | [197](../../meu/schedulerService/src/workers/worker.ts#L197) | `operation.catch`, `serial.then` |
| `startWorkers` | [436](../../meu/schedulerService/src/workers/worker.ts#L436) | `connectDB`, `createRunProcessor`, `process.once`, `worker.on` |
| `shutdown` | [444](../../meu/schedulerService/src/workers/worker.ts#L444) | `closeDB`, `closeRedis`, `errMeta`, `log.error`, `log.info`, `worker.close` |

<a id="file-bcfd1ec380c1"></a>

## meu_frontend/src/app/(auth)/layout.tsx

[meu_frontend/src/app/(auth)/layout.tsx](../../meu_frontend/src/app/%28auth%29/layout.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/auth-shell` | [meu_frontend/src/components/auth-shell.tsx](#file-7cc37ddf222d) |

External or unresolved imports: `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Layout` | [4](../../meu_frontend/src/app/%28auth%29/layout.tsx#L4) | — |

<a id="file-8418dee91050"></a>

## meu_frontend/src/app/(auth)/login/page.tsx

[meu_frontend/src/app/(auth)/login/page.tsx](../../meu_frontend/src/app/%28auth%29/login/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/login` | [meu_frontend/src/components/login.tsx](#file-b650cf92caec) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [4](../../meu_frontend/src/app/%28auth%29/login/page.tsx#L4) | `requireNoAuth` |

<a id="file-d7cb34fa9ca0"></a>

## meu_frontend/src/app/(auth)/signup/page.tsx

[meu_frontend/src/app/(auth)/signup/page.tsx](../../meu_frontend/src/app/%28auth%29/signup/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/signup` | [meu_frontend/src/components/signup.tsx](#file-5cb998c8a647) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [4](../../meu_frontend/src/app/%28auth%29/signup/page.tsx#L4) | `requireNoAuth` |

<a id="file-313c27dc4df3"></a>

## meu_frontend/src/app/(dashboard)/agents/[agentId]/edit/page.tsx

[meu_frontend/src/app/(dashboard)/agents/[agentId]/edit/page.tsx](../../meu_frontend/src/app/%28dashboard%29/agents/[agentId]/edit/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/agents/components/EditAgent` | [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [14](../../meu_frontend/src/app/%28dashboard%29/agents/[agentId]/edit/page.tsx#L14) | `requireAuth` |

<a id="file-6903106b05fd"></a>

## meu_frontend/src/app/(dashboard)/agents/[agentId]/page.tsx

[meu_frontend/src/app/(dashboard)/agents/[agentId]/page.tsx](../../meu_frontend/src/app/%28dashboard%29/agents/[agentId]/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/agents/components/AgentDetailView` | [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [14](../../meu_frontend/src/app/%28dashboard%29/agents/[agentId]/page.tsx#L14) | `requireAuth` |

<a id="file-5b7fe1f94a73"></a>

## meu_frontend/src/app/(dashboard)/agents/create/page.tsx

[meu_frontend/src/app/(dashboard)/agents/create/page.tsx](../../meu_frontend/src/app/%28dashboard%29/agents/create/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/agents/components/createAgent` | [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [8](../../meu_frontend/src/app/%28dashboard%29/agents/create/page.tsx#L8) | `requireAuth` |

<a id="file-968870bfc4bb"></a>

## meu_frontend/src/app/(dashboard)/agents/page.tsx

[meu_frontend/src/app/(dashboard)/agents/page.tsx](../../meu_frontend/src/app/%28dashboard%29/agents/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/agents/components/agent` | [meu_frontend/src/features/agents/components/agent.tsx](#file-3984b831a40c) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [9](../../meu_frontend/src/app/%28dashboard%29/agents/page.tsx#L9) | `requireAuth` |

<a id="file-67b8a16fdcc7"></a>

## meu_frontend/src/app/(dashboard)/charts/page.tsx

[meu_frontend/src/app/(dashboard)/charts/page.tsx](../../meu_frontend/src/app/%28dashboard%29/charts/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/features/charts/components/charts-workspace` | [meu_frontend/src/features/charts/components/charts-workspace.tsx](#file-8c2aa8a37e03) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ChartsPage` | [4](../../meu_frontend/src/app/%28dashboard%29/charts/page.tsx#L4) | `requireAuth` |

<a id="file-052bcf1e24b9"></a>

## meu_frontend/src/app/(dashboard)/credentials/[credentialId]/edit/page.tsx

[meu_frontend/src/app/(dashboard)/credentials/[credentialId]/edit/page.tsx](../../meu_frontend/src/app/%28dashboard%29/credentials/[credentialId]/edit/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/credentials/components/EditCred` | [meu_frontend/src/features/credentials/components/EditCred.tsx](#file-ad04fd87d941) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [14](../../meu_frontend/src/app/%28dashboard%29/credentials/[credentialId]/edit/page.tsx#L14) | `requireAuth` |

<a id="file-36e5ab6db543"></a>

## meu_frontend/src/app/(dashboard)/credentials/[credentialId]/page.tsx

[meu_frontend/src/app/(dashboard)/credentials/[credentialId]/page.tsx](../../meu_frontend/src/app/%28dashboard%29/credentials/[credentialId]/page.tsx)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [7](../../meu_frontend/src/app/%28dashboard%29/credentials/[credentialId]/page.tsx#L7) | — |

<a id="file-dbffdf68cab5"></a>

## meu_frontend/src/app/(dashboard)/credentials/create/page.tsx

[meu_frontend/src/app/(dashboard)/credentials/create/page.tsx](../../meu_frontend/src/app/%28dashboard%29/credentials/create/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/features/credentials/components/createCred` | [meu_frontend/src/features/credentials/components/createCred.tsx](#file-a61b47d55b05) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [4](../../meu_frontend/src/app/%28dashboard%29/credentials/create/page.tsx#L4) | `requireAuth` |

<a id="file-a7babf3707cc"></a>

## meu_frontend/src/app/(dashboard)/credentials/page.tsx

[meu_frontend/src/app/(dashboard)/credentials/page.tsx](../../meu_frontend/src/app/%28dashboard%29/credentials/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/credentials/components/credentials` | [meu_frontend/src/features/credentials/components/credentials.tsx](#file-9f89f43602b3) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [8](../../meu_frontend/src/app/%28dashboard%29/credentials/page.tsx#L8) | `requireAuth` |

<a id="file-eff5f999ef04"></a>

## meu_frontend/src/app/(dashboard)/dashboard/page.tsx

[meu_frontend/src/app/(dashboard)/dashboard/page.tsx](../../meu_frontend/src/app/%28dashboard%29/dashboard/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/exchange/components/ExchangeDashboard` | [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [8](../../meu_frontend/src/app/%28dashboard%29/dashboard/page.tsx#L8) | `requireAuth` |

<a id="file-590cbaa3d7b3"></a>

## meu_frontend/src/app/(dashboard)/error.tsx

[meu_frontend/src/app/(dashboard)/error.tsx](../../meu_frontend/src/app/%28dashboard%29/error.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/lib/client-error-report` | [meu_frontend/src/lib/client-error-report.ts](#file-eea9cb8bcbfc) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `DashboardError` | [8](../../meu_frontend/src/app/%28dashboard%29/error.tsx#L8) | `useEffect` |

<a id="file-713bcbfecf18"></a>

## meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/edit/page.tsx

[meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/edit/page.tsx](../../meu_frontend/src/app/%28dashboard%29/exchanges/[exchangeId]/edit/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/exchange/components/EditExchange` | [meu_frontend/src/features/exchange/components/EditExchange.tsx](#file-c8683f166fff) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [14](../../meu_frontend/src/app/%28dashboard%29/exchanges/[exchangeId]/edit/page.tsx#L14) | `requireAuth` |

<a id="file-9e76096f5498"></a>

## meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/page.tsx

[meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/page.tsx](../../meu_frontend/src/app/%28dashboard%29/exchanges/[exchangeId]/page.tsx)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [7](../../meu_frontend/src/app/%28dashboard%29/exchanges/[exchangeId]/page.tsx#L7) | — |

<a id="file-b387ed1faddf"></a>

## meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/reconciliation/page.tsx

[meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/reconciliation/page.tsx](../../meu_frontend/src/app/%28dashboard%29/exchanges/[exchangeId]/reconciliation/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/features/exchange/components/reconciliation-workspace` | [meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx](#file-9f41ee2d0004) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ReconciliationPage` | [4](../../meu_frontend/src/app/%28dashboard%29/exchanges/[exchangeId]/reconciliation/page.tsx#L4) | `requireAuth` |

<a id="file-04b1ab4df132"></a>

## meu_frontend/src/app/(dashboard)/exchanges/create/page.tsx

[meu_frontend/src/app/(dashboard)/exchanges/create/page.tsx](../../meu_frontend/src/app/%28dashboard%29/exchanges/create/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/features/exchange/components/createEx` | [meu_frontend/src/features/exchange/components/createEx.tsx](#file-752d2ba61e29) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [4](../../meu_frontend/src/app/%28dashboard%29/exchanges/create/page.tsx#L4) | `requireAuth` |

<a id="file-dbb98e596cb7"></a>

## meu_frontend/src/app/(dashboard)/exchanges/page.tsx

[meu_frontend/src/app/(dashboard)/exchanges/page.tsx](../../meu_frontend/src/app/%28dashboard%29/exchanges/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/exchange/components/exchange` | [meu_frontend/src/features/exchange/components/exchange.tsx](#file-a53ef3559020) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [8](../../meu_frontend/src/app/%28dashboard%29/exchanges/page.tsx#L8) | `requireAuth` |

<a id="file-6143dc6a7c8f"></a>

## meu_frontend/src/app/(dashboard)/help/page.tsx

[meu_frontend/src/app/(dashboard)/help/page.tsx](../../meu_frontend/src/app/%28dashboard%29/help/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/features/help/components/help-workspace` | [meu_frontend/src/features/help/components/help-workspace.tsx](#file-3ad2ca352d6e) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `HelpPage` | [4](../../meu_frontend/src/app/%28dashboard%29/help/page.tsx#L4) | `requireAuth` |

<a id="file-dcdce6cb6d1f"></a>

## meu_frontend/src/app/(dashboard)/layout.tsx

[meu_frontend/src/app/(dashboard)/layout.tsx](../../meu_frontend/src/app/%28dashboard%29/layout.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/appHeader` | [meu_frontend/src/components/appHeader.tsx](#file-0f4a984bf6aa) |
| `@/components/appSidebar` | [meu_frontend/src/components/appSidebar.tsx](#file-60b41959bf0a) |
| `@/components/ui/sidebar` | [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76) |
| `@/features/notifications/components/notification-watcher` | [meu_frontend/src/features/notifications/components/notification-watcher.tsx](#file-11d66e1b38b9) |

External or unresolved imports: `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `RootLayout` | [7](../../meu_frontend/src/app/%28dashboard%29/layout.tsx#L7) | — |

<a id="file-bb5313af01a6"></a>

## meu_frontend/src/app/(dashboard)/loading.tsx

[meu_frontend/src/app/(dashboard)/loading.tsx](../../meu_frontend/src/app/%28dashboard%29/loading.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `DashboardLoading` | [3](../../meu_frontend/src/app/%28dashboard%29/loading.tsx#L3) | `Array.from` |

<a id="file-5150ab73d730"></a>

## meu_frontend/src/app/(dashboard)/notifications/[notificationId]/page.tsx

[meu_frontend/src/app/(dashboard)/notifications/[notificationId]/page.tsx](../../meu_frontend/src/app/%28dashboard%29/notifications/[notificationId]/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/notifications/components/NotificationView` | [meu_frontend/src/features/notifications/components/NotificationView.tsx](#file-69429fa545c9) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [14](../../meu_frontend/src/app/%28dashboard%29/notifications/[notificationId]/page.tsx#L14) | `requireAuth` |

<a id="file-af888a812245"></a>

## meu_frontend/src/app/(dashboard)/notifications/page.tsx

[meu_frontend/src/app/(dashboard)/notifications/page.tsx](../../meu_frontend/src/app/%28dashboard%29/notifications/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/LoggedErrorBoundary` | [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/features/notifications/components/notifications` | [meu_frontend/src/features/notifications/components/notifications.tsx](#file-7f59b6fb5baf) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |
| `@/trpc/server` | [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d) |

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Page` | [8](../../meu_frontend/src/app/%28dashboard%29/notifications/page.tsx#L8) | `requireAuth` |

<a id="file-c6b71346cae2"></a>

## meu_frontend/src/app/(dashboard)/settings/page.tsx

[meu_frontend/src/app/(dashboard)/settings/page.tsx](../../meu_frontend/src/app/%28dashboard%29/settings/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui-settings` | [meu_frontend/src/components/ui-settings.tsx](#file-10bad29dc90f) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/separator` | [meu_frontend/src/components/ui/separator.tsx](#file-53a723ab88ef) |
| `@/features/notifications/hooks/use-browser-notifications` | [meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts](#file-1f343c494dac) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `lucide-react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `AppearanceCard` | [19](../../meu_frontend/src/app/%28dashboard%29/settings/page.tsx#L19) | `LOOK_THEMES.map`, `useUISettings` |
| `NotificationsCard` | [85](../../meu_frontend/src/app/%28dashboard%29/settings/page.tsx#L85) | `useBrowserNotificationPermission` |
| `handleEnable` | [89](../../meu_frontend/src/app/%28dashboard%29/settings/page.tsx#L89) | `request` |
| `handleDisable` | [93](../../meu_frontend/src/app/%28dashboard%29/settings/page.tsx#L93) | `disable` |
| `SettingsPage` | [146](../../meu_frontend/src/app/%28dashboard%29/settings/page.tsx#L146) | — |

<a id="file-833f53dd6014"></a>

## meu_frontend/src/app/(dashboard)/strategies/page.tsx

[meu_frontend/src/app/(dashboard)/strategies/page.tsx](../../meu_frontend/src/app/%28dashboard%29/strategies/page.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/features/backtests/components/backtest-workspace` | [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4) |
| `@/lib/auth-utils` | [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `StrategiesPage` | [3](../../meu_frontend/src/app/%28dashboard%29/strategies/page.tsx#L3) | `requireAuth` |

<a id="file-77ec7a0ab574"></a>

## meu_frontend/src/app/api/auth/[...all]/route.ts

[meu_frontend/src/app/api/auth/[...all]/route.ts](../../meu_frontend/src/app/api/auth/[...all]/route.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/auth` | [meu_frontend/src/lib/auth.ts](#file-88f27c02508d) |

External or unresolved imports: `better-auth/next-js`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-996af6889829"></a>

## meu_frontend/src/app/api/client-errors/route.ts

[meu_frontend/src/app/api/client-errors/route.ts](../../meu_frontend/src/app/api/client-errors/route.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `@/lib/auth` | [meu_frontend/src/lib/auth.ts](#file-88f27c02508d) |
| `@/lib/client-error-validation` | [meu_frontend/src/lib/client-error-validation.ts](#file-6d8ab70e2e1a) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `canReport` | [11](../../meu_frontend/src/app/api/client-errors/route.ts#L11) | `Date.now`, `reportWindows.delete`, `reportWindows.get`, `reportWindows.has`, `reportWindows.set` |
| `POST` | [29](../../meu_frontend/src/app/api/client-errors/route.ts#L29) | `Number`, `appLog`, `auth.api.getSession`, `canReport`, `newRequestId`, `parseClientReport`, `readBoundedJsonBody`, `req.headers.get` |

<a id="file-8c016e19d984"></a>

## meu_frontend/src/app/api/exchange/[id]/route.ts

[meu_frontend/src/app/api/exchange/[id]/route.ts](../../meu_frontend/src/app/api/exchange/[id]/route.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `@/lib/auth` | [meu_frontend/src/lib/auth.ts](#file-88f27c02508d) |
| `@/lib/config` | [meu_frontend/src/lib/config.ts](#file-217ac8c08a1d) |

External or unresolved imports: `@trpc/server`, `next/server`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `GET` | [8](../../meu_frontend/src/app/api/exchange/[id]/route.ts#L8) | `NextResponse.json`, `appLog`, `auth.api.getSession`, `getExchangeData`, `newRequestId` |

<a id="file-2afea93d4a3f"></a>

## meu_frontend/src/app/api/health/route.ts

[meu_frontend/src/app/api/health/route.ts](../../meu_frontend/src/app/api/health/route.ts)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `GET` | [4](../../meu_frontend/src/app/api/health/route.ts#L4) | `Response.json` |

<a id="file-9b8b767a7f1d"></a>

## meu_frontend/src/app/api/push/subscribe/route.ts

[meu_frontend/src/app/api/push/subscribe/route.ts](../../meu_frontend/src/app/api/push/subscribe/route.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `@/lib/auth` | [meu_frontend/src/lib/auth.ts](#file-88f27c02508d) |
| `@/lib/client-error-validation` | [meu_frontend/src/lib/client-error-validation.ts](#file-6d8ab70e2e1a) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/lib/push-validation` | [meu_frontend/src/lib/push-validation.ts](#file-c82bb8b2781e) |

External or unresolved imports: `next/server`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `allowRegistration` | [10](../../meu_frontend/src/app/api/push/subscribe/route.ts#L10) | `Date.now`, `activeRegistrations.has`, `registrationWindows.delete`, `registrationWindows.get`, `registrationWindows.has`, `registrationWindows.set` |
| `POST` | [20](../../meu_frontend/src/app/api/push/subscribe/route.ts#L20) | `Date.now`, `NextResponse.json`, `activeRegistrations.add`, `activeRegistrations.delete`, `allowRegistration`, `appLog`, `auth.api.getSession`, `newRequestId`, `prisma.pushSubscription.count`, `prisma.pushSubscription.create`, `prisma.pushSubscription.updateMany`, `readBoundedJsonBody`, `req.headers.get`, `validPushEndpoint`, `validPushKeys` |
| `DELETE` | [88](../../meu_frontend/src/app/api/push/subscribe/route.ts#L88) | `Date.now`, `NextResponse.json`, `appLog`, `auth.api.getSession`, `newRequestId`, `prisma.pushSubscription.deleteMany` |

<a id="file-45fb100e52b8"></a>

## meu_frontend/src/app/api/trpc/[trpc]/route.ts

[meu_frontend/src/app/api/trpc/[trpc]/route.ts](../../meu_frontend/src/app/api/trpc/[trpc]/route.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `@/trpc/init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |
| `@/trpc/routers/_app` | [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195) |

External or unresolved imports: `@trpc/server/adapters/fetch`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `handler` | [6](../../meu_frontend/src/app/api/trpc/[trpc]/route.ts#L6) | `fetchRequestHandler`, `newRequestId`, `responseHeaders.set` |
| `createContext` | [12](../../meu_frontend/src/app/api/trpc/[trpc]/route.ts#L12) | `createTRPCContext` |
| `onError` | [13](../../meu_frontend/src/app/api/trpc/[trpc]/route.ts#L13) | `appLog`, `safeLogCode`, `safeProcedureName` |

<a id="file-9f5b43d9b9de"></a>

## meu_frontend/src/app/layout.tsx

[meu_frontend/src/app/layout.tsx](../../meu_frontend/src/app/layout.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

External or unresolved imports: `./globals.css`, `next`, `next/font/local`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `RootLayout` | [26](../../meu_frontend/src/app/layout.tsx#L26) | — |

<a id="file-f8a6e3de084a"></a>

## meu_frontend/src/components/LoggedErrorBoundary.tsx

[meu_frontend/src/components/LoggedErrorBoundary.tsx](../../meu_frontend/src/components/LoggedErrorBoundary.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/client-error-report` | [meu_frontend/src/lib/client-error-report.ts](#file-eea9cb8bcbfc) |

### Imported by

- [meu_frontend/src/app/(dashboard)/agents/[agentId]/edit/page.tsx](#file-313c27dc4df3)
- [meu_frontend/src/app/(dashboard)/agents/[agentId]/page.tsx](#file-6903106b05fd)
- [meu_frontend/src/app/(dashboard)/agents/create/page.tsx](#file-5b7fe1f94a73)
- [meu_frontend/src/app/(dashboard)/agents/page.tsx](#file-968870bfc4bb)
- [meu_frontend/src/app/(dashboard)/credentials/[credentialId]/edit/page.tsx](#file-052bcf1e24b9)
- [meu_frontend/src/app/(dashboard)/credentials/page.tsx](#file-a7babf3707cc)
- [meu_frontend/src/app/(dashboard)/dashboard/page.tsx](#file-eff5f999ef04)
- [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/edit/page.tsx](#file-713bcbfecf18)
- [meu_frontend/src/app/(dashboard)/exchanges/page.tsx](#file-dbb98e596cb7)
- [meu_frontend/src/app/(dashboard)/notifications/[notificationId]/page.tsx](#file-5150ab73d730)
- [meu_frontend/src/app/(dashboard)/notifications/page.tsx](#file-af888a812245)

External or unresolved imports: `react-error-boundary`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `LoggedErrorBoundary` | [6](../../meu_frontend/src/components/LoggedErrorBoundary.tsx#L6) | — |

<a id="file-0f4a984bf6aa"></a>

## meu_frontend/src/components/appHeader.tsx

[meu_frontend/src/components/appHeader.tsx](../../meu_frontend/src/components/appHeader.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./ui/sidebar` | [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76) |
| `@/components/ui-settings` | [meu_frontend/src/components/ui-settings.tsx](#file-10bad29dc90f) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/features/notifications/components/notification-bell` | [meu_frontend/src/features/notifications/components/notification-bell.tsx](#file-660ac2be4da1) |
| `@/lib/auth-client` | [meu_frontend/src/lib/auth-client.ts](#file-a6e64c486914) |

### Imported by

- [meu_frontend/src/app/(dashboard)/layout.tsx](#file-dcdce6cb6d1f)

External or unresolved imports: `lucide-react`, `next/link`, `next/navigation`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `BreadcrumbSite` | [22](../../meu_frontend/src/components/appHeader.tsx#L22) | `segments.slice` |
| `Header` | [51](../../meu_frontend/src/components/appHeader.tsx#L51) | `authClient.useSession`, `name.slice`, `pathname.split`, `usePathname`, `useUISettings` |

<a id="file-60b41959bf0a"></a>

## meu_frontend/src/components/appSidebar.tsx

[meu_frontend/src/components/appSidebar.tsx](../../meu_frontend/src/components/appSidebar.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./ui/sidebar` | [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76) |
| `@/components/meu-icons` | [meu_frontend/src/components/meu-icons.tsx](#file-e3bf63df54cd) |
| `@/components/meu-logo` | [meu_frontend/src/components/meu-logo.tsx](#file-6af34cce3d3d) |
| `@/features/notifications/hooks/use-browser-notifications` | [meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts](#file-1f343c494dac) |
| `@/features/notifications/hooks/use-notifications` | [meu_frontend/src/features/notifications/hooks/use-notifications.ts](#file-c84e6c94eb3d) |
| `@/lib/auth-client` | [meu_frontend/src/lib/auth-client.ts](#file-a6e64c486914) |

### Imported by

- [meu_frontend/src/app/(dashboard)/layout.tsx](#file-dcdce6cb6d1f)

External or unresolved imports: `lucide-react`, `next/link`, `next/navigation`, `react`, `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `SidebarStatus` | [34](../../meu_frontend/src/components/appSidebar.tsx#L34) | `useEffect`, `useState`, `useUnreadNotifications` |
| `tick` | [39](../../meu_frontend/src/components/appSidebar.tsx#L39) | `setTime` |
| `AppSidebar` | [73](../../meu_frontend/src/components/appSidebar.tsx#L73) | `sidebarItems.map`, `useBrowserNotificationPermission`, `usePathname`, `useRouter`, `useUnreadNotifications` |
| `onSuccess` | [183](../../meu_frontend/src/components/appSidebar.tsx#L183) | `router.push` |
| `onError` | [186](../../meu_frontend/src/components/appSidebar.tsx#L186) | `toast.error` |

<a id="file-7cc37ddf222d"></a>

## meu_frontend/src/components/auth-shell.tsx

[meu_frontend/src/components/auth-shell.tsx](../../meu_frontend/src/components/auth-shell.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/meu-logo` | [meu_frontend/src/components/meu-logo.tsx](#file-6af34cce3d3d) |

### Imported by

- [meu_frontend/src/app/(auth)/layout.tsx](#file-bcfd1ec380c1)

External or unresolved imports: `lucide-react`, `next/link`, `next/navigation`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `AuthShell` | [8](../../meu_frontend/src/components/auth-shell.tsx#L8) | `usePathname` |

<a id="file-e1341d0db420"></a>

## meu_frontend/src/components/entityComponents/Empty.tsx

[meu_frontend/src/components/entityComponents/Empty.tsx](../../meu_frontend/src/components/entityComponents/Empty.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/entityComponents/EntityStates.tsx](#file-d1a5439e4c25)
- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

External or unresolved imports: `react`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-d9686ce9473d"></a>

## meu_frontend/src/components/entityComponents/EntityAvatar.tsx

[meu_frontend/src/components/entityComponents/EntityAvatar.tsx](../../meu_frontend/src/components/entityComponents/EntityAvatar.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

External or unresolved imports: `lucide-react`, `next/image`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntityAvatar` | [35](../../meu_frontend/src/components/entityComponents/EntityAvatar.tsx#L35) | `cn` |

<a id="file-09f652494ac0"></a>

## meu_frontend/src/components/entityComponents/EntityBadge.tsx

[meu_frontend/src/components/entityComponents/EntityBadge.tsx](../../meu_frontend/src/components/entityComponents/EntityBadge.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntityBadge` | [17](../../meu_frontend/src/components/entityComponents/EntityBadge.tsx#L17) | `cn` |

<a id="file-c50e046c4d82"></a>

## meu_frontend/src/components/entityComponents/EntityContainer.tsx

[meu_frontend/src/components/entityComponents/EntityContainer.tsx](../../meu_frontend/src/components/entityComponents/EntityContainer.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./EntityListSkeleton` | [meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx](#file-341d99006f0d) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntityContainer` | [15](../../meu_frontend/src/components/entityComponents/EntityContainer.tsx#L15) | `cn` |

<a id="file-abbdd2d5aa24"></a>

## meu_frontend/src/components/entityComponents/EntityHeader.tsx

[meu_frontend/src/components/entityComponents/EntityHeader.tsx](../../meu_frontend/src/components/entityComponents/EntityHeader.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |

### Imported by

- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

External or unresolved imports: `lucide-react`, `next/link`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntityHeader` | [17](../../meu_frontend/src/components/entityComponents/EntityHeader.tsx#L17) | — |

<a id="file-ab7840c4ffc7"></a>

## meu_frontend/src/components/entityComponents/EntityItem.tsx

[meu_frontend/src/components/entityComponents/EntityItem.tsx](../../meu_frontend/src/components/entityComponents/EntityItem.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/dropdown-menu` | [meu_frontend/src/components/ui/dropdown-menu.tsx](#file-a909309f87df) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

External or unresolved imports: `lucide-react`, `next/link`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntityItem` | [27](../../meu_frontend/src/components/entityComponents/EntityItem.tsx#L27) | `cn` |
| `handleRemove` | [40](../../meu_frontend/src/components/entityComponents/EntityItem.tsx#L40) | `e.preventDefault`, `e.stopPropagation`, `onRemove` |
| `handleEdit` | [47](../../meu_frontend/src/components/entityComponents/EntityItem.tsx#L47) | `e.preventDefault`, `e.stopPropagation`, `onEdit` |

<a id="file-51b6547cb94e"></a>

## meu_frontend/src/components/entityComponents/EntityList.tsx

[meu_frontend/src/components/entityComponents/EntityList.tsx](../../meu_frontend/src/components/entityComponents/EntityList.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntityList` | [12](../../meu_frontend/src/components/entityComponents/EntityList.tsx#L12) | `cn`, `items.map` |

<a id="file-341d99006f0d"></a>

## meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx

[meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx](../../meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |

### Imported by

- [meu_frontend/src/components/entityComponents/EntityContainer.tsx](#file-c50e046c4d82)
- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntityCardsSkeleton` | [3](../../meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx#L3) | `Array.from` |
| `EntityListSkeleton` | [28](../../meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx#L28) | `Array.from` |
| `EntityDetailSkeleton` | [52](../../meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx#L52) | `Array.from` |

<a id="file-4998906ae439"></a>

## meu_frontend/src/components/entityComponents/EntityPagination.tsx

[meu_frontend/src/components/entityComponents/EntityPagination.tsx](../../meu_frontend/src/components/entityComponents/EntityPagination.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |

### Imported by

- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

External or unresolved imports: `lucide-react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntityPagination` | [11](../../meu_frontend/src/components/entityComponents/EntityPagination.tsx#L11) | — |

<a id="file-ea60ae8d3698"></a>

## meu_frontend/src/components/entityComponents/EntitySearch.tsx

[meu_frontend/src/components/entityComponents/EntitySearch.tsx](../../meu_frontend/src/components/entityComponents/EntitySearch.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

External or unresolved imports: `lucide-react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntitySearch` | [13](../../meu_frontend/src/components/entityComponents/EntitySearch.tsx#L13) | `cn` |

<a id="file-d1a5439e4c25"></a>

## meu_frontend/src/components/entityComponents/EntityStates.tsx

[meu_frontend/src/components/entityComponents/EntityStates.tsx](../../meu_frontend/src/components/entityComponents/EntityStates.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./Empty` | [meu_frontend/src/components/entityComponents/Empty.tsx](#file-e1341d0db420) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |

### Imported by

- [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a)

External or unresolved imports: `lucide-react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `LoadingView` | [10](../../meu_frontend/src/components/entityComponents/EntityStates.tsx#L10) | — |
| `ErrorView` | [26](../../meu_frontend/src/components/entityComponents/EntityStates.tsx#L26) | — |
| `EmptyView` | [48](../../meu_frontend/src/components/entityComponents/EntityStates.tsx#L48) | — |

<a id="file-c5798052126a"></a>

## meu_frontend/src/components/entityComponents/index.ts

[meu_frontend/src/components/entityComponents/index.ts](../../meu_frontend/src/components/entityComponents/index.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./Empty` | [meu_frontend/src/components/entityComponents/Empty.tsx](#file-e1341d0db420) |
| `./EntityAvatar` | [meu_frontend/src/components/entityComponents/EntityAvatar.tsx](#file-d9686ce9473d) |
| `./EntityBadge` | [meu_frontend/src/components/entityComponents/EntityBadge.tsx](#file-09f652494ac0) |
| `./EntityContainer` | [meu_frontend/src/components/entityComponents/EntityContainer.tsx](#file-c50e046c4d82) |
| `./EntityHeader` | [meu_frontend/src/components/entityComponents/EntityHeader.tsx](#file-abbdd2d5aa24) |
| `./EntityItem` | [meu_frontend/src/components/entityComponents/EntityItem.tsx](#file-ab7840c4ffc7) |
| `./EntityList` | [meu_frontend/src/components/entityComponents/EntityList.tsx](#file-51b6547cb94e) |
| `./EntityListSkeleton` | [meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx](#file-341d99006f0d) |
| `./EntityPagination` | [meu_frontend/src/components/entityComponents/EntityPagination.tsx](#file-4998906ae439) |
| `./EntitySearch` | [meu_frontend/src/components/entityComponents/EntitySearch.tsx](#file-ea60ae8d3698) |
| `./EntityStates` | [meu_frontend/src/components/entityComponents/EntityStates.tsx](#file-d1a5439e4c25) |

### Imported by

- [meu_frontend/src/app/(dashboard)/agents/[agentId]/edit/page.tsx](#file-313c27dc4df3)
- [meu_frontend/src/app/(dashboard)/agents/[agentId]/page.tsx](#file-6903106b05fd)
- [meu_frontend/src/app/(dashboard)/agents/create/page.tsx](#file-5b7fe1f94a73)
- [meu_frontend/src/app/(dashboard)/agents/page.tsx](#file-968870bfc4bb)
- [meu_frontend/src/app/(dashboard)/credentials/[credentialId]/edit/page.tsx](#file-052bcf1e24b9)
- [meu_frontend/src/app/(dashboard)/credentials/page.tsx](#file-a7babf3707cc)
- [meu_frontend/src/app/(dashboard)/dashboard/page.tsx](#file-eff5f999ef04)
- [meu_frontend/src/app/(dashboard)/error.tsx](#file-590cbaa3d7b3)
- [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/edit/page.tsx](#file-713bcbfecf18)
- [meu_frontend/src/app/(dashboard)/exchanges/page.tsx](#file-dbb98e596cb7)
- [meu_frontend/src/app/(dashboard)/notifications/[notificationId]/page.tsx](#file-5150ab73d730)
- [meu_frontend/src/app/(dashboard)/notifications/page.tsx](#file-af888a812245)
- [meu_frontend/src/features/agents/components/agent.tsx](#file-3984b831a40c)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)
- [meu_frontend/src/features/credentials/components/credentials.tsx](#file-9f89f43602b3)
- [meu_frontend/src/features/exchange/components/exchange.tsx](#file-a53ef3559020)
- [meu_frontend/src/features/notifications/components/notifications.tsx](#file-7f59b6fb5baf)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-b650cf92caec"></a>

## meu_frontend/src/components/login.tsx

[meu_frontend/src/components/login.tsx](../../meu_frontend/src/components/login.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/password-input` | [meu_frontend/src/components/password-input.tsx](#file-392b4a261058) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/lib/auth-client` | [meu_frontend/src/lib/auth-client.ts](#file-a6e64c486914) |

### Imported by

- [meu_frontend/src/app/(auth)/login/page.tsx](#file-8418dee91050)

External or unresolved imports: `@hookform/resolvers/zod`, `lucide-react`, `next/link`, `next/navigation`, `react-hook-form`, `sonner`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `LoginForm` | [32](../../meu_frontend/src/components/login.tsx#L32) | `form.handleSubmit`, `useForm`, `useRouter`, `zodResolver` |
| `onSubmit` | [43](../../meu_frontend/src/components/login.tsx#L43) | `authClient.signIn.email`, `form.clearErrors`, `form.setError`, `toast.error` |
| `onSuccess` | [50](../../meu_frontend/src/components/login.tsx#L50) | `router.push` |
| `onError` | [53](../../meu_frontend/src/components/login.tsx#L53) | `form.setError`, `toast.error` |

<a id="file-e3bf63df54cd"></a>

## meu_frontend/src/components/meu-icons.tsx

[meu_frontend/src/components/meu-icons.tsx](../../meu_frontend/src/components/meu-icons.tsx)

### Imported by

- [meu_frontend/src/components/appSidebar.tsx](#file-60b41959bf0a)

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Base` | [5](../../meu_frontend/src/components/meu-icons.tsx#L5) | — |
| `DashboardIcon` | [24](../../meu_frontend/src/components/meu-icons.tsx#L24) | — |
| `AgentIcon` | [35](../../meu_frontend/src/components/meu-icons.tsx#L35) | — |
| `CandlesIcon` | [46](../../meu_frontend/src/components/meu-icons.tsx#L46) | — |
| `PulseIcon` | [59](../../meu_frontend/src/components/meu-icons.tsx#L59) | — |
| `VaultIcon` | [67](../../meu_frontend/src/components/meu-icons.tsx#L67) | — |
| `BellIcon` | [78](../../meu_frontend/src/components/meu-icons.tsx#L78) | — |
| `TuneIcon` | [87](../../meu_frontend/src/components/meu-icons.tsx#L87) | — |
| `BoltIcon` | [97](../../meu_frontend/src/components/meu-icons.tsx#L97) | — |
| `ShieldCheckIcon` | [105](../../meu_frontend/src/components/meu-icons.tsx#L105) | — |

<a id="file-6af34cce3d3d"></a>

## meu_frontend/src/components/meu-logo.tsx

[meu_frontend/src/components/meu-logo.tsx](../../meu_frontend/src/components/meu-logo.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/appSidebar.tsx](#file-60b41959bf0a)
- [meu_frontend/src/components/auth-shell.tsx](#file-7cc37ddf222d)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `MeuMark` | [3](../../meu_frontend/src/components/meu-logo.tsx#L3) | `cn` |

<a id="file-392b4a261058"></a>

## meu_frontend/src/components/password-input.tsx

[meu_frontend/src/components/password-input.tsx](../../meu_frontend/src/components/password-input.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/login.tsx](#file-b650cf92caec)
- [meu_frontend/src/components/signup.tsx](#file-5cb998c8a647)

External or unresolved imports: `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `PasswordInput` | [8](../../meu_frontend/src/components/password-input.tsx#L8) | `cn`, `useState` |

<a id="file-5cb998c8a647"></a>

## meu_frontend/src/components/signup.tsx

[meu_frontend/src/components/signup.tsx](../../meu_frontend/src/components/signup.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/password-input` | [meu_frontend/src/components/password-input.tsx](#file-392b4a261058) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/lib/auth-client` | [meu_frontend/src/lib/auth-client.ts](#file-a6e64c486914) |

### Imported by

- [meu_frontend/src/app/(auth)/signup/page.tsx](#file-d7cb34fa9ca0)

External or unresolved imports: `@hookform/resolvers/zod`, `lucide-react`, `next/link`, `next/navigation`, `react-hook-form`, `sonner`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `SignupForm` | [37](../../meu_frontend/src/components/signup.tsx#L37) | `form.handleSubmit`, `useForm`, `useRouter`, `zodResolver` |
| `onSubmit` | [49](../../meu_frontend/src/components/signup.tsx#L49) | `authClient.signUp.email`, `form.clearErrors`, `form.setError`, `toast.error` |
| `onSuccess` | [57](../../meu_frontend/src/components/signup.tsx#L57) | `router.push` |
| `onError` | [60](../../meu_frontend/src/components/signup.tsx#L60) | `form.setError`, `toast.error` |

<a id="file-10bad29dc90f"></a>

## meu_frontend/src/components/ui-settings.tsx

[meu_frontend/src/components/ui-settings.tsx](../../meu_frontend/src/components/ui-settings.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/client-error-report` | [meu_frontend/src/lib/client-error-report.ts](#file-eea9cb8bcbfc) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/app/(dashboard)/settings/page.tsx](#file-c6b71346cae2)
- [meu_frontend/src/components/appHeader.tsx](#file-0f4a984bf6aa)
- [meu_frontend/src/features/backtests/components/backtest-price-chart.tsx](#file-33ffc77904e1)
- [meu_frontend/src/features/charts/components/candle-chart.tsx](#file-c9aab20b58a0)
- [meu_frontend/src/features/charts/components/charts-workspace.tsx](#file-8c2aa8a37e03)

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `reportSettingsFailure` | [7](../../meu_frontend/src/components/ui-settings.tsx#L7) | `reportClientError` |
| `normalizeLook` | [55](../../meu_frontend/src/components/ui-settings.tsx#L55) | `LOOK_THEMES.find` |
| `getSnapshot` | [80](../../meu_frontend/src/components/ui-settings.tsx#L80) | `JSON.parse`, `normalizeLook`, `window.localStorage.getItem` |
| `getServerSnapshot` | [96](../../meu_frontend/src/components/ui-settings.tsx#L96) | — |
| `subscribe` | [100](../../meu_frontend/src/components/ui-settings.tsx#L100) | `listeners.add` |
| `update` | [105](../../meu_frontend/src/components/ui-settings.tsx#L105) | `JSON.stringify`, `applySettings`, `getSnapshot`, `listeners.forEach`, `window.localStorage.setItem` |
| `syncToServer` | [117](../../meu_frontend/src/components/ui-settings.tsx#L117) | `api.settings.updateUi.mutate` |
| `applySettings` | [122](../../meu_frontend/src/components/ui-settings.tsx#L122) | `LOOK_THEMES.find`, `root.classList.add`, `root.classList.remove`, `root.style.setProperty` |
| `useUISettings` | [137](../../meu_frontend/src/components/ui-settings.tsx#L137) | `useCallback`, `useEffect`, `useSyncExternalStore` |

<a id="file-eff37b7f84f0"></a>

## meu_frontend/src/components/ui/accordion.tsx

[meu_frontend/src/components/ui/accordion.tsx](../../meu_frontend/src/components/ui/accordion.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-accordion`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Accordion` | [9](../../meu_frontend/src/components/ui/accordion.tsx#L9) | — |
| `AccordionItem` | [15](../../meu_frontend/src/components/ui/accordion.tsx#L15) | `cn` |
| `AccordionTrigger` | [28](../../meu_frontend/src/components/ui/accordion.tsx#L28) | `cn` |
| `AccordionContent` | [50](../../meu_frontend/src/components/ui/accordion.tsx#L50) | `cn` |

<a id="file-ed34d47c4dac"></a>

## meu_frontend/src/components/ui/alert-dialog.tsx

[meu_frontend/src/components/ui/alert-dialog.tsx](../../meu_frontend/src/components/ui/alert-dialog.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/notifications/components/notifications.tsx](#file-7f59b6fb5baf)

External or unresolved imports: `@radix-ui/react-alert-dialog`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `AlertDialog` | [9](../../meu_frontend/src/components/ui/alert-dialog.tsx#L9) | — |
| `AlertDialogTrigger` | [15](../../meu_frontend/src/components/ui/alert-dialog.tsx#L15) | — |
| `AlertDialogPortal` | [23](../../meu_frontend/src/components/ui/alert-dialog.tsx#L23) | — |
| `AlertDialogOverlay` | [31](../../meu_frontend/src/components/ui/alert-dialog.tsx#L31) | `cn` |
| `AlertDialogContent` | [47](../../meu_frontend/src/components/ui/alert-dialog.tsx#L47) | `cn` |
| `AlertDialogHeader` | [66](../../meu_frontend/src/components/ui/alert-dialog.tsx#L66) | `cn` |
| `AlertDialogFooter` | [79](../../meu_frontend/src/components/ui/alert-dialog.tsx#L79) | `cn` |
| `AlertDialogTitle` | [95](../../meu_frontend/src/components/ui/alert-dialog.tsx#L95) | `cn` |
| `AlertDialogDescription` | [108](../../meu_frontend/src/components/ui/alert-dialog.tsx#L108) | `cn` |
| `AlertDialogAction` | [121](../../meu_frontend/src/components/ui/alert-dialog.tsx#L121) | `buttonVariants`, `cn` |
| `AlertDialogCancel` | [133](../../meu_frontend/src/components/ui/alert-dialog.tsx#L133) | `buttonVariants`, `cn` |

<a id="file-4b3b987cd573"></a>

## meu_frontend/src/components/ui/alert.tsx

[meu_frontend/src/components/ui/alert.tsx](../../meu_frontend/src/components/ui/alert.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `class-variance-authority`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Alert` | [22](../../meu_frontend/src/components/ui/alert.tsx#L22) | `alertVariants`, `cn` |
| `AlertTitle` | [37](../../meu_frontend/src/components/ui/alert.tsx#L37) | `cn` |
| `AlertDescription` | [50](../../meu_frontend/src/components/ui/alert.tsx#L50) | `cn` |

<a id="file-ef7b0e00a902"></a>

## meu_frontend/src/components/ui/aspect-ratio.tsx

[meu_frontend/src/components/ui/aspect-ratio.tsx](../../meu_frontend/src/components/ui/aspect-ratio.tsx)

External or unresolved imports: `@radix-ui/react-aspect-ratio`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `AspectRatio` | [5](../../meu_frontend/src/components/ui/aspect-ratio.tsx#L5) | — |

<a id="file-e322d48e8673"></a>

## meu_frontend/src/components/ui/avatar.tsx

[meu_frontend/src/components/ui/avatar.tsx](../../meu_frontend/src/components/ui/avatar.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-avatar`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Avatar` | [8](../../meu_frontend/src/components/ui/avatar.tsx#L8) | `cn` |
| `AvatarImage` | [24](../../meu_frontend/src/components/ui/avatar.tsx#L24) | `cn` |
| `AvatarFallback` | [37](../../meu_frontend/src/components/ui/avatar.tsx#L37) | `cn` |

<a id="file-96008f791b5c"></a>

## meu_frontend/src/components/ui/badge.tsx

[meu_frontend/src/components/ui/badge.tsx](../../meu_frontend/src/components/ui/badge.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)
- [meu_frontend/src/features/notifications/components/NotificationView.tsx](#file-69429fa545c9)

External or unresolved imports: `@radix-ui/react-slot`, `class-variance-authority`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Badge` | [28](../../meu_frontend/src/components/ui/badge.tsx#L28) | `badgeVariants`, `cn` |

<a id="file-f311fadbc5f0"></a>

## meu_frontend/src/components/ui/breadcrumb.tsx

[meu_frontend/src/components/ui/breadcrumb.tsx](../../meu_frontend/src/components/ui/breadcrumb.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-slot`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Breadcrumb` | [7](../../meu_frontend/src/components/ui/breadcrumb.tsx#L7) | — |
| `BreadcrumbList` | [11](../../meu_frontend/src/components/ui/breadcrumb.tsx#L11) | `cn` |
| `BreadcrumbItem` | [24](../../meu_frontend/src/components/ui/breadcrumb.tsx#L24) | `cn` |
| `BreadcrumbLink` | [34](../../meu_frontend/src/components/ui/breadcrumb.tsx#L34) | `cn` |
| `BreadcrumbPage` | [52](../../meu_frontend/src/components/ui/breadcrumb.tsx#L52) | `cn` |
| `BreadcrumbSeparator` | [65](../../meu_frontend/src/components/ui/breadcrumb.tsx#L65) | `cn` |
| `BreadcrumbEllipsis` | [83](../../meu_frontend/src/components/ui/breadcrumb.tsx#L83) | `cn` |

<a id="file-f6c6961b6694"></a>

## meu_frontend/src/components/ui/button-group.tsx

[meu_frontend/src/components/ui/button-group.tsx](../../meu_frontend/src/components/ui/button-group.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/separator` | [meu_frontend/src/components/ui/separator.tsx](#file-53a723ab88ef) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-slot`, `class-variance-authority`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ButtonGroup` | [24](../../meu_frontend/src/components/ui/button-group.tsx#L24) | `buttonGroupVariants`, `cn` |
| `ButtonGroupText` | [40](../../meu_frontend/src/components/ui/button-group.tsx#L40) | `cn` |
| `ButtonGroupSeparator` | [60](../../meu_frontend/src/components/ui/button-group.tsx#L60) | `cn` |

<a id="file-caabce9f69f7"></a>

## meu_frontend/src/components/ui/button.tsx

[meu_frontend/src/components/ui/button.tsx](../../meu_frontend/src/components/ui/button.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/error.tsx](#file-590cbaa3d7b3)
- [meu_frontend/src/app/(dashboard)/settings/page.tsx](#file-c6b71346cae2)
- [meu_frontend/src/components/appHeader.tsx](#file-0f4a984bf6aa)
- [meu_frontend/src/components/entityComponents/EntityHeader.tsx](#file-abbdd2d5aa24)
- [meu_frontend/src/components/entityComponents/EntityItem.tsx](#file-ab7840c4ffc7)
- [meu_frontend/src/components/entityComponents/EntityPagination.tsx](#file-4998906ae439)
- [meu_frontend/src/components/entityComponents/EntitySearch.tsx](#file-ea60ae8d3698)
- [meu_frontend/src/components/entityComponents/EntityStates.tsx](#file-d1a5439e4c25)
- [meu_frontend/src/components/login.tsx](#file-b650cf92caec)
- [meu_frontend/src/components/signup.tsx](#file-5cb998c8a647)
- [meu_frontend/src/components/ui/alert-dialog.tsx](#file-ed34d47c4dac)
- [meu_frontend/src/components/ui/calendar.tsx](#file-5f2a05aae429)
- [meu_frontend/src/components/ui/carousel.tsx](#file-5cbde50d17bf)
- [meu_frontend/src/components/ui/input-group.tsx](#file-527fa4f479a7)
- [meu_frontend/src/components/ui/pagination.tsx](#file-56f81f70501f)
- [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76)
- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)
- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/agent-budget-fields.tsx](#file-4c202d5fe0ed)
- [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/agents/components/entry-preview.tsx](#file-568e139a6989)
- [meu_frontend/src/features/backtests/components/agent-launch.tsx](#file-af786abb6830)
- [meu_frontend/src/features/backtests/components/backtest-price-chart.tsx](#file-33ffc77904e1)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)
- [meu_frontend/src/features/backtests/components/paper-portfolio.tsx](#file-fc0f457d3c6a)
- [meu_frontend/src/features/charts/components/candle-chart.tsx](#file-c9aab20b58a0)
- [meu_frontend/src/features/charts/components/charts-workspace.tsx](#file-8c2aa8a37e03)
- [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2)
- [meu_frontend/src/features/credentials/components/EditCred.tsx](#file-ad04fd87d941)
- [meu_frontend/src/features/credentials/components/createCred.tsx](#file-a61b47d55b05)
- [meu_frontend/src/features/credentials/components/credentials.tsx](#file-9f89f43602b3)
- [meu_frontend/src/features/credentials/components/model-picker.tsx](#file-00eb873b472a)
- [meu_frontend/src/features/exchange/components/EditExchange.tsx](#file-c8683f166fff)
- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)
- [meu_frontend/src/features/exchange/components/account-execution-panel.tsx](#file-561367eaad9f)
- [meu_frontend/src/features/exchange/components/createEx.tsx](#file-752d2ba61e29)
- [meu_frontend/src/features/exchange/components/exchange.tsx](#file-a53ef3559020)
- [meu_frontend/src/features/exchange/components/portfolio-overview.tsx](#file-71c3b269af63)
- [meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx](#file-9f41ee2d0004)
- [meu_frontend/src/features/help/components/help-workspace.tsx](#file-3ad2ca352d6e)
- [meu_frontend/src/features/markets/components/ticker-picker.tsx](#file-1ecde0d5ac74)
- [meu_frontend/src/features/notifications/components/NotificationView.tsx](#file-69429fa545c9)
- [meu_frontend/src/features/notifications/components/notification-bell.tsx](#file-660ac2be4da1)
- [meu_frontend/src/features/notifications/components/notifications.tsx](#file-7f59b6fb5baf)

External or unresolved imports: `@radix-ui/react-slot`, `class-variance-authority`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Button` | [39](../../meu_frontend/src/components/ui/button.tsx#L39) | `buttonVariants`, `cn` |

<a id="file-5f2a05aae429"></a>

## meu_frontend/src/components/ui/calendar.tsx

[meu_frontend/src/components/ui/calendar.tsx](../../meu_frontend/src/components/ui/calendar.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `lucide-react`, `react`, `react-day-picker`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Calendar` | [18](../../meu_frontend/src/components/ui/calendar.tsx#L18) | `buttonVariants`, `cn`, `getDefaultClassNames` |
| `formatMonthDropdown` | [43](../../meu_frontend/src/components/ui/calendar.tsx#L43) | `date.toLocaleString` |
| `Root` | [135](../../meu_frontend/src/components/ui/calendar.tsx#L135) | `cn` |
| `Chevron` | [145](../../meu_frontend/src/components/ui/calendar.tsx#L145) | `cn` |
| `WeekNumber` | [166](../../meu_frontend/src/components/ui/calendar.tsx#L166) | — |
| `CalendarDayButton` | [182](../../meu_frontend/src/components/ui/calendar.tsx#L182) | `React.useEffect`, `React.useRef`, `cn`, `day.date.toLocaleDateString`, `getDefaultClassNames` |

<a id="file-a6e3af238d91"></a>

## meu_frontend/src/components/ui/card.tsx

[meu_frontend/src/components/ui/card.tsx](../../meu_frontend/src/components/ui/card.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/settings/page.tsx](#file-c6b71346cae2)
- [meu_frontend/src/components/entityComponents/EntityItem.tsx](#file-ab7840c4ffc7)
- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)
- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/agents/components/entry-preview.tsx](#file-568e139a6989)
- [meu_frontend/src/features/credentials/components/EditCred.tsx](#file-ad04fd87d941)
- [meu_frontend/src/features/credentials/components/createCred.tsx](#file-a61b47d55b05)
- [meu_frontend/src/features/exchange/components/EditExchange.tsx](#file-c8683f166fff)
- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)
- [meu_frontend/src/features/exchange/components/createEx.tsx](#file-752d2ba61e29)
- [meu_frontend/src/features/notifications/components/NotificationView.tsx](#file-69429fa545c9)

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Card` | [5](../../meu_frontend/src/components/ui/card.tsx#L5) | `cn` |
| `CardHeader` | [18](../../meu_frontend/src/components/ui/card.tsx#L18) | `cn` |
| `CardTitle` | [31](../../meu_frontend/src/components/ui/card.tsx#L31) | `cn` |
| `CardDescription` | [41](../../meu_frontend/src/components/ui/card.tsx#L41) | `cn` |
| `CardAction` | [51](../../meu_frontend/src/components/ui/card.tsx#L51) | `cn` |
| `CardContent` | [64](../../meu_frontend/src/components/ui/card.tsx#L64) | `cn` |
| `CardFooter` | [74](../../meu_frontend/src/components/ui/card.tsx#L74) | `cn` |

<a id="file-5cbde50d17bf"></a>

## meu_frontend/src/components/ui/carousel.tsx

[meu_frontend/src/components/ui/carousel.tsx](../../meu_frontend/src/components/ui/carousel.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `embla-carousel-react`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `useCarousel` | [35](../../meu_frontend/src/components/ui/carousel.tsx#L35) | `React.useContext` |
| `Carousel` | [45](../../meu_frontend/src/components/ui/carousel.tsx#L45) | `React.useCallback`, `React.useEffect`, `React.useState`, `cn`, `useEmblaCarousel` |
| `CarouselContent` | [135](../../meu_frontend/src/components/ui/carousel.tsx#L135) | `cn`, `useCarousel` |
| `CarouselItem` | [156](../../meu_frontend/src/components/ui/carousel.tsx#L156) | `cn`, `useCarousel` |
| `CarouselPrevious` | [174](../../meu_frontend/src/components/ui/carousel.tsx#L174) | `cn`, `useCarousel` |
| `CarouselNext` | [204](../../meu_frontend/src/components/ui/carousel.tsx#L204) | `cn`, `useCarousel` |

<a id="file-f34345485153"></a>

## meu_frontend/src/components/ui/chart.tsx

[meu_frontend/src/components/ui/chart.tsx](../../meu_frontend/src/components/ui/chart.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `react`, `recharts`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `useChart` | [27](../../meu_frontend/src/components/ui/chart.tsx#L27) | `React.useContext` |
| `ChartContainer` | [37](../../meu_frontend/src/components/ui/chart.tsx#L37) | `React.useId`, `cn`, `uniqueId.replace` |
| `ChartStyle` | [72](../../meu_frontend/src/components/ui/chart.tsx#L72) | `Object.entries` |
| `ChartTooltipContent` | [107](../../meu_frontend/src/components/ui/chart.tsx#L107) | `React.useMemo`, `cn`, `useChart` |
| `ChartLegendContent` | [255](../../meu_frontend/src/components/ui/chart.tsx#L255) | `cn`, `useChart` |
| `getPayloadConfigFromPayload` | [312](../../meu_frontend/src/components/ui/chart.tsx#L312) | — |

<a id="file-11a7e2a3811d"></a>

## meu_frontend/src/components/ui/checkbox.tsx

[meu_frontend/src/components/ui/checkbox.tsx](../../meu_frontend/src/components/ui/checkbox.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)

External or unresolved imports: `@radix-ui/react-checkbox`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Checkbox` | [9](../../meu_frontend/src/components/ui/checkbox.tsx#L9) | `cn` |

<a id="file-0c800d60a959"></a>

## meu_frontend/src/components/ui/collapsible.tsx

[meu_frontend/src/components/ui/collapsible.tsx](../../meu_frontend/src/components/ui/collapsible.tsx)

External or unresolved imports: `@radix-ui/react-collapsible`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Collapsible` | [5](../../meu_frontend/src/components/ui/collapsible.tsx#L5) | — |
| `CollapsibleTrigger` | [11](../../meu_frontend/src/components/ui/collapsible.tsx#L11) | — |
| `CollapsibleContent` | [22](../../meu_frontend/src/components/ui/collapsible.tsx#L22) | — |

<a id="file-f880b52c3559"></a>

## meu_frontend/src/components/ui/command.tsx

[meu_frontend/src/components/ui/command.tsx](../../meu_frontend/src/components/ui/command.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/dialog` | [meu_frontend/src/components/ui/dialog.tsx](#file-4beaf9ef9641) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2)
- [meu_frontend/src/features/credentials/components/model-picker.tsx](#file-00eb873b472a)
- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)
- [meu_frontend/src/features/markets/components/ticker-picker.tsx](#file-1ecde0d5ac74)

External or unresolved imports: `cmdk`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Command` | [16](../../meu_frontend/src/components/ui/command.tsx#L16) | `cn` |
| `CommandDialog` | [32](../../meu_frontend/src/components/ui/command.tsx#L32) | `cn` |
| `CommandInput` | [63](../../meu_frontend/src/components/ui/command.tsx#L63) | `cn` |
| `CommandList` | [85](../../meu_frontend/src/components/ui/command.tsx#L85) | `cn` |
| `CommandEmpty` | [101](../../meu_frontend/src/components/ui/command.tsx#L101) | — |
| `CommandGroup` | [113](../../meu_frontend/src/components/ui/command.tsx#L113) | `cn` |
| `CommandSeparator` | [129](../../meu_frontend/src/components/ui/command.tsx#L129) | `cn` |
| `CommandItem` | [142](../../meu_frontend/src/components/ui/command.tsx#L142) | `cn` |
| `CommandShortcut` | [158](../../meu_frontend/src/components/ui/command.tsx#L158) | `cn` |

<a id="file-8230cddfc2c2"></a>

## meu_frontend/src/components/ui/context-menu.tsx

[meu_frontend/src/components/ui/context-menu.tsx](../../meu_frontend/src/components/ui/context-menu.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-context-menu`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ContextMenu` | [9](../../meu_frontend/src/components/ui/context-menu.tsx#L9) | — |
| `ContextMenuTrigger` | [15](../../meu_frontend/src/components/ui/context-menu.tsx#L15) | — |
| `ContextMenuGroup` | [23](../../meu_frontend/src/components/ui/context-menu.tsx#L23) | — |
| `ContextMenuPortal` | [31](../../meu_frontend/src/components/ui/context-menu.tsx#L31) | — |
| `ContextMenuSub` | [39](../../meu_frontend/src/components/ui/context-menu.tsx#L39) | — |
| `ContextMenuRadioGroup` | [45](../../meu_frontend/src/components/ui/context-menu.tsx#L45) | — |
| `ContextMenuSubTrigger` | [56](../../meu_frontend/src/components/ui/context-menu.tsx#L56) | `cn` |
| `ContextMenuSubContent` | [80](../../meu_frontend/src/components/ui/context-menu.tsx#L80) | `cn` |
| `ContextMenuContent` | [96](../../meu_frontend/src/components/ui/context-menu.tsx#L96) | `cn` |
| `ContextMenuItem` | [114](../../meu_frontend/src/components/ui/context-menu.tsx#L114) | `cn` |
| `ContextMenuCheckboxItem` | [137](../../meu_frontend/src/components/ui/context-menu.tsx#L137) | `cn` |
| `ContextMenuRadioItem` | [163](../../meu_frontend/src/components/ui/context-menu.tsx#L163) | `cn` |
| `ContextMenuLabel` | [187](../../meu_frontend/src/components/ui/context-menu.tsx#L187) | `cn` |
| `ContextMenuSeparator` | [207](../../meu_frontend/src/components/ui/context-menu.tsx#L207) | `cn` |
| `ContextMenuShortcut` | [220](../../meu_frontend/src/components/ui/context-menu.tsx#L220) | `cn` |

<a id="file-4beaf9ef9641"></a>

## meu_frontend/src/components/ui/dialog.tsx

[meu_frontend/src/components/ui/dialog.tsx](../../meu_frontend/src/components/ui/dialog.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/ui/command.tsx](#file-f880b52c3559)

External or unresolved imports: `@radix-ui/react-dialog`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Dialog` | [9](../../meu_frontend/src/components/ui/dialog.tsx#L9) | — |
| `DialogTrigger` | [15](../../meu_frontend/src/components/ui/dialog.tsx#L15) | — |
| `DialogPortal` | [21](../../meu_frontend/src/components/ui/dialog.tsx#L21) | — |
| `DialogClose` | [27](../../meu_frontend/src/components/ui/dialog.tsx#L27) | — |
| `DialogOverlay` | [33](../../meu_frontend/src/components/ui/dialog.tsx#L33) | `cn` |
| `DialogContent` | [49](../../meu_frontend/src/components/ui/dialog.tsx#L49) | `cn` |
| `DialogHeader` | [83](../../meu_frontend/src/components/ui/dialog.tsx#L83) | `cn` |
| `DialogFooter` | [93](../../meu_frontend/src/components/ui/dialog.tsx#L93) | `cn` |
| `DialogTitle` | [106](../../meu_frontend/src/components/ui/dialog.tsx#L106) | `cn` |
| `DialogDescription` | [119](../../meu_frontend/src/components/ui/dialog.tsx#L119) | `cn` |

<a id="file-f5484344fc4d"></a>

## meu_frontend/src/components/ui/drawer.tsx

[meu_frontend/src/components/ui/drawer.tsx](../../meu_frontend/src/components/ui/drawer.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `react`, `vaul`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Drawer` | [8](../../meu_frontend/src/components/ui/drawer.tsx#L8) | — |
| `DrawerTrigger` | [14](../../meu_frontend/src/components/ui/drawer.tsx#L14) | — |
| `DrawerPortal` | [20](../../meu_frontend/src/components/ui/drawer.tsx#L20) | — |
| `DrawerClose` | [26](../../meu_frontend/src/components/ui/drawer.tsx#L26) | — |
| `DrawerOverlay` | [32](../../meu_frontend/src/components/ui/drawer.tsx#L32) | `cn` |
| `DrawerContent` | [48](../../meu_frontend/src/components/ui/drawer.tsx#L48) | `cn` |
| `DrawerHeader` | [75](../../meu_frontend/src/components/ui/drawer.tsx#L75) | `cn` |
| `DrawerFooter` | [88](../../meu_frontend/src/components/ui/drawer.tsx#L88) | `cn` |
| `DrawerTitle` | [98](../../meu_frontend/src/components/ui/drawer.tsx#L98) | `cn` |
| `DrawerDescription` | [111](../../meu_frontend/src/components/ui/drawer.tsx#L111) | `cn` |

<a id="file-a909309f87df"></a>

## meu_frontend/src/components/ui/dropdown-menu.tsx

[meu_frontend/src/components/ui/dropdown-menu.tsx](../../meu_frontend/src/components/ui/dropdown-menu.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/entityComponents/EntityItem.tsx](#file-ab7840c4ffc7)

External or unresolved imports: `@radix-ui/react-dropdown-menu`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `DropdownMenu` | [9](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L9) | — |
| `DropdownMenuPortal` | [15](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L15) | — |
| `DropdownMenuTrigger` | [23](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L23) | — |
| `DropdownMenuContent` | [34](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L34) | `cn` |
| `DropdownMenuGroup` | [54](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L54) | — |
| `DropdownMenuItem` | [62](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L62) | `cn` |
| `DropdownMenuCheckboxItem` | [85](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L85) | `cn` |
| `DropdownMenuRadioGroup` | [111](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L111) | — |
| `DropdownMenuRadioItem` | [122](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L122) | `cn` |
| `DropdownMenuLabel` | [146](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L146) | `cn` |
| `DropdownMenuSeparator` | [166](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L166) | `cn` |
| `DropdownMenuShortcut` | [179](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L179) | `cn` |
| `DropdownMenuSub` | [195](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L195) | — |
| `DropdownMenuSubTrigger` | [201](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L201) | `cn` |
| `DropdownMenuSubContent` | [225](../../meu_frontend/src/components/ui/dropdown-menu.tsx#L225) | `cn` |

<a id="file-81bcf9c30795"></a>

## meu_frontend/src/components/ui/empty.tsx

[meu_frontend/src/components/ui/empty.tsx](../../meu_frontend/src/components/ui/empty.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `class-variance-authority`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Empty` | [5](../../meu_frontend/src/components/ui/empty.tsx#L5) | `cn` |
| `EmptyHeader` | [18](../../meu_frontend/src/components/ui/empty.tsx#L18) | `cn` |
| `EmptyMedia` | [46](../../meu_frontend/src/components/ui/empty.tsx#L46) | `cn`, `emptyMediaVariants` |
| `EmptyTitle` | [61](../../meu_frontend/src/components/ui/empty.tsx#L61) | `cn` |
| `EmptyDescription` | [71](../../meu_frontend/src/components/ui/empty.tsx#L71) | `cn` |
| `EmptyContent` | [84](../../meu_frontend/src/components/ui/empty.tsx#L84) | `cn` |

<a id="file-f4505bee987d"></a>

## meu_frontend/src/components/ui/field.tsx

[meu_frontend/src/components/ui/field.tsx](../../meu_frontend/src/components/ui/field.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/label` | [meu_frontend/src/components/ui/label.tsx](#file-729f4f420ef1) |
| `@/components/ui/separator` | [meu_frontend/src/components/ui/separator.tsx](#file-53a723ab88ef) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `class-variance-authority`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `FieldSet` | [10](../../meu_frontend/src/components/ui/field.tsx#L10) | `cn` |
| `FieldLegend` | [24](../../meu_frontend/src/components/ui/field.tsx#L24) | `cn` |
| `FieldGroup` | [44](../../meu_frontend/src/components/ui/field.tsx#L44) | `cn` |
| `Field` | [81](../../meu_frontend/src/components/ui/field.tsx#L81) | `cn`, `fieldVariants` |
| `FieldContent` | [97](../../meu_frontend/src/components/ui/field.tsx#L97) | `cn` |
| `FieldLabel` | [110](../../meu_frontend/src/components/ui/field.tsx#L110) | `cn` |
| `FieldTitle` | [128](../../meu_frontend/src/components/ui/field.tsx#L128) | `cn` |
| `FieldDescription` | [141](../../meu_frontend/src/components/ui/field.tsx#L141) | `cn` |
| `FieldSeparator` | [156](../../meu_frontend/src/components/ui/field.tsx#L156) | `cn` |
| `FieldError` | [186](../../meu_frontend/src/components/ui/field.tsx#L186) | `cn`, `useMemo` |

<a id="file-2cb2dc7aa932"></a>

## meu_frontend/src/components/ui/form.tsx

[meu_frontend/src/components/ui/form.tsx](../../meu_frontend/src/components/ui/form.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/label` | [meu_frontend/src/components/ui/label.tsx](#file-729f4f420ef1) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/login.tsx](#file-b650cf92caec)
- [meu_frontend/src/components/signup.tsx](#file-5cb998c8a647)
- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/agent-budget-fields.tsx](#file-4c202d5fe0ed)
- [meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](#file-00d290523c22)
- [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/credentials/components/EditCred.tsx](#file-ad04fd87d941)
- [meu_frontend/src/features/credentials/components/createCred.tsx](#file-a61b47d55b05)
- [meu_frontend/src/features/exchange/components/EditExchange.tsx](#file-c8683f166fff)
- [meu_frontend/src/features/exchange/components/createEx.tsx](#file-752d2ba61e29)

External or unresolved imports: `@radix-ui/react-label`, `@radix-ui/react-slot`, `react`, `react-hook-form`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `FormField` | [32](../../meu_frontend/src/components/ui/form.tsx#L32) | — |
| `useFormField` | [45](../../meu_frontend/src/components/ui/form.tsx#L45) | `React.useContext`, `getFieldState`, `useFormContext`, `useFormState` |
| `FormItem` | [76](../../meu_frontend/src/components/ui/form.tsx#L76) | `React.useId`, `cn` |
| `FormLabel` | [90](../../meu_frontend/src/components/ui/form.tsx#L90) | `cn`, `useFormField` |
| `FormControl` | [107](../../meu_frontend/src/components/ui/form.tsx#L107) | `useFormField` |
| `FormDescription` | [125](../../meu_frontend/src/components/ui/form.tsx#L125) | `cn`, `useFormField` |
| `FormMessage` | [138](../../meu_frontend/src/components/ui/form.tsx#L138) | `String`, `cn`, `useFormField` |

<a id="file-ec8c56a7a926"></a>

## meu_frontend/src/components/ui/hover-card.tsx

[meu_frontend/src/components/ui/hover-card.tsx](../../meu_frontend/src/components/ui/hover-card.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-hover-card`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `HoverCard` | [8](../../meu_frontend/src/components/ui/hover-card.tsx#L8) | — |
| `HoverCardTrigger` | [14](../../meu_frontend/src/components/ui/hover-card.tsx#L14) | — |
| `HoverCardContent` | [22](../../meu_frontend/src/components/ui/hover-card.tsx#L22) | `cn` |

<a id="file-527fa4f479a7"></a>

## meu_frontend/src/components/ui/input-group.tsx

[meu_frontend/src/components/ui/input-group.tsx](../../meu_frontend/src/components/ui/input-group.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/textarea` | [meu_frontend/src/components/ui/textarea.tsx](#file-263dd5b6b75d) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `class-variance-authority`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `InputGroup` | [11](../../meu_frontend/src/components/ui/input-group.tsx#L11) | `cn` |
| `InputGroupAddon` | [60](../../meu_frontend/src/components/ui/input-group.tsx#L60) | `cn`, `inputGroupAddonVariants` |
| `InputGroupButton` | [100](../../meu_frontend/src/components/ui/input-group.tsx#L100) | `cn`, `inputGroupButtonVariants` |
| `InputGroupText` | [119](../../meu_frontend/src/components/ui/input-group.tsx#L119) | `cn` |
| `InputGroupInput` | [131](../../meu_frontend/src/components/ui/input-group.tsx#L131) | `cn` |
| `InputGroupTextarea` | [147](../../meu_frontend/src/components/ui/input-group.tsx#L147) | `cn` |

<a id="file-3a75b4c20de8"></a>

## meu_frontend/src/components/ui/input-otp.tsx

[meu_frontend/src/components/ui/input-otp.tsx](../../meu_frontend/src/components/ui/input-otp.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `input-otp`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `InputOTP` | [9](../../meu_frontend/src/components/ui/input-otp.tsx#L9) | `cn` |
| `InputOTPGroup` | [29](../../meu_frontend/src/components/ui/input-otp.tsx#L29) | `cn` |
| `InputOTPSlot` | [39](../../meu_frontend/src/components/ui/input-otp.tsx#L39) | `React.useContext`, `cn` |
| `InputOTPSeparator` | [69](../../meu_frontend/src/components/ui/input-otp.tsx#L69) | — |

<a id="file-763a125345f3"></a>

## meu_frontend/src/components/ui/input.tsx

[meu_frontend/src/components/ui/input.tsx](../../meu_frontend/src/components/ui/input.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/entityComponents/EntitySearch.tsx](#file-ea60ae8d3698)
- [meu_frontend/src/components/login.tsx](#file-b650cf92caec)
- [meu_frontend/src/components/password-input.tsx](#file-392b4a261058)
- [meu_frontend/src/components/signup.tsx](#file-5cb998c8a647)
- [meu_frontend/src/components/ui/input-group.tsx](#file-527fa4f479a7)
- [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76)
- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/agent-budget-fields.tsx](#file-4c202d5fe0ed)
- [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/agents/components/entry-preview.tsx](#file-568e139a6989)
- [meu_frontend/src/features/backtests/components/agent-launch.tsx](#file-af786abb6830)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)
- [meu_frontend/src/features/credentials/components/EditCred.tsx](#file-ad04fd87d941)
- [meu_frontend/src/features/credentials/components/createCred.tsx](#file-a61b47d55b05)
- [meu_frontend/src/features/credentials/components/model-picker.tsx](#file-00eb873b472a)
- [meu_frontend/src/features/exchange/components/EditExchange.tsx](#file-c8683f166fff)
- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)
- [meu_frontend/src/features/exchange/components/account-execution-panel.tsx](#file-561367eaad9f)
- [meu_frontend/src/features/exchange/components/createEx.tsx](#file-752d2ba61e29)
- [meu_frontend/src/features/help/components/help-workspace.tsx](#file-3ad2ca352d6e)

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Input` | [5](../../meu_frontend/src/components/ui/input.tsx#L5) | `cn` |

<a id="file-aa2bd4eb0462"></a>

## meu_frontend/src/components/ui/item.tsx

[meu_frontend/src/components/ui/item.tsx](../../meu_frontend/src/components/ui/item.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/separator` | [meu_frontend/src/components/ui/separator.tsx](#file-53a723ab88ef) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-slot`, `class-variance-authority`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ItemGroup` | [8](../../meu_frontend/src/components/ui/item.tsx#L8) | `cn` |
| `ItemSeparator` | [19](../../meu_frontend/src/components/ui/item.tsx#L19) | `cn` |
| `Item` | [54](../../meu_frontend/src/components/ui/item.tsx#L54) | `cn`, `itemVariants` |
| `ItemMedia` | [91](../../meu_frontend/src/components/ui/item.tsx#L91) | `cn`, `itemMediaVariants` |
| `ItemContent` | [106](../../meu_frontend/src/components/ui/item.tsx#L106) | `cn` |
| `ItemTitle` | [119](../../meu_frontend/src/components/ui/item.tsx#L119) | `cn` |
| `ItemDescription` | [132](../../meu_frontend/src/components/ui/item.tsx#L132) | `cn` |
| `ItemActions` | [146](../../meu_frontend/src/components/ui/item.tsx#L146) | `cn` |
| `ItemHeader` | [156](../../meu_frontend/src/components/ui/item.tsx#L156) | `cn` |
| `ItemFooter` | [169](../../meu_frontend/src/components/ui/item.tsx#L169) | `cn` |

<a id="file-b21d8d189df5"></a>

## meu_frontend/src/components/ui/kbd.tsx

[meu_frontend/src/components/ui/kbd.tsx](../../meu_frontend/src/components/ui/kbd.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Kbd` | [3](../../meu_frontend/src/components/ui/kbd.tsx#L3) | `cn` |
| `KbdGroup` | [18](../../meu_frontend/src/components/ui/kbd.tsx#L18) | `cn` |

<a id="file-729f4f420ef1"></a>

## meu_frontend/src/components/ui/label.tsx

[meu_frontend/src/components/ui/label.tsx](../../meu_frontend/src/components/ui/label.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/ui/field.tsx](#file-f4505bee987d)
- [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932)
- [meu_frontend/src/features/agents/components/entry-preview.tsx](#file-568e139a6989)

External or unresolved imports: `@radix-ui/react-label`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Label` | [8](../../meu_frontend/src/components/ui/label.tsx#L8) | `cn` |

<a id="file-74314c0f564a"></a>

## meu_frontend/src/components/ui/menubar.tsx

[meu_frontend/src/components/ui/menubar.tsx](../../meu_frontend/src/components/ui/menubar.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-menubar`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Menubar` | [9](../../meu_frontend/src/components/ui/menubar.tsx#L9) | `cn` |
| `MenubarMenu` | [25](../../meu_frontend/src/components/ui/menubar.tsx#L25) | — |
| `MenubarGroup` | [31](../../meu_frontend/src/components/ui/menubar.tsx#L31) | — |
| `MenubarPortal` | [37](../../meu_frontend/src/components/ui/menubar.tsx#L37) | — |
| `MenubarRadioGroup` | [43](../../meu_frontend/src/components/ui/menubar.tsx#L43) | — |
| `MenubarTrigger` | [51](../../meu_frontend/src/components/ui/menubar.tsx#L51) | `cn` |
| `MenubarContent` | [67](../../meu_frontend/src/components/ui/menubar.tsx#L67) | `cn` |
| `MenubarItem` | [91](../../meu_frontend/src/components/ui/menubar.tsx#L91) | `cn` |
| `MenubarCheckboxItem` | [114](../../meu_frontend/src/components/ui/menubar.tsx#L114) | `cn` |
| `MenubarRadioItem` | [140](../../meu_frontend/src/components/ui/menubar.tsx#L140) | `cn` |
| `MenubarLabel` | [164](../../meu_frontend/src/components/ui/menubar.tsx#L164) | `cn` |
| `MenubarSeparator` | [184](../../meu_frontend/src/components/ui/menubar.tsx#L184) | `cn` |
| `MenubarShortcut` | [197](../../meu_frontend/src/components/ui/menubar.tsx#L197) | `cn` |
| `MenubarSub` | [213](../../meu_frontend/src/components/ui/menubar.tsx#L213) | — |
| `MenubarSubTrigger` | [219](../../meu_frontend/src/components/ui/menubar.tsx#L219) | `cn` |
| `MenubarSubContent` | [243](../../meu_frontend/src/components/ui/menubar.tsx#L243) | `cn` |

<a id="file-4a474d0a0863"></a>

## meu_frontend/src/components/ui/navigation-menu.tsx

[meu_frontend/src/components/ui/navigation-menu.tsx](../../meu_frontend/src/components/ui/navigation-menu.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-navigation-menu`, `class-variance-authority`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `NavigationMenu` | [8](../../meu_frontend/src/components/ui/navigation-menu.tsx#L8) | `cn` |
| `NavigationMenuList` | [32](../../meu_frontend/src/components/ui/navigation-menu.tsx#L32) | `cn` |
| `NavigationMenuItem` | [48](../../meu_frontend/src/components/ui/navigation-menu.tsx#L48) | `cn` |
| `NavigationMenuTrigger` | [65](../../meu_frontend/src/components/ui/navigation-menu.tsx#L65) | `cn`, `navigationMenuTriggerStyle` |
| `NavigationMenuContent` | [85](../../meu_frontend/src/components/ui/navigation-menu.tsx#L85) | `cn` |
| `NavigationMenuViewport` | [102](../../meu_frontend/src/components/ui/navigation-menu.tsx#L102) | `cn` |
| `NavigationMenuLink` | [124](../../meu_frontend/src/components/ui/navigation-menu.tsx#L124) | `cn` |
| `NavigationMenuIndicator` | [140](../../meu_frontend/src/components/ui/navigation-menu.tsx#L140) | `cn` |

<a id="file-56f81f70501f"></a>

## meu_frontend/src/components/ui/pagination.tsx

[meu_frontend/src/components/ui/pagination.tsx](../../meu_frontend/src/components/ui/pagination.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Pagination` | [11](../../meu_frontend/src/components/ui/pagination.tsx#L11) | `cn` |
| `PaginationContent` | [23](../../meu_frontend/src/components/ui/pagination.tsx#L23) | `cn` |
| `PaginationItem` | [36](../../meu_frontend/src/components/ui/pagination.tsx#L36) | — |
| `PaginationLink` | [45](../../meu_frontend/src/components/ui/pagination.tsx#L45) | `buttonVariants`, `cn` |
| `PaginationPrevious` | [68](../../meu_frontend/src/components/ui/pagination.tsx#L68) | `cn` |
| `PaginationNext` | [85](../../meu_frontend/src/components/ui/pagination.tsx#L85) | `cn` |
| `PaginationEllipsis` | [102](../../meu_frontend/src/components/ui/pagination.tsx#L102) | `cn` |

<a id="file-ee0b115629d8"></a>

## meu_frontend/src/components/ui/popover.tsx

[meu_frontend/src/components/ui/popover.tsx](../../meu_frontend/src/components/ui/popover.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2)
- [meu_frontend/src/features/credentials/components/model-picker.tsx](#file-00eb873b472a)
- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)
- [meu_frontend/src/features/markets/components/ticker-picker.tsx](#file-1ecde0d5ac74)
- [meu_frontend/src/features/notifications/components/notification-bell.tsx](#file-660ac2be4da1)

External or unresolved imports: `@radix-ui/react-popover`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Popover` | [8](../../meu_frontend/src/components/ui/popover.tsx#L8) | — |
| `PopoverTrigger` | [14](../../meu_frontend/src/components/ui/popover.tsx#L14) | — |
| `PopoverContent` | [20](../../meu_frontend/src/components/ui/popover.tsx#L20) | `cn` |
| `PopoverAnchor` | [42](../../meu_frontend/src/components/ui/popover.tsx#L42) | — |

<a id="file-908f8d4c4daf"></a>

## meu_frontend/src/components/ui/progress.tsx

[meu_frontend/src/components/ui/progress.tsx](../../meu_frontend/src/components/ui/progress.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-progress`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Progress` | [8](../../meu_frontend/src/components/ui/progress.tsx#L8) | `cn` |

<a id="file-0962ccbebd06"></a>

## meu_frontend/src/components/ui/radio-group.tsx

[meu_frontend/src/components/ui/radio-group.tsx](../../meu_frontend/src/components/ui/radio-group.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-radio-group`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `RadioGroup` | [9](../../meu_frontend/src/components/ui/radio-group.tsx#L9) | `cn` |
| `RadioGroupItem` | [22](../../meu_frontend/src/components/ui/radio-group.tsx#L22) | `cn` |

<a id="file-ee5d87634e98"></a>

## meu_frontend/src/components/ui/resizable.tsx

[meu_frontend/src/components/ui/resizable.tsx](../../meu_frontend/src/components/ui/resizable.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `lucide-react`, `react`, `react-resizable-panels`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ResizablePanelGroup` | [9](../../meu_frontend/src/components/ui/resizable.tsx#L9) | `cn` |
| `ResizablePanel` | [25](../../meu_frontend/src/components/ui/resizable.tsx#L25) | — |
| `ResizableHandle` | [31](../../meu_frontend/src/components/ui/resizable.tsx#L31) | `cn` |

<a id="file-4cf97c5b3cd2"></a>

## meu_frontend/src/components/ui/scroll-area.tsx

[meu_frontend/src/components/ui/scroll-area.tsx](../../meu_frontend/src/components/ui/scroll-area.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/notifications/components/notification-bell.tsx](#file-660ac2be4da1)

External or unresolved imports: `@radix-ui/react-scroll-area`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ScrollArea` | [8](../../meu_frontend/src/components/ui/scroll-area.tsx#L8) | `cn` |
| `ScrollBar` | [31](../../meu_frontend/src/components/ui/scroll-area.tsx#L31) | `cn` |

<a id="file-f8f0016aa124"></a>

## meu_frontend/src/components/ui/select.tsx

[meu_frontend/src/components/ui/select.tsx](../../meu_frontend/src/components/ui/select.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](#file-00d290523c22)
- [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/agents/components/entry-preview.tsx](#file-568e139a6989)
- [meu_frontend/src/features/backtests/components/agent-launch.tsx](#file-af786abb6830)
- [meu_frontend/src/features/backtests/components/backtest-price-chart.tsx](#file-33ffc77904e1)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)
- [meu_frontend/src/features/backtests/components/paper-portfolio.tsx](#file-fc0f457d3c6a)
- [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2)
- [meu_frontend/src/features/credentials/components/EditCred.tsx](#file-ad04fd87d941)
- [meu_frontend/src/features/credentials/components/createCred.tsx](#file-a61b47d55b05)
- [meu_frontend/src/features/exchange/components/EditExchange.tsx](#file-c8683f166fff)
- [meu_frontend/src/features/exchange/components/createEx.tsx](#file-752d2ba61e29)

External or unresolved imports: `@radix-ui/react-select`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Select` | [9](../../meu_frontend/src/components/ui/select.tsx#L9) | — |
| `SelectGroup` | [15](../../meu_frontend/src/components/ui/select.tsx#L15) | — |
| `SelectValue` | [21](../../meu_frontend/src/components/ui/select.tsx#L21) | — |
| `SelectTrigger` | [27](../../meu_frontend/src/components/ui/select.tsx#L27) | `cn` |
| `SelectContent` | [53](../../meu_frontend/src/components/ui/select.tsx#L53) | `cn` |
| `SelectLabel` | [90](../../meu_frontend/src/components/ui/select.tsx#L90) | `cn` |
| `SelectItem` | [103](../../meu_frontend/src/components/ui/select.tsx#L103) | `cn` |
| `SelectSeparator` | [130](../../meu_frontend/src/components/ui/select.tsx#L130) | `cn` |
| `SelectScrollUpButton` | [143](../../meu_frontend/src/components/ui/select.tsx#L143) | `cn` |
| `SelectScrollDownButton` | [161](../../meu_frontend/src/components/ui/select.tsx#L161) | `cn` |

<a id="file-53a723ab88ef"></a>

## meu_frontend/src/components/ui/separator.tsx

[meu_frontend/src/components/ui/separator.tsx](../../meu_frontend/src/components/ui/separator.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/settings/page.tsx](#file-c6b71346cae2)
- [meu_frontend/src/components/ui/button-group.tsx](#file-f6c6961b6694)
- [meu_frontend/src/components/ui/field.tsx](#file-f4505bee987d)
- [meu_frontend/src/components/ui/item.tsx](#file-aa2bd4eb0462)
- [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76)
- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)
- [meu_frontend/src/features/notifications/components/NotificationView.tsx](#file-69429fa545c9)

External or unresolved imports: `@radix-ui/react-separator`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Separator` | [8](../../meu_frontend/src/components/ui/separator.tsx#L8) | `cn` |

<a id="file-91354f28c1fd"></a>

## meu_frontend/src/components/ui/sheet.tsx

[meu_frontend/src/components/ui/sheet.tsx](../../meu_frontend/src/components/ui/sheet.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76)

External or unresolved imports: `@radix-ui/react-dialog`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Sheet` | [9](../../meu_frontend/src/components/ui/sheet.tsx#L9) | — |
| `SheetTrigger` | [13](../../meu_frontend/src/components/ui/sheet.tsx#L13) | — |
| `SheetClose` | [19](../../meu_frontend/src/components/ui/sheet.tsx#L19) | — |
| `SheetPortal` | [25](../../meu_frontend/src/components/ui/sheet.tsx#L25) | — |
| `SheetOverlay` | [31](../../meu_frontend/src/components/ui/sheet.tsx#L31) | `cn` |
| `SheetContent` | [47](../../meu_frontend/src/components/ui/sheet.tsx#L47) | `cn` |
| `SheetHeader` | [84](../../meu_frontend/src/components/ui/sheet.tsx#L84) | `cn` |
| `SheetFooter` | [94](../../meu_frontend/src/components/ui/sheet.tsx#L94) | `cn` |
| `SheetTitle` | [104](../../meu_frontend/src/components/ui/sheet.tsx#L104) | `cn` |
| `SheetDescription` | [117](../../meu_frontend/src/components/ui/sheet.tsx#L117) | `cn` |

<a id="file-4ae565dd6d76"></a>

## meu_frontend/src/components/ui/sidebar.tsx

[meu_frontend/src/components/ui/sidebar.tsx](../../meu_frontend/src/components/ui/sidebar.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/separator` | [meu_frontend/src/components/ui/separator.tsx](#file-53a723ab88ef) |
| `@/components/ui/sheet` | [meu_frontend/src/components/ui/sheet.tsx](#file-91354f28c1fd) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/components/ui/tooltip` | [meu_frontend/src/components/ui/tooltip.tsx](#file-696410254fcf) |
| `@/hooks/use-mobile` | [meu_frontend/src/hooks/use-mobile.ts](#file-2ac5bd1a5826) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/layout.tsx](#file-dcdce6cb6d1f)
- [meu_frontend/src/components/appHeader.tsx](#file-0f4a984bf6aa)
- [meu_frontend/src/components/appSidebar.tsx](#file-60b41959bf0a)

External or unresolved imports: `@radix-ui/react-slot`, `class-variance-authority`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `useSidebar` | [47](../../meu_frontend/src/components/ui/sidebar.tsx#L47) | `React.useContext` |
| `SidebarProvider` | [56](../../meu_frontend/src/components/ui/sidebar.tsx#L56) | `React.useCallback`, `React.useEffect`, `React.useMemo`, `React.useState`, `cn`, `useIsMobile` |
| `handleKeyDown` | [98](../../meu_frontend/src/components/ui/sidebar.tsx#L98) | `event.preventDefault`, `toggleSidebar` |
| `Sidebar` | [154](../../meu_frontend/src/components/ui/sidebar.tsx#L154) | `cn`, `useSidebar` |
| `SidebarTrigger` | [256](../../meu_frontend/src/components/ui/sidebar.tsx#L256) | `cn`, `useSidebar` |
| `SidebarRail` | [282](../../meu_frontend/src/components/ui/sidebar.tsx#L282) | `cn`, `useSidebar` |
| `SidebarInset` | [307](../../meu_frontend/src/components/ui/sidebar.tsx#L307) | `cn` |
| `SidebarInput` | [321](../../meu_frontend/src/components/ui/sidebar.tsx#L321) | `cn` |
| `SidebarHeader` | [335](../../meu_frontend/src/components/ui/sidebar.tsx#L335) | `cn` |
| `SidebarFooter` | [346](../../meu_frontend/src/components/ui/sidebar.tsx#L346) | `cn` |
| `SidebarSeparator` | [357](../../meu_frontend/src/components/ui/sidebar.tsx#L357) | `cn` |
| `SidebarContent` | [371](../../meu_frontend/src/components/ui/sidebar.tsx#L371) | `cn` |
| `SidebarGroup` | [385](../../meu_frontend/src/components/ui/sidebar.tsx#L385) | `cn` |
| `SidebarGroupLabel` | [396](../../meu_frontend/src/components/ui/sidebar.tsx#L396) | `cn` |
| `SidebarGroupAction` | [417](../../meu_frontend/src/components/ui/sidebar.tsx#L417) | `cn` |
| `SidebarGroupContent` | [440](../../meu_frontend/src/components/ui/sidebar.tsx#L440) | `cn` |
| `SidebarMenu` | [454](../../meu_frontend/src/components/ui/sidebar.tsx#L454) | `cn` |
| `SidebarMenuItem` | [465](../../meu_frontend/src/components/ui/sidebar.tsx#L465) | `cn` |
| `SidebarMenuButton` | [498](../../meu_frontend/src/components/ui/sidebar.tsx#L498) | `cn`, `sidebarMenuButtonVariants`, `useSidebar` |
| `SidebarMenuAction` | [548](../../meu_frontend/src/components/ui/sidebar.tsx#L548) | `cn` |
| `SidebarMenuBadge` | [580](../../meu_frontend/src/components/ui/sidebar.tsx#L580) | `cn` |
| `SidebarMenuSkeleton` | [602](../../meu_frontend/src/components/ui/sidebar.tsx#L602) | `cn` |
| `SidebarMenuSub` | [642](../../meu_frontend/src/components/ui/sidebar.tsx#L642) | `cn` |
| `SidebarMenuSubItem` | [657](../../meu_frontend/src/components/ui/sidebar.tsx#L657) | `cn` |
| `SidebarMenuSubButton` | [671](../../meu_frontend/src/components/ui/sidebar.tsx#L671) | `cn` |

<a id="file-8fad368dc2d5"></a>

## meu_frontend/src/components/ui/skeleton.tsx

[meu_frontend/src/components/ui/skeleton.tsx](../../meu_frontend/src/components/ui/skeleton.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/loading.tsx](#file-bb5313af01a6)
- [meu_frontend/src/components/entityComponents/EntityListSkeleton.tsx](#file-341d99006f0d)
- [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76)
- [meu_frontend/src/features/backtests/components/backtest-price-chart.tsx](#file-33ffc77904e1)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)
- [meu_frontend/src/features/backtests/components/paper-portfolio.tsx](#file-fc0f457d3c6a)
- [meu_frontend/src/features/charts/components/charts-workspace.tsx](#file-8c2aa8a37e03)
- [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2)
- [meu_frontend/src/features/credentials/components/model-picker.tsx](#file-00eb873b472a)
- [meu_frontend/src/features/exchange/components/account-execution-panel.tsx](#file-561367eaad9f)
- [meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx](#file-9f41ee2d0004)
- [meu_frontend/src/features/markets/components/ticker-picker.tsx](#file-1ecde0d5ac74)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Skeleton` | [3](../../meu_frontend/src/components/ui/skeleton.tsx#L3) | `cn` |

<a id="file-0cba7d7b0991"></a>

## meu_frontend/src/components/ui/slider.tsx

[meu_frontend/src/components/ui/slider.tsx](../../meu_frontend/src/components/ui/slider.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](#file-00d290523c22)

External or unresolved imports: `@radix-ui/react-slider`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Slider` | [8](../../meu_frontend/src/components/ui/slider.tsx#L8) | `Array.from`, `React.useMemo`, `cn` |

<a id="file-426a7748ae3f"></a>

## meu_frontend/src/components/ui/sonner.tsx

[meu_frontend/src/components/ui/sonner.tsx](../../meu_frontend/src/components/ui/sonner.tsx)

External or unresolved imports: `lucide-react`, `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `useAppTheme` | [14](../../meu_frontend/src/components/ui/sonner.tsx#L14) | `document.documentElement.classList.contains` |
| `Toaster` | [19](../../meu_frontend/src/components/ui/sonner.tsx#L19) | `useAppTheme` |

<a id="file-323294c82ba3"></a>

## meu_frontend/src/components/ui/spinner.tsx

[meu_frontend/src/components/ui/spinner.tsx](../../meu_frontend/src/components/ui/spinner.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `lucide-react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Spinner` | [5](../../meu_frontend/src/components/ui/spinner.tsx#L5) | `cn` |

<a id="file-5956445d8878"></a>

## meu_frontend/src/components/ui/switch.tsx

[meu_frontend/src/components/ui/switch.tsx](../../meu_frontend/src/components/ui/switch.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/exchange/components/EditExchange.tsx](#file-c8683f166fff)
- [meu_frontend/src/features/exchange/components/createEx.tsx](#file-752d2ba61e29)

External or unresolved imports: `@radix-ui/react-switch`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Switch` | [8](../../meu_frontend/src/components/ui/switch.tsx#L8) | `cn` |

<a id="file-71ac7e7f4274"></a>

## meu_frontend/src/components/ui/table.tsx

[meu_frontend/src/components/ui/table.tsx](../../meu_frontend/src/components/ui/table.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/exchange/components/portfolio-overview.tsx](#file-71c3b269af63)

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Table` | [7](../../meu_frontend/src/components/ui/table.tsx#L7) | `cn` |
| `TableHeader` | [22](../../meu_frontend/src/components/ui/table.tsx#L22) | `cn` |
| `TableBody` | [32](../../meu_frontend/src/components/ui/table.tsx#L32) | `cn` |
| `TableFooter` | [42](../../meu_frontend/src/components/ui/table.tsx#L42) | `cn` |
| `TableRow` | [55](../../meu_frontend/src/components/ui/table.tsx#L55) | `cn` |
| `TableHead` | [68](../../meu_frontend/src/components/ui/table.tsx#L68) | `cn` |
| `TableCell` | [81](../../meu_frontend/src/components/ui/table.tsx#L81) | `cn` |
| `TableCaption` | [94](../../meu_frontend/src/components/ui/table.tsx#L94) | `cn` |

<a id="file-2a712ece64d3"></a>

## meu_frontend/src/components/ui/tabs.tsx

[meu_frontend/src/components/ui/tabs.tsx](../../meu_frontend/src/components/ui/tabs.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/charts/components/charts-workspace.tsx](#file-8c2aa8a37e03)
- [meu_frontend/src/features/exchange/components/portfolio-overview.tsx](#file-71c3b269af63)

External or unresolved imports: `@radix-ui/react-tabs`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Tabs` | [8](../../meu_frontend/src/components/ui/tabs.tsx#L8) | `cn` |
| `TabsList` | [21](../../meu_frontend/src/components/ui/tabs.tsx#L21) | `cn` |
| `TabsTrigger` | [37](../../meu_frontend/src/components/ui/tabs.tsx#L37) | `cn` |
| `TabsContent` | [53](../../meu_frontend/src/components/ui/tabs.tsx#L53) | `cn` |

<a id="file-263dd5b6b75d"></a>

## meu_frontend/src/components/ui/textarea.tsx

[meu_frontend/src/components/ui/textarea.tsx](../../meu_frontend/src/components/ui/textarea.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/ui/input-group.tsx](#file-527fa4f479a7)

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Textarea` | [5](../../meu_frontend/src/components/ui/textarea.tsx#L5) | `cn` |

<a id="file-6d0286bae86d"></a>

## meu_frontend/src/components/ui/toggle-group.tsx

[meu_frontend/src/components/ui/toggle-group.tsx](../../meu_frontend/src/components/ui/toggle-group.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/toggle` | [meu_frontend/src/components/ui/toggle.tsx](#file-d9f27669dfb9) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

External or unresolved imports: `@radix-ui/react-toggle-group`, `class-variance-authority`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ToggleGroup` | [20](../../meu_frontend/src/components/ui/toggle-group.tsx#L20) | `cn` |
| `ToggleGroupItem` | [51](../../meu_frontend/src/components/ui/toggle-group.tsx#L51) | `React.useContext`, `cn`, `toggleVariants` |

<a id="file-d9f27669dfb9"></a>

## meu_frontend/src/components/ui/toggle.tsx

[meu_frontend/src/components/ui/toggle.tsx](../../meu_frontend/src/components/ui/toggle.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/ui/toggle-group.tsx](#file-6d0286bae86d)

External or unresolved imports: `@radix-ui/react-toggle`, `class-variance-authority`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `Toggle` | [31](../../meu_frontend/src/components/ui/toggle.tsx#L31) | `cn`, `toggleVariants` |

<a id="file-696410254fcf"></a>

## meu_frontend/src/components/ui/tooltip.tsx

[meu_frontend/src/components/ui/tooltip.tsx](../../meu_frontend/src/components/ui/tooltip.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76)

External or unresolved imports: `@radix-ui/react-tooltip`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `TooltipProvider` | [8](../../meu_frontend/src/components/ui/tooltip.tsx#L8) | — |
| `Tooltip` | [21](../../meu_frontend/src/components/ui/tooltip.tsx#L21) | — |
| `TooltipTrigger` | [31](../../meu_frontend/src/components/ui/tooltip.tsx#L31) | — |
| `TooltipContent` | [37](../../meu_frontend/src/components/ui/tooltip.tsx#L37) | `cn` |

<a id="file-2d6ca63749e5"></a>

## meu_frontend/src/features/agents/components/AgentDetailView.tsx

[meu_frontend/src/features/agents/components/AgentDetailView.tsx](../../meu_frontend/src/features/agents/components/AgentDetailView.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-agent` | [meu_frontend/src/features/agents/hooks/use-agent.ts](#file-2750ed7a6002) |
| `../validation` | [meu_frontend/src/features/agents/validation.ts](#file-c2df22aab9af) |
| `./entry-preview` | [meu_frontend/src/features/agents/components/entry-preview.tsx](#file-568e139a6989) |
| `@/components/ui/badge` | [meu_frontend/src/components/ui/badge.tsx](#file-96008f791b5c) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/separator` | [meu_frontend/src/components/ui/separator.tsx](#file-53a723ab88ef) |
| `@/features/backtests/components/paper-portfolio` | [meu_frontend/src/features/backtests/components/paper-portfolio.tsx](#file-fc0f457d3c6a) |
| `@/features/credentials/hooks/use-credentials` | [meu_frontend/src/features/credentials/hooks/use-credentials.ts](#file-1382f3bd3f99) |
| `@/features/exchange/hooks/use-exchange` | [meu_frontend/src/features/exchange/hooks/use-exchange.ts](#file-40f9c8c0bd38) |

### Imported by

- [meu_frontend/src/app/(dashboard)/agents/[agentId]/page.tsx](#file-6903106b05fd)

External or unresolved imports: `date-fns`, `framer-motion`, `lucide-react`, `next/link`, `react-markdown`, `remark-gfm`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `visible` | [41](../../meu_frontend/src/features/agents/components/AgentDetailView.tsx#L41) | — |
| `AgentDetailView` | [48](../../meu_frontend/src/features/agents/components/AgentDetailView.tsx#L48) | `Number`, `String`, `agent.name.split`, `agent.strategy.replace`, `agent?.capital.allocated.toLocaleString`, `agent?.market.symbols.map`, `displaySetting`, `exchange?.name.toUpperCase`, `format`, `runs.map`, `sizingPolicySchema.safeParse`, `useCredential`, `useStatusChangeAgent`, `useSuspenseAgent`, `useSuspenseExchange`, `useSuspenseRuns` |
| `displaySetting` | [64](../../meu_frontend/src/features/agents/components/AgentDetailView.tsx#L64) | `Number.isFinite`, `String` |
| `handleStatusChange` | [67](../../meu_frontend/src/features/agents/components/AgentDetailView.tsx#L67) | `statusChange.mutate` |

<a id="file-e3f55dd74ffd"></a>

## meu_frontend/src/features/agents/components/EditAgent.tsx

[meu_frontend/src/features/agents/components/EditAgent.tsx](../../meu_frontend/src/features/agents/components/EditAgent.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/brokerCapabilities` | [shared/trading/brokerCapabilities.ts](#file-a654820bbc46) |
| `./agent-budget-fields` | [meu_frontend/src/features/agents/components/agent-budget-fields.tsx](#file-4c202d5fe0ed) |
| `./agent-form-feedback` | [meu_frontend/src/features/agents/components/agent-form-feedback.tsx](#file-91c03a95890b) |
| `./agent-intelligence-fields` | [meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](#file-00d290523c22) |
| `./createAgent` | [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/features/agents/hooks/use-agent` | [meu_frontend/src/features/agents/hooks/use-agent.ts](#file-2750ed7a6002) |
| `@/features/agents/validation` | [meu_frontend/src/features/agents/validation.ts](#file-c2df22aab9af) |
| `@/features/exchange/hooks/use-exchange` | [meu_frontend/src/features/exchange/hooks/use-exchange.ts](#file-40f9c8c0bd38) |
| `@/features/markets/components/ticker-picker` | [meu_frontend/src/features/markets/components/ticker-picker.tsx](#file-1ecde0d5ac74) |
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |

### Imported by

- [meu_frontend/src/app/(dashboard)/agents/[agentId]/edit/page.tsx](#file-313c27dc4df3)

External or unresolved imports: `@hookform/resolvers/zod`, `lucide-react`, `next/link`, `react`, `react-hook-form`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EditAgentPage` | [58](../../meu_frontend/src/features/agents/components/EditAgent.tsx#L58) | `agent.updatedAt.toISOString`, `useSuspenseAgent` |
| `LegacyEditAgentPage` | [65](../../meu_frontend/src/features/agents/components/EditAgent.tsx#L65) | `agent?.market?.symbols.map`, `analysisTimeframeSchema.safeParse`, `exchanges?.filter`, `exchanges?.find`, `fields.map`, `form.handleSubmit`, `formatSecondsToCycle`, `sizingPolicySchema.safeParse`, `useEffect`, `useFieldArray`, `useForm`, `useSuspenseAgent`, `useSuspenseExchanges`, `useUpdateAgent`, `useWatch`, `zodResolver` |
| `formatSecondsToCycle` | [116](../../meu_frontend/src/features/agents/components/EditAgent.tsx#L116) | — |
| `parseCycleToSeconds` | [137](../../meu_frontend/src/features/agents/components/EditAgent.tsx#L137) | `Number`, `input.trim` |
| `onSubmit` | [161](../../meu_frontend/src/features/agents/components/EditAgent.tsx#L161) | `form.setError`, `parseCycleToSeconds`, `updateAgent.mutate`, `values.market.symbols.map` |

<a id="file-4c202d5fe0ed"></a>

## meu_frontend/src/features/agents/components/agent-budget-fields.tsx

[meu_frontend/src/features/agents/components/agent-budget-fields.tsx](../../meu_frontend/src/features/agents/components/agent-budget-fields.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/brokerCapabilities` | [shared/trading/brokerCapabilities.ts](#file-a654820bbc46) |
| `../validation` | [meu_frontend/src/features/agents/validation.ts](#file-c2df22aab9af) |
| `./agent-sizing-fields` | [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |

### Imported by

- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)

External or unresolved imports: `react`, `react-hook-form`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `AgentBudgetFields` | [13](../../meu_frontend/src/features/agents/components/agent-budget-fields.tsx#L13) | `brokerCapabilities`, `useFormContext`, `useWatch` |
| `AgentConfigurationReview` | [43](../../meu_frontend/src/features/agents/components/agent-budget-fields.tsx#L43) | `Boolean`, `Number.isFinite`, `Number.isInteger`, `amount`, `market.symbols.map`, `useFormContext`, `useWatch` |
| `amount` | [52](../../meu_frontend/src/features/agents/components/agent-budget-fields.tsx#L52) | — |

<a id="file-91c03a95890b"></a>

## meu_frontend/src/features/agents/components/agent-form-feedback.tsx

[meu_frontend/src/features/agents/components/agent-form-feedback.tsx](../../meu_frontend/src/features/agents/components/agent-form-feedback.tsx)

### Imported by

- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)

External or unresolved imports: `react`, `react-hook-form`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `errorMessages` | [6](../../meu_frontend/src/features/agents/components/agent-form-feedback.tsx#L6) | `Object.entries` |
| `AgentFormFeedback` | [13](../../meu_frontend/src/features/agents/components/agent-form-feedback.tsx#L13) | `errorMessages`, `messages.join`, `messages.map`, `useEffect`, `useFormContext`, `useRef` |

<a id="file-00d290523c22"></a>

## meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx

[meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](../../meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/components/ui/slider` | [meu_frontend/src/components/ui/slider.tsx](#file-0cba7d7b0991) |
| `@/features/agents/validation` | [meu_frontend/src/features/agents/validation.ts](#file-c2df22aab9af) |
| `@/features/credentials/components/model-picker` | [meu_frontend/src/features/credentials/components/model-picker.tsx](#file-00eb873b472a) |
| `@/features/credentials/hooks/use-credentials` | [meu_frontend/src/features/credentials/hooks/use-credentials.ts](#file-1382f3bd3f99) |
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |

### Imported by

- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)

External or unresolved imports: `next/link`, `react`, `react-hook-form`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `AgentIntelligenceFields` | [17](../../meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx#L17) | `Object.values`, `credentials?.filter`, `credentials?.find`, `useAllCredentials`, `useFormContext`, `useState`, `useWatch` |

<a id="file-f282a54dea98"></a>

## meu_frontend/src/features/agents/components/agent-sizing-fields.tsx

[meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](../../meu_frontend/src/features/agents/components/agent-sizing-fields.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/brokerCapabilities` | [shared/trading/brokerCapabilities.ts](#file-a654820bbc46) |
| `../../../../../shared/trading/sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `../validation` | [meu_frontend/src/features/agents/validation.ts](#file-c2df22aab9af) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/agents/components/agent-budget-fields.tsx](#file-4c202d5fe0ed)

External or unresolved imports: `@tanstack/react-query`, `next/link`, `react-hook-form`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `AgentSizingFields` | [16](../../meu_frontend/src/features/agents/components/agent-sizing-fields.tsx#L16) | `Boolean`, `brokerCapabilities`, `trpc.exchange.executionState.queryOptions`, `useFormContext`, `useQuery`, `useTRPC`, `useWatch` |

<a id="file-3984b831a40c"></a>

## meu_frontend/src/features/agents/components/agent.tsx

[meu_frontend/src/features/agents/components/agent.tsx](../../meu_frontend/src/features/agents/components/agent.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-agent` | [meu_frontend/src/features/agents/hooks/use-agent.ts](#file-2750ed7a6002) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/agents/page.tsx](#file-968870bfc4bb)

External or unresolved imports: `date-fns`, `lucide-react`, `next/link`, `next/navigation`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `StatusPill` | [18](../../meu_frontend/src/features/agents/components/agent.tsx#L18) | `cn` |
| `AgentsPage` | [40](../../meu_frontend/src/features/agents/components/agent.tsx#L40) | `agents.map`, `useAgents`, `useCallback`, `useDeleteAgent`, `useRouter`, `useState` |

<a id="file-849ce7f84952"></a>

## meu_frontend/src/features/agents/components/createAgent.tsx

[meu_frontend/src/features/agents/components/createAgent.tsx](../../meu_frontend/src/features/agents/components/createAgent.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/brokerCapabilities` | [shared/trading/brokerCapabilities.ts](#file-a654820bbc46) |
| `../../../../../shared/trading/executionCosts` | [shared/trading/executionCosts.ts](#file-a7506f843f73) |
| `./agent-budget-fields` | [meu_frontend/src/features/agents/components/agent-budget-fields.tsx](#file-4c202d5fe0ed) |
| `./agent-form-feedback` | [meu_frontend/src/features/agents/components/agent-form-feedback.tsx](#file-91c03a95890b) |
| `./agent-intelligence-fields` | [meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](#file-00d290523c22) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/features/agents/hooks/use-agent` | [meu_frontend/src/features/agents/hooks/use-agent.ts](#file-2750ed7a6002) |
| `@/features/agents/validation` | [meu_frontend/src/features/agents/validation.ts](#file-c2df22aab9af) |
| `@/features/backtests/validation` | [meu_frontend/src/features/backtests/validation.ts](#file-530f00338d26) |
| `@/features/exchange/hooks/use-exchange` | [meu_frontend/src/features/exchange/hooks/use-exchange.ts](#file-40f9c8c0bd38) |
| `@/features/markets/components/ticker-picker` | [meu_frontend/src/features/markets/components/ticker-picker.tsx](#file-1ecde0d5ac74) |
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/app/(dashboard)/agents/create/page.tsx](#file-5b7fe1f94a73)
- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)

External or unresolved imports: `@hookform/resolvers/zod`, `@tanstack/react-query`, `lucide-react`, `next/link`, `next/navigation`, `react`, `react-hook-form`, `sonner`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `parseCycleToSeconds` | [76](../../meu_frontend/src/features/agents/components/createAgent.tsx#L76) | `Number` |
| `CreateAgentPage` | [103](../../meu_frontend/src/features/agents/components/createAgent.tsx#L103) | `Boolean`, `CYCLE_OPTIONS.find`, `cryptoStrategySettingsSchema.safeParse`, `exchanges?.filter`, `exchanges?.find`, `fields.map`, `form.handleSubmit`, `savedAgent.market.symbols.map`, `trpc.agents.updateCryptoAlgorithm.mutationOptions`, `trpc.backtests.createConfiguredAgent.mutationOptions`, `trpc.backtests.run.mutationOptions`, `useCreateAgent`, `useFieldArray`, `useForm`, `useMutation`, `useQueryClient`, `useRouter`, `useState`, `useSuspenseExchanges`, `useTRPC`, `useWatch`, `zodResolver` |
| `onSuccess` | [118](../../meu_frontend/src/features/agents/components/createAgent.tsx#L118) | `queryClient.invalidateQueries`, `router.push`, `toast.success`, `trpc.agents.getAll.queryKey` |
| `onError` | [119](../../meu_frontend/src/features/agents/components/createAgent.tsx#L119) | `toast.error` |
| `onSuccess` | [122](../../meu_frontend/src/features/agents/components/createAgent.tsx#L122) | `queryClient.invalidateQueries`, `router.push`, `toast.success`, `trpc.agents.getAll.queryKey`, `trpc.agents.getOne.queryKey`, `trpc.backtests.paperSessions.queryKey`, `trpc.backtests.paperState.queryKey` |
| `onError` | [130](../../meu_frontend/src/features/agents/components/createAgent.tsx#L130) | `toast.error` |
| `onSuccess` | [133](../../meu_frontend/src/features/agents/components/createAgent.tsx#L133) | `router.push` |
| `onError` | [134](../../meu_frontend/src/features/agents/components/createAgent.tsx#L134) | `toast.error` |
| `enterCryptoAlgorithm` | [193](../../meu_frontend/src/features/agents/components/createAgent.tsx#L193) | `Math.max`, `Math.min`, `form.clearErrors`, `form.getValues`, `form.setValue`, `setCryptoMode` |
| `cryptoPayload` | [209](../../meu_frontend/src/features/agents/components/createAgent.tsx#L209) | `parseCycleToSeconds` |
| `validateCryptoPayload` | [217](../../meu_frontend/src/features/agents/components/createAgent.tsx#L217) | `Object.values`, `String`, `configuredCryptoAgentSchema.safeParse`, `cryptoPayload`, `issue.path.at`, `setConfigurationError`, `setConfigurationErrors` |
| `backtestCurrent` | [232](../../meu_frontend/src/features/agents/components/createAgent.tsx#L232) | `Date.now`, `Math.floor`, `backtest.mutate`, `validateCryptoPayload` |
| `onSubmit` | [238](../../meu_frontend/src/features/agents/components/createAgent.tsx#L238) | `createAgent.mutate`, `createCrypto.mutate`, `editCrypto.mutate`, `form.setError`, `parseCycleToSeconds`, `savedAgent.updatedAt.toISOString`, `setConfigurationError`, `validateCryptoPayload`, `values.market.symbols.map` |

<a id="file-568e139a6989"></a>

## meu_frontend/src/features/agents/components/entry-preview.tsx

[meu_frontend/src/features/agents/components/entry-preview.tsx](../../meu_frontend/src/features/agents/components/entry-preview.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/label` | [meu_frontend/src/components/ui/label.tsx](#file-729f4f420ef1) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)

External or unresolved imports: `@tanstack/react-query`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EntryPreview` | [13](../../meu_frontend/src/features/agents/components/entry-preview.tsx#L13) | `Number`, `Object.entries`, `agent.market.symbols.map`, `number`, `result.notes.map`, `trpc.agents.entryPreview.queryOptions`, `useQuery`, `useState`, `useTRPC` |
| `number` | [26](../../meu_frontend/src/features/agents/components/entry-preview.tsx#L26) | `value.toLocaleString` |

<a id="file-2750ed7a6002"></a>

## meu_frontend/src/features/agents/hooks/use-agent.ts

[meu_frontend/src/features/agents/hooks/use-agent.ts](../../meu_frontend/src/features/agents/hooks/use-agent.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)
- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/agent.tsx](#file-3984b831a40c)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)

External or unresolved imports: `@tanstack/react-query`, `next/navigation`, `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `useAgents` | [6](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L6) | `trpc.agents.getAll.queryOptions`, `useQuery`, `useTRPC` |
| `useSuspenseAgent` | [18](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L18) | `trpc.agents.getOne.queryOptions`, `useSuspenseQuery`, `useTRPC` |
| `refetchInterval` | [22](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L22) | — |
| `useCreateAgent` | [27](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L27) | `trpc.agents.create.mutationOptions`, `useMutation`, `useQueryClient`, `useTRPC` |
| `onSuccess` | [32](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L32) | `queryClient.invalidateQueries`, `toast.success`, `trpc.agents.getAll.queryOptions` |
| `onError` | [36](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L36) | `toast.error` |
| `useUpdateAgent` | [41](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L41) | `trpc.agents.update.mutationOptions`, `useMutation`, `useQueryClient`, `useRouter`, `useTRPC` |
| `onSuccess` | [47](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L47) | `queryClient.invalidateQueries`, `router.push`, `toast.success`, `trpc.agents.getAll.queryKey`, `trpc.agents.getOne.queryOptions` |
| `onError` | [53](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L53) | `toast.error` |
| `useDeleteAgent` | [59](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L59) | `trpc.agents.delete.mutationOptions`, `useMutation`, `useQueryClient`, `useTRPC` |
| `onSuccess` | [64](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L64) | `queryClient.invalidateQueries`, `toast.success`, `trpc.agents.getAll.queryOptions`, `trpc.agents.getOne.queryOptions` |
| `onError` | [69](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L69) | `toast.error` |
| `useStatusChangeAgent` | [75](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L75) | `trpc.agents.statusChange.mutationOptions`, `useMutation`, `useQueryClient`, `useTRPC` |
| `onSuccess` | [80](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L80) | `queryClient.invalidateQueries`, `toast.success`, `trpc.agents.getAll.queryOptions`, `trpc.agents.getOne.queryOptions` |
| `onError` | [85](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L85) | `toast.error` |
| `useSuspenseRuns` | [91](../../meu_frontend/src/features/agents/hooks/use-agent.ts#L91) | `trpc.agents.runs.queryOptions`, `useSuspenseQuery`, `useTRPC` |

<a id="file-5129a594abff"></a>

## meu_frontend/src/features/agents/server/edit-crypto-agent.ts

[meu_frontend/src/features/agents/server/edit-crypto-agent.ts](../../meu_frontend/src/features/agents/server/edit-crypto-agent.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../meu/schedulerService/src/brokers/crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |
| `@/features/backtests/server/delta-data` | [meu_frontend/src/features/backtests/server/delta-data.ts](#file-e9ab06d56b34) |
| `@/features/backtests/validation` | [meu_frontend/src/features/backtests/validation.ts](#file-530f00338d26) |
| `@/features/exchange/server/execution-account` | [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a) |
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |

### Imported by

- [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa)

External or unresolved imports: `@trpc/server`, `node:crypto`, `server-only`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `editCryptoAgent` | [18](../../meu_frontend/src/features/agents/server/edit-crypto-agent.ts#L18) | `Array.isArray`, `Date.now`, `JSON.stringify`, `Math.floor`, `Math.max`, `Promise.all`, `agent.updatedAt.toISOString`, `attemptedLocks.map`, `claim`, `configuredCryptoAgentSchema.safeParse`, `cryptoEntryMarket`, `exchange.fetchPositions`, `exchange.loadMarkets`, `executionConnection`, `fetchCryptoOpenOrders`, `loadDeltaBacktestData`, `normalizeCryptoPositions`, `orders.some`, `prisma.$runCommandRaw`, `prisma.agent.findFirst`, `prisma.agent.update`, `randomUUID`, `registerExecutionAccount`, `requireNoRecords` |
| `claim` | [39](../../meu_frontend/src/features/agents/server/edit-crypto-agent.ts#L39) | `Array.isArray`, `acquiredLocks.push`, `attemptedLocks.push`, `prisma.$runCommandRaw` |
| `requireNoRecords` | [46](../../meu_frontend/src/features/agents/server/edit-crypto-agent.ts#L46) | `Array.isArray`, `String`, `prisma.$runCommandRaw` |

<a id="file-03bf55708ad3"></a>

## meu_frontend/src/features/agents/server/entry-preview.ts

[meu_frontend/src/features/agents/server/entry-preview.ts](../../meu_frontend/src/features/agents/server/entry-preview.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../meu/schedulerService/src/brokers/crypto/cryptoAccount` | [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886) |
| `../../../../../meu/schedulerService/src/brokers/crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |
| `../../../../../meu/schedulerService/src/execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `../../../../../shared/trading/sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `@/features/backtests/validation` | [meu_frontend/src/features/backtests/validation.ts](#file-530f00338d26) |
| `@/features/exchange/server/execution-account` | [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a) |
| `@/features/exchange/server/reconciliation` | [meu_frontend/src/features/exchange/server/reconciliation.ts](#file-d0180098de88) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |

### Imported by

- [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa)

External or unresolved imports: `../../../../../meu/schedulerService/node_modules/ccxt`, `@trpc/server`, `server-only`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `canonical` | [27](../../meu_frontend/src/features/agents/server/entry-preview.ts#L27) | `symbol.split` |
| `refuse` | [28](../../meu_frontend/src/features/agents/server/entry-preview.ts#L28) | — |
| `boundPreviewReads` | [31](../../meu_frontend/src/features/agents/server/entry-preview.ts#L31) | `Date.now`, `exchange.request.bind` |
| `entryPreview` | [43](../../meu_frontend/src/features/agents/server/entry-preview.ts#L43) | `Date.now`, `Math.abs`, `Number`, `Number.isFinite`, `Number.isSafeInteger`, `Promise.all`, `String`, `accountRiskSchema.safeParse`, `active.add`, `active.delete`, `active.has`, `agent.market.symbols.includes`, `boundPreviewReads`, `connectionIds.includes`, `connectionIds.map`, `cryptoDayStart`, `cryptoEntryMarket`, `cryptoEntrySnapshot`, `cryptoStrategySettingsSchema.safeParse`, `entryPreviewSchema.parse`, `exchange.fetchTicker`, `exchange.loadMarkets`, `exchange.priceToPrecision`, `executionConnection`, `identifyDeltaAccount`, `linkedExchangeIds`, `notes.push`, `previewAutomaticCryptoLeverage`, `prisma.agent.findFirst`, `prisma.agent.findMany`, `readRows`, `refuse`, `siblings.some`, `sizeCryptoEntry`, `snapshot!.orders.some`, `snapshot!.positions.some`, `validateSizingPolicy`, `z.number`, `z.object` |
| `get` | [137](../../meu_frontend/src/features/agents/server/entry-preview.ts#L137) | `Reflect.get` |

<a id="file-681653d00ae2"></a>

## meu_frontend/src/features/agents/server/recover-delta-agent.ts

[meu_frontend/src/features/agents/server/recover-delta-agent.ts](../../meu_frontend/src/features/agents/server/recover-delta-agent.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig` | [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f) |
| `../../../../../meu/schedulerService/src/brokers/delta/deltaReconciliation` | [meu/schedulerService/src/brokers/delta/deltaReconciliation.ts](#file-c1cc1175ff3a) |
| `../../../../../shared/trading/strategies` | [shared/trading/strategies.ts](#file-08c346741655) |
| `@/features/backtests/server/delta-data` | [meu_frontend/src/features/backtests/server/delta-data.ts](#file-e9ab06d56b34) |
| `@/features/exchange/server/execution-account` | [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a) |
| `@/features/exchange/server/reconciliation` | [meu_frontend/src/features/exchange/server/reconciliation.ts](#file-d0180098de88) |
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |
| `@/lib/app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |

### Imported by

- [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)

External or unresolved imports: `@trpc/server`, `node:crypto`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `fail` | [18](../../meu_frontend/src/features/agents/server/recover-delta-agent.ts#L18) | — |
| `written` | [19](../../meu_frontend/src/features/agents/server/recover-delta-agent.ts#L19) | `Array.isArray` |
| `recoverDeltaAgent` | [25](../../meu_frontend/src/features/agents/server/recover-delta-agent.ts#L25) | `Date.now`, `Math.floor`, `Math.max`, `Number.isSafeInteger`, `agent.strategyStartedAt.getTime`, `appLog`, `assertUnchanged`, `connectionIds.map`, `data.candles.at`, `exchange.loadMarkets`, `executionConnection`, `fail`, `inspectDeltaOwnership`, `linkedExchangeIds`, `loadDeltaBacktestData`, `peers.map`, `prisma.$runCommandRaw`, `prisma.agent.findMany`, `prisma.notification.findFirst`, `randomUUID`, `readRows`, `registerExecutionAccount`, `strategyStateKey`, `validateCryptoStrategy`, `written` |
| `assertUnchanged` | [70](../../meu_frontend/src/features/agents/server/recover-delta-agent.ts#L70) | `fail`, `locks.some`, `peers.map`, `prisma.agent.findFirst`, `prisma.agent.findMany`, `readRows`, `running.map` |
| `recoverPaperDataAgent` | [129](../../meu_frontend/src/features/agents/server/recover-delta-agent.ts#L129) | `appLog`, `fail`, `prisma.$runCommandRaw`, `prisma.agent.findFirst`, `prisma.notification.findFirst`, `randomUUID`, `readRows`, `transientCodes.includes`, `written` |

<a id="file-82b4c31078aa"></a>

## meu_frontend/src/features/agents/server/router.ts

[meu_frontend/src/features/agents/server/router.ts](../../meu_frontend/src/features/agents/server/router.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../validation` | [meu_frontend/src/features/agents/validation.ts](#file-c2df22aab9af) |
| `./edit-crypto-agent` | [meu_frontend/src/features/agents/server/edit-crypto-agent.ts](#file-5129a594abff) |
| `./entry-preview` | [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3) |
| `./recover-delta-agent` | [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2) |
| `./start-delta-agent` | [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4) |
| `@/features/markets/server/catalog` | [meu_frontend/src/features/markets/server/catalog.ts](#file-caa7eb406200) |
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/trpc/init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |

### Imported by

- [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195)

External or unresolved imports: `@trpc/server`, `node:crypto`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `assertOwnedReferences` | [13](../../meu_frontend/src/features/agents/server/router.ts#L13) | `exchangeRecord?.name?.toUpperCase`, `prisma.exchange.findFirst`, `requireOwnedReferences` |
| `canonical` | [171](../../meu_frontend/src/features/agents/server/router.ts#L171) | `symbol.split` |

<a id="file-e4e52a8102c4"></a>

## meu_frontend/src/features/agents/server/start-delta-agent.ts

[meu_frontend/src/features/agents/server/start-delta-agent.ts](../../meu_frontend/src/features/agents/server/start-delta-agent.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../meu/schedulerService/src/brokers/binance/binanceExecution` | [meu/schedulerService/src/brokers/binance/binanceExecution.ts](#file-1fc4930582ed) |
| `../../../../../meu/schedulerService/src/brokers/crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |
| `../../../../../meu/schedulerService/src/brokers/delta/deltaStart` | [meu/schedulerService/src/brokers/delta/deltaStart.ts](#file-6557ced7c80f) |
| `../../../../../meu/schedulerService/src/config/config` | [meu/schedulerService/src/config/config.ts](#file-9ba5db203d2d) |
| `../../../../../meu/schedulerService/src/execution/tradeGuard` | [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6) |
| `../../../../../shared/trading/sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `./recover-delta-agent` | [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2) |
| `@/features/backtests/validation` | [meu_frontend/src/features/backtests/validation.ts](#file-530f00338d26) |
| `@/features/exchange/server/execution-account` | [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a) |
| `@/features/exchange/server/reconciliation` | [meu_frontend/src/features/exchange/server/reconciliation.ts](#file-d0180098de88) |
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |
| `@/lib/app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/lib/encryption` | [meu_frontend/src/lib/encryption.ts](#file-fadfe6773757) |

### Imported by

- [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa)

External or unresolved imports: `@trpc/server`, `node:crypto`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `startDeltaAgent` | [19](../../meu_frontend/src/features/agents/server/start-delta-agent.ts#L19) | `Array.isArray`, `Date.now`, `Number`, `Number.isSafeInteger`, `appLog`, `assertPaused`, `claimExchange`, `configureCryptoExchange`, `connection.name.toUpperCase`, `cryptoEntryMarket`, `cryptoStrategySettingsSchema.safeParse`, `decryptSecret`, `exchange.loadMarkets`, `fetchCryptoLeverage`, `holding.executionId.startsWith`, `linkedExchangeIds`, `ownedLocks.map`, `ownedLocks.push`, `prepareBinanceAccount`, `prepareDeltaStrategyAccount`, `prisma.$runCommandRaw`, `prisma.agent.update`, `prisma.agent.updateMany`, `prisma.exchange.findFirst`, `randomUUID`, `readRows`, `recoverDeltaAgent`, `registerExecutionAccount`, `validateSizingPolicy` |
| `claimExchange` | [39](../../meu_frontend/src/features/agents/server/start-delta-agent.ts#L39) | `Array.isArray`, `prisma.$runCommandRaw` |
| `assertPaused` | [63](../../meu_frontend/src/features/agents/server/start-delta-agent.ts#L63) | `others.some`, `prisma.agent.findFirst`, `prisma.agent.findMany` |
| `canonical` | [67](../../meu_frontend/src/features/agents/server/start-delta-agent.ts#L67) | `symbol.split` |
| `beforeWrite` | [101](../../meu_frontend/src/features/agents/server/start-delta-agent.ts#L101) | `assertPaused` |

<a id="file-c2df22aab9af"></a>

## meu_frontend/src/features/agents/validation.ts

[meu_frontend/src/features/agents/validation.ts](../../meu_frontend/src/features/agents/validation.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |

### Imported by

- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)
- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/agent-budget-fields.tsx](#file-4c202d5fe0ed)
- [meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](#file-00d290523c22)
- [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa)

External or unresolved imports: `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `addStrategyIssues` | [29](../../meu_frontend/src/features/agents/validation.ts#L29) | `config.credentialId.trim`, `config.llmModel.trim`, `ctx.addIssue` |
| `requireOwnedReferences` | [111](../../meu_frontend/src/features/agents/validation.ts#L111) | `lookup` |

<a id="file-dac1b352656a"></a>

## meu_frontend/src/features/backtests/chart/analysis.ts

[meu_frontend/src/features/backtests/chart/analysis.ts](../../meu_frontend/src/features/backtests/chart/analysis.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/emaCrossover` | [shared/trading/emaCrossover.ts](#file-1d7dd8e6da1e) |
| `../../../../../shared/trading/perpetualBacktest` | [shared/trading/perpetualBacktest.ts](#file-14821081d1df) |
| `../../../../../shared/trading/strategies` | [shared/trading/strategies.ts](#file-08c346741655) |
| `../../charts/indicators` | [meu_frontend/src/features/charts/indicators.ts](#file-1ea0270f41af) |

### Imported by

- [meu_frontend/src/features/backtests/components/backtest-price-chart.tsx](#file-33ffc77904e1)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `entryExplanation` | [13](../../meu_frontend/src/features/backtests/chart/analysis.ts#L13) | — |
| `analyzeBacktest` | [20](../../meu_frontend/src/features/backtests/chart/analysis.ts#L20) | `Math.max`, `Math.min`, `candles.map`, `candles.slice`, `chartBollinger`, `chartEma`, `lower.push`, `prepareStrategy`, `prior.map`, `upper.push` |
| `tradeProtection` | [42](../../meu_frontend/src/features/backtests/chart/analysis.ts#L42) | `candles.findIndex` |
| `tradeProtectionPaths` | [50](../../meu_frontend/src/features/backtests/chart/analysis.ts#L50) | `stop.at`, `stop.push`, `targets.push`, `trade.protectionTimeline?.filter` |
| `backtestMarkers` | [75](../../meu_frontend/src/features/backtests/chart/analysis.ts#L75) | `trades.flatMap` |

<a id="file-af786abb6830"></a>

## meu_frontend/src/features/backtests/components/agent-launch.tsx

[meu_frontend/src/features/backtests/components/agent-launch.tsx](../../meu_frontend/src/features/backtests/components/agent-launch.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./paper-portfolio` | [meu_frontend/src/features/backtests/components/paper-portfolio.tsx](#file-fc0f457d3c6a) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)

External or unresolved imports: `@tanstack/react-query`, `next/link`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `AgentLaunch` | [11](../../meu_frontend/src/features/backtests/components/agent-launch.tsx#L11) | `deltas.map`, `exchanges.data?.filter`, `initialCapital.toLocaleString`, `mode.toLowerCase`, `trpc.backtests.createAgent.mutationOptions`, `trpc.exchange.getAll.queryOptions`, `useMutation`, `useQuery`, `useQueryClient`, `useState`, `useTRPC` |
| `onSuccess` | [18](../../meu_frontend/src/features/backtests/components/agent-launch.tsx#L18) | `queryClient.invalidateQueries`, `setCreated`, `trpc.agents.getAll.queryKey` |

<a id="file-33ffc77904e1"></a>

## meu_frontend/src/features/backtests/components/backtest-price-chart.tsx

[meu_frontend/src/features/backtests/components/backtest-price-chart.tsx](../../meu_frontend/src/features/backtests/components/backtest-price-chart.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../chart/analysis` | [meu_frontend/src/features/backtests/chart/analysis.ts](#file-dac1b352656a) |
| `@/components/ui-settings` | [meu_frontend/src/components/ui-settings.tsx](#file-10bad29dc90f) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)

External or unresolved imports: `@tanstack/react-query`, `lightweight-charts`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `price` | [13](../../meu_frontend/src/features/backtests/components/backtest-price-chart.tsx#L13) | `value.toLocaleString` |
| `date` | [14](../../meu_frontend/src/features/backtests/components/backtest-price-chart.tsx#L14) | — |
| `BacktestPriceChart` | [16](../../meu_frontend/src/features/backtests/components/backtest-price-chart.tsx#L16) | `Math.abs`, `String`, `data.candles.findIndex`, `data?.candles.findIndex`, `data?.trades.map`, `date`, `entryExplanation`, `price`, `runId.slice`, `trade?.protectionTimeline?.find`, `tradeProtection`, `trpc.backtests.chart.queryOptions`, `useEffect`, `useMemo`, `useQuery`, `useRef`, `useState`, `useTRPC`, `useUISettings` |
| `timeFormatter` | [37](../../meu_frontend/src/features/backtests/components/backtest-price-chart.tsx#L37) | `date` |
| `add` | [65](../../meu_frontend/src/features/backtests/components/backtest-price-chart.tsx#L65) | `chart.addSeries`, `line.setData`, `lines.push`, `points.map` |
| `focusTrade` | [77](../../meu_frontend/src/features/backtests/components/backtest-price-chart.tsx#L77) | `Math.max`, `Math.min`, `chartRef.current.timeScale`, `data.candles.findIndex` |

<a id="file-47c93f33e5a4"></a>

## meu_frontend/src/features/backtests/components/backtest-workspace.tsx

[meu_frontend/src/features/backtests/components/backtest-workspace.tsx](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/executionCosts` | [shared/trading/executionCosts.ts](#file-a7506f843f73) |
| `../daily-loss` | [meu_frontend/src/features/backtests/daily-loss.ts](#file-944013acde80) |
| `../validation` | [meu_frontend/src/features/backtests/validation.ts](#file-530f00338d26) |
| `./agent-launch` | [meu_frontend/src/features/backtests/components/agent-launch.tsx](#file-af786abb6830) |
| `./backtest-price-chart` | [meu_frontend/src/features/backtests/components/backtest-price-chart.tsx](#file-33ffc77904e1) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/checkbox` | [meu_frontend/src/components/ui/checkbox.tsx](#file-11a7e2a3811d) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/features/markets/components/ticker-picker` | [meu_frontend/src/features/markets/components/ticker-picker.tsx](#file-1ecde0d5ac74) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |
| `@/trpc/routers/_app` | [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195) |

### Imported by

- [meu_frontend/src/app/(dashboard)/strategies/page.tsx](#file-833f53dd6014)

External or unresolved imports: `@tanstack/react-query`, `@trpc/server`, `lucide-react`, `next/link`, `react`, `recharts`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `percent` | [24](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L24) | `n.toFixed` |
| `money` | [25](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L25) | `n.toLocaleString` |
| `utc` | [26](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L26) | — |
| `BacktestSelect` | [27](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L27) | `options.map` |
| `Numeric` | [41](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L41) | — |
| `RunResults` | [51](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L51) | `Math.ceil`, `Object.entries`, `String`, `money`, `percent`, `r.profitFactor.toFixed`, `r.trades.slice`, `run.warnings.map`, `savedSettings.map`, `useState`, `utc` |
| `BacktestWorkspace` | [72](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L72) | `Date.now`, `Number.isFinite`, `catalog.data?.find`, `comparisons.map`, `comparisons.some`, `history.data.runs.map`, `resolveDailyLossLimitPct`, `selected.map`, `trpc.backtests.catalog.queryOptions`, `trpc.backtests.delete.mutationOptions`, `trpc.backtests.get.queryOptions`, `trpc.backtests.list.queryOptions`, `trpc.backtests.run.mutationOptions`, `useMutation`, `useQueries`, `useQuery`, `useQueryClient`, `useState`, `useTRPC` |
| `onSuccess` | [81](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L81) | `queryClient.invalidateQueries`, `setActive`, `setPage`, `trpc.backtests.list.queryKey` |
| `onError` | [81](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L81) | `setError` |
| `onSuccess` | [84](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L84) | `queryClient.invalidateQueries`, `setActive`, `setPage`, `setSelected`, `trpc.backtests.list.queryKey` |
| `onError` | [85](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L85) | `setError` |
| `submit` | [87](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L87) | `Date.parse`, `String`, `backtestInputSchema.safeParse`, `e.preventDefault`, `f.get`, `n`, `resolveDailyLossLimitPct`, `run.mutate`, `setError` |
| `n` | [90](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L90) | `Number`, `f.get` |
| `download` | [100](../../meu_frontend/src/features/backtests/components/backtest-workspace.tsx#L100) | `JSON.stringify`, `URL.createObjectURL`, `URL.revokeObjectURL`, `api.backtests.export.query`, `document.createElement`, `link.click`, `setError`, `setExporting` |

<a id="file-fc0f457d3c6a"></a>

## meu_frontend/src/features/backtests/components/paper-portfolio.tsx

[meu_frontend/src/features/backtests/components/paper-portfolio.tsx](../../meu_frontend/src/features/backtests/components/paper-portfolio.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/paperTrading` | [shared/trading/paperTrading.ts](#file-39c515f77d12) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)
- [meu_frontend/src/features/backtests/components/agent-launch.tsx](#file-af786abb6830)

External or unresolved imports: `@tanstack/react-query`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `PaperPortfolio` | [9](../../meu_frontend/src/features/backtests/components/paper-portfolio.tsx#L9) | `data.trades.slice`, `money`, `sessions.data?.filter`, `sessions.data?.some`, `trpc.backtests.paperSessions.queryOptions`, `trpc.backtests.paperState.queryOptions`, `useQuery`, `useState`, `useTRPC` |
| `money` | [15](../../meu_frontend/src/features/backtests/components/paper-portfolio.tsx#L15) | `Number.isFinite`, `n.toFixed` |

<a id="file-944013acde80"></a>

## meu_frontend/src/features/backtests/daily-loss.ts

[meu_frontend/src/features/backtests/daily-loss.ts](../../meu_frontend/src/features/backtests/daily-loss.ts)

### Imported by

- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `resolveDailyLossLimitPct` | [1](../../meu_frontend/src/features/backtests/daily-loss.ts#L1) | `Math.min` |

<a id="file-e9ab06d56b34"></a>

## meu_frontend/src/features/backtests/server/delta-data.ts

[meu_frontend/src/features/backtests/server/delta-data.ts](../../meu_frontend/src/features/backtests/server/delta-data.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/delta-data` | [shared/trading/delta-data.ts](#file-780ed3a879a0) |

### Imported by

- [meu_frontend/src/features/agents/server/edit-crypto-agent.ts](#file-5129a594abff)
- [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2)
- [meu_frontend/src/features/backtests/server/router.ts](#file-077c1fd7ba8c)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-077c1fd7ba8c"></a>

## meu_frontend/src/features/backtests/server/router.ts

[meu_frontend/src/features/backtests/server/router.ts](../../meu_frontend/src/features/backtests/server/router.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/emaCrossover` | [shared/trading/emaCrossover.ts](#file-1d7dd8e6da1e) |
| `../../../../../shared/trading/perpetualBacktest` | [shared/trading/perpetualBacktest.ts](#file-14821081d1df) |
| `../../../../../shared/trading/strategies` | [shared/trading/strategies.ts](#file-08c346741655) |
| `../validation` | [meu_frontend/src/features/backtests/validation.ts](#file-530f00338d26) |
| `./delta-data` | [meu_frontend/src/features/backtests/server/delta-data.ts](#file-e9ab06d56b34) |
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/trpc/init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |

### Imported by

- [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195)

External or unresolved imports: `@trpc/server`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `view` | [23](../../meu_frontend/src/features/backtests/server/router.ts#L23) | — |
| `createPausedCryptoAgent` | [33](../../meu_frontend/src/features/backtests/server/router.ts#L33) | `Date.now`, `Math.floor`, `Math.max`, `exchange.name.toUpperCase`, `loadDeltaBacktestData`, `prisma.agent.count`, `prisma.agent.create`, `prisma.exchange.findFirst` |

<a id="file-530f00338d26"></a>

## meu_frontend/src/features/backtests/validation.ts

[meu_frontend/src/features/backtests/validation.ts](../../meu_frontend/src/features/backtests/validation.ts)

### Imported by

- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/agents/server/edit-crypto-agent.ts](#file-5129a594abff)
- [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)
- [meu_frontend/src/features/backtests/server/router.ts](#file-077c1fd7ba8c)

External or unresolved imports: `zod`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-c9aab20b58a0"></a>

## meu_frontend/src/features/charts/components/candle-chart.tsx

[meu_frontend/src/features/charts/components/candle-chart.tsx](../../meu_frontend/src/features/charts/components/candle-chart.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../indicators` | [meu_frontend/src/features/charts/indicators.ts](#file-1ea0270f41af) |
| `../types` | [meu_frontend/src/features/charts/types.ts](#file-3149635beb0a) |
| `@/components/ui-settings` | [meu_frontend/src/components/ui-settings.tsx](#file-10bad29dc90f) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |

### Imported by

- [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2)

External or unresolved imports: `lightweight-charts`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `CandleChart` | [12](../../meu_frontend/src/features/charts/components/candle-chart.tsx#L12) | `candles.at`, `candles.find`, `fmt`, `useEffect`, `useRef`, `useState`, `useUISettings` |
| `tickMarkFormatter` | [29](../../meu_frontend/src/features/charts/components/candle-chart.tsx#L29) | — |
| `timeFormatter` | [30](../../meu_frontend/src/features/charts/components/candle-chart.tsx#L30) | — |
| `autoscaleInfoProvider` | [39](../../meu_frontend/src/features/charts/components/candle-chart.tsx#L39) | — |
| `timed` | [56](../../meu_frontend/src/features/charts/components/candle-chart.tsx#L56) | `points.map` |
| `fmt` | [72](../../meu_frontend/src/features/charts/components/candle-chart.tsx#L72) | `value.toLocaleString` |

<a id="file-8c2aa8a37e03"></a>

## meu_frontend/src/features/charts/components/charts-workspace.tsx

[meu_frontend/src/features/charts/components/charts-workspace.tsx](../../meu_frontend/src/features/charts/components/charts-workspace.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./meu-chart-workspace` | [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2) |
| `@/components/ui-settings` | [meu_frontend/src/components/ui-settings.tsx](#file-10bad29dc90f) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/components/ui/tabs` | [meu_frontend/src/components/ui/tabs.tsx](#file-2a712ece64d3) |

### Imported by

- [meu_frontend/src/app/(dashboard)/charts/page.tsx](#file-67b8a16fdcc7)

External or unresolved imports: `lucide-react`, `next/link`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `TradingViewWidget` | [39](../../meu_frontend/src/features/charts/components/charts-workspace.tsx#L39) | `JSON.stringify`, `useEffect`, `useRef`, `useState` |
| `loaded` | [91](../../meu_frontend/src/features/charts/components/charts-workspace.tsx#L91) | `setStatus`, `window.clearTimeout` |
| `TradingViewWorkspace` | [147](../../meu_frontend/src/features/charts/components/charts-workspace.tsx#L147) | `quickCharts.map`, `useState`, `useUISettings` |
| `ChartsWorkspace` | [177](../../meu_frontend/src/features/charts/components/charts-workspace.tsx#L177) | — |

<a id="file-b3914f0d1ad2"></a>

## meu_frontend/src/features/charts/components/meu-chart-workspace.tsx

[meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](../../meu_frontend/src/features/charts/components/meu-chart-workspace.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../types` | [meu_frontend/src/features/charts/types.ts](#file-3149635beb0a) |
| `./candle-chart` | [meu_frontend/src/features/charts/components/candle-chart.tsx](#file-c9aab20b58a0) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/command` | [meu_frontend/src/components/ui/command.tsx](#file-f880b52c3559) |
| `@/components/ui/popover` | [meu_frontend/src/components/ui/popover.tsx](#file-ee0b115629d8) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/charts/components/charts-workspace.tsx](#file-8c2aa8a37e03)

External or unresolved imports: `@tanstack/react-query`, `lucide-react`, `next/link`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `SymbolSearch` | [21](../../meu_frontend/src/features/charts/components/meu-chart-workspace.tsx#L21) | `result.data.map`, `result.data?.some`, `search.trim`, `trpc.charts.search.queryOptions`, `useEffect`, `useQuery`, `useState`, `useTRPC` |
| `MeuChartWorkspace` | [40](../../meu_frontend/src/features/charts/components/meu-chart-workspace.tsx#L40) | `Boolean`, `Math.max`, `Object.entries`, `agents.data?.find`, `agents.data?.map`, `agents.data?.some`, `fmtTime`, `quick.map`, `trpc.charts.agents.queryOptions`, `trpc.charts.candles.queryOptions`, `useEffect`, `useQuery`, `useState`, `useTRPC` |
| `fmtTime` | [56](../../meu_frontend/src/features/charts/components/meu-chart-workspace.tsx#L56) | — |

<a id="file-1ea0270f41af"></a>

## meu_frontend/src/features/charts/indicators.ts

[meu_frontend/src/features/charts/indicators.ts](../../meu_frontend/src/features/charts/indicators.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./types` | [meu_frontend/src/features/charts/types.ts](#file-3149635beb0a) |

### Imported by

- [meu_frontend/src/features/backtests/chart/analysis.ts](#file-dac1b352656a)
- [meu_frontend/src/features/charts/components/candle-chart.tsx](#file-c9aab20b58a0)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `chartEma` | [4](../../meu_frontend/src/features/charts/indicators.ts#L4) | `Number.isInteger`, `candles.slice`, `result.push` |
| `chartRsi` | [15](../../meu_frontend/src/features/charts/indicators.ts#L15) | `Math.max`, `result.push`, `rsi` |
| `rsi` | [23](../../meu_frontend/src/features/charts/indicators.ts#L23) | — |
| `chartBollinger` | [34](../../meu_frontend/src/features/charts/indicators.ts#L34) | `Math.sqrt`, `candles.slice`, `lower.push`, `middle.push`, `upper.push`, `values.reduce` |

<a id="file-d00596a1e24e"></a>

## meu_frontend/src/features/charts/server/data.ts

[meu_frontend/src/features/charts/server/data.ts](../../meu_frontend/src/features/charts/server/data.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../types` | [meu_frontend/src/features/charts/types.ts](#file-3149635beb0a) |

### Imported by

- [meu_frontend/src/features/charts/server/router.ts](#file-f9d982eae1de)

External or unresolved imports: `@trpc/server`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `normalizeChartCandles` | [16](../../meu_frontend/src/features/charts/server/data.ts#L16) | `Date.now`, `Math.floor`, `Math.max`, `Math.min`, `candles.set`, `candles.values`, `rawCandle.safeParse` |
| `providerJson` | [29](../../meu_frontend/src/features/charts/server/data.ts#L29) | `AbortSignal.timeout`, `JSON.parse`, `decoder.decode`, `reader.cancel`, `reader.read`, `request`, `response.body.getReader` |
| `numeric` | [58](../../meu_frontend/src/features/charts/server/data.ts#L58) | `Number`, `value.trim` |
| `loadChartCandles` | [60](../../meu_frontend/src/features/charts/server/data.ts#L60) | `Date.now`, `Math.floor`, `String`, `candles.at`, `chartInputSchema.parse`, `encodeURIComponent`, `normalizeChartCandles`, `parsed.data.map`, `parsed.data.result.map`, `providerJson`, `url.searchParams.set`, `yahooEnvelope.safeParse`, `z.array`, `z.literal`, `z.number`, `z.object`, `z.unknown` |
| `searchChartSymbols` | [109](../../meu_frontend/src/features/charts/server/data.ts#L109) | `Date.now`, `cryptoCatalogs.get`, `cryptoCatalogs.set`, `data.data.quotes.filter`, `matches`, `parsed.data.result.filter`, `parsed.data.symbols.filter`, `providerJson`, `query.toLowerCase`, `url.searchParams.set`, `z.array`, `z.literal`, `z.object`, `z.string` |
| `matches` | [119](../../meu_frontend/src/features/charts/server/data.ts#L119) | `markets.filter` |

<a id="file-f9d982eae1de"></a>

## meu_frontend/src/features/charts/server/router.ts

[meu_frontend/src/features/charts/server/router.ts](../../meu_frontend/src/features/charts/server/router.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../types` | [meu_frontend/src/features/charts/types.ts](#file-3149635beb0a) |
| `./data` | [meu_frontend/src/features/charts/server/data.ts](#file-d00596a1e24e) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/trpc/init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |

### Imported by

- [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195)

External or unresolved imports: `@trpc/server`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `cached` | [11](../../meu_frontend/src/features/charts/server/router.ts#L11) | `Date.now`, `cache.delete`, `cache.get`, `load`, `pending.get`, `pending.set` |

<a id="file-3149635beb0a"></a>

## meu_frontend/src/features/charts/types.ts

[meu_frontend/src/features/charts/types.ts](../../meu_frontend/src/features/charts/types.ts)

### Imported by

- [meu_frontend/src/features/charts/components/candle-chart.tsx](#file-c9aab20b58a0)
- [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2)
- [meu_frontend/src/features/charts/indicators.ts](#file-1ea0270f41af)
- [meu_frontend/src/features/charts/server/data.ts](#file-d00596a1e24e)
- [meu_frontend/src/features/charts/server/router.ts](#file-f9d982eae1de)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `agentChartSymbol` | [11](../../meu_frontend/src/features/charts/types.ts#L11) | `exchange.toUpperCase`, `symbol.replace`, `symbol.split`, `ticker.endsWith` |

<a id="file-ad04fd87d941"></a>

## meu_frontend/src/features/credentials/components/EditCred.tsx

[meu_frontend/src/features/credentials/components/EditCred.tsx](../../meu_frontend/src/features/credentials/components/EditCred.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../validation` | [meu_frontend/src/features/credentials/validation.ts](#file-1d0f7e5fb2e6) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/features/credentials/hooks/use-credentials` | [meu_frontend/src/features/credentials/hooks/use-credentials.ts](#file-1382f3bd3f99) |
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |

### Imported by

- [meu_frontend/src/app/(dashboard)/credentials/[credentialId]/edit/page.tsx](#file-052bcf1e24b9)

External or unresolved imports: `@hookform/resolvers/zod`, `lucide-react`, `react-hook-form`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EditCredentialPage` | [38](../../meu_frontend/src/features/credentials/components/EditCred.tsx#L38) | `form.handleSubmit`, `useEditCredential`, `useForm`, `useSuspenseCredential`, `useWatch`, `zodResolver` |
| `onSubmit` | [56](../../meu_frontend/src/features/credentials/components/EditCred.tsx#L56) | `editCredential.mutate` |
| `getPlaceholder` | [60](../../meu_frontend/src/features/credentials/components/EditCred.tsx#L60) | — |

<a id="file-a61b47d55b05"></a>

## meu_frontend/src/features/credentials/components/createCred.tsx

[meu_frontend/src/features/credentials/components/createCred.tsx](../../meu_frontend/src/features/credentials/components/createCred.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../validation` | [meu_frontend/src/features/credentials/validation.ts](#file-1d0f7e5fb2e6) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/features/credentials/hooks/use-credentials` | [meu_frontend/src/features/credentials/hooks/use-credentials.ts](#file-1382f3bd3f99) |
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |

### Imported by

- [meu_frontend/src/app/(dashboard)/credentials/create/page.tsx](#file-dbffdf68cab5)

External or unresolved imports: `@hookform/resolvers/zod`, `lucide-react`, `react-hook-form`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `CreateCredentialPage` | [39](../../meu_frontend/src/features/credentials/components/createCred.tsx#L39) | `form.handleSubmit`, `useCreateCredential`, `useForm`, `useWatch`, `zodResolver` |
| `onSubmit` | [56](../../meu_frontend/src/features/credentials/components/createCred.tsx#L56) | `createCredential.mutate` |
| `getPlaceholder` | [60](../../meu_frontend/src/features/credentials/components/createCred.tsx#L60) | — |

<a id="file-9f89f43602b3"></a>

## meu_frontend/src/features/credentials/components/credentials.tsx

[meu_frontend/src/features/credentials/components/credentials.tsx](../../meu_frontend/src/features/credentials/components/credentials.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-credentials` | [meu_frontend/src/features/credentials/hooks/use-credentials.ts](#file-1382f3bd3f99) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/credentials/page.tsx](#file-a7babf3707cc)

External or unresolved imports: `date-fns`, `lucide-react`, `next/navigation`, `react`, `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `CredentialsPage` | [22](../../meu_frontend/src/features/credentials/components/credentials.tsx#L22) | `useCredentials`, `useDeleteCredential`, `useRouter`, `useState` |
| `handleSearch` | [33](../../meu_frontend/src/features/credentials/components/credentials.tsx#L33) | `setPage`, `setSearch` |
| `handlePageChange` | [38](../../meu_frontend/src/features/credentials/components/credentials.tsx#L38) | `setPage` |
| `handleCopy` | [42](../../meu_frontend/src/features/credentials/components/credentials.tsx#L42) | `navigator.clipboard.writeText`, `setCopiedId`, `setTimeout`, `toast.info` |

<a id="file-00eb873b472a"></a>

## meu_frontend/src/features/credentials/components/model-picker.tsx

[meu_frontend/src/features/credentials/components/model-picker.tsx](../../meu_frontend/src/features/credentials/components/model-picker.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/command` | [meu_frontend/src/components/ui/command.tsx](#file-f880b52c3559) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/popover` | [meu_frontend/src/components/ui/popover.tsx](#file-ee0b115629d8) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](#file-00d290523c22)

External or unresolved imports: `@tanstack/react-query`, `lucide-react`, `react`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-1382f3bd3f99"></a>

## meu_frontend/src/features/credentials/hooks/use-credentials.ts

[meu_frontend/src/features/credentials/hooks/use-credentials.ts](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)
- [meu_frontend/src/features/agents/components/agent-intelligence-fields.tsx](#file-00d290523c22)
- [meu_frontend/src/features/credentials/components/EditCred.tsx](#file-ad04fd87d941)
- [meu_frontend/src/features/credentials/components/createCred.tsx](#file-a61b47d55b05)
- [meu_frontend/src/features/credentials/components/credentials.tsx](#file-9f89f43602b3)

External or unresolved imports: `@tanstack/react-query`, `next/navigation`, `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `useCredentials` | [7](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L7) | `trpc.credentials.getAll.queryOptions`, `useQuery`, `useTRPC` |
| `useSuspenseCredential` | [17](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L17) | `trpc.credentials.getOne.queryOptions`, `useSuspenseQuery`, `useTRPC` |
| `useCredential` | [21](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L21) | `trpc.credentials.getOne.queryOptions`, `useQuery`, `useTRPC` |
| `useCredentialByType` | [32](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L32) | `trpc.credentials.getByType.queryOptions`, `useSuspenseQuery`, `useTRPC` |
| `useAllCredentials` | [37](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L37) | `trpc.credentials.listAll.queryOptions`, `useQuery`, `useTRPC` |
| `useCreateCredential` | [42](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L42) | `trpc.credentials.create.mutationOptions`, `useMutation`, `useQueryClient`, `useRouter`, `useTRPC` |
| `onSuccess` | [47](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L47) | `queryClient.invalidateQueries`, `router.push`, `toast.success`, `trpc.credentials.getAll.queryOptions`, `trpc.credentials.getOne.queryOptions`, `trpc.credentials.listAll.queryOptions` |
| `onError` | [54](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L54) | `toast.error` |
| `useEditCredential` | [60](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L60) | `trpc.credentials.update.mutationOptions`, `useMutation`, `useQueryClient`, `useRouter`, `useTRPC` |
| `onSuccess` | [65](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L65) | `queryClient.invalidateQueries`, `router.push`, `toast.success`, `trpc.credentials.getAll.queryOptions`, `trpc.credentials.getOne.queryOptions`, `trpc.credentials.listAll.queryOptions`, `trpc.credentials.models.queryKey` |
| `onError` | [73](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L73) | `toast.error` |
| `useDeleteCredential` | [79](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L79) | `trpc.credentials.delete.mutationOptions`, `useMutation`, `useQueryClient`, `useRouter`, `useTRPC` |
| `onSuccess` | [84](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L84) | `queryClient.invalidateQueries`, `router.push`, `toast.success`, `trpc.credentials.getAll.queryOptions`, `trpc.credentials.getOne.queryOptions`, `trpc.credentials.listAll.queryOptions` |
| `onError` | [91](../../meu_frontend/src/features/credentials/hooks/use-credentials.ts#L91) | `toast.error` |

<a id="file-2d782da7bfbc"></a>

## meu_frontend/src/features/credentials/server/models.ts

[meu_frontend/src/features/credentials/server/models.ts](../../meu_frontend/src/features/credentials/server/models.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/lib/encryption` | [meu_frontend/src/lib/encryption.ts](#file-fadfe6773757) |

### Imported by

- [meu_frontend/src/features/credentials/server/router.ts](#file-5813a830e726)

External or unresolved imports: `@trpc/server`, `node:crypto`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `record` | [19](../../meu_frontend/src/features/credentials/server/models.ts#L19) | `Array.isArray` |
| `strings` | [20](../../meu_frontend/src/features/credentials/server/models.ts#L20) | `Array.isArray`, `value.filter` |
| `label` | [21](../../meu_frontend/src/features/credentials/server/models.ts#L21) | `value.replace` |
| `validId` | [22](../../meu_frontend/src/features/credentials/server/models.ts#L22) | — |
| `readJson` | [25](../../meu_frontend/src/features/credentials/server/models.ts#L25) | `JSON.parse`, `decoder.decode`, `fetch`, `reader.cancel`, `reader.read`, `record`, `response.body.getReader` |
| `parseProviderModels` | [36](../../meu_frontend/src/features/credentials/server/models.ts#L36) | `Array.isArray`, `data.flatMap` |
| `providerCatalog` | [54](../../meu_frontend/src/features/credentials/server/models.ts#L54) | `base.replace`, `cursors.add`, `cursors.has`, `models.push`, `parseProviderModels`, `readJson`, `url.searchParams.set`, `validId`, `warnings.push` |
| `bedrockCatalog` | [72](../../meu_frontend/src/features/credentials/server/models.ts#L72) | `Array.isArray`, `cursors.add`, `cursors.has`, `label`, `models.push`, `readJson`, `record`, `strings`, `url.searchParams.set`, `validId`, `warnings.push` |
| `mantleCatalog` | [106](../../meu_frontend/src/features/credentials/server/models.ts#L106) | `parseProviderModels`, `readJson` |
| `loadCredentialModels` | [114](../../meu_frontend/src/features/credentials/server/models.ts#L114) | `Date.now`, `JSON.stringify`, `cache.get`, `createHash`, `pending.delete`, `pending.get`, `pending.set`, `prisma.credentials.findFirst` |
| `searchCredentialModels` | [139](../../meu_frontend/src/features/credentials/server/models.ts#L139) | `catalog.models.filter`, `matches.slice`, `matches.sort`, `query.trim` |

<a id="file-5813a830e726"></a>

## meu_frontend/src/features/credentials/server/router.ts

[meu_frontend/src/features/credentials/server/router.ts](../../meu_frontend/src/features/credentials/server/router.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../validation` | [meu_frontend/src/features/credentials/validation.ts](#file-1d0f7e5fb2e6) |
| `./models` | [meu_frontend/src/features/credentials/server/models.ts](#file-2d782da7bfbc) |
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/lib/encryption` | [meu_frontend/src/lib/encryption.ts](#file-fadfe6773757) |
| `@/trpc/init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |

### Imported by

- [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195)

External or unresolved imports: `@trpc/server`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `redactCredential` | [12](../../meu_frontend/src/features/credentials/server/router.ts#L12) | — |

<a id="file-1d0f7e5fb2e6"></a>

## meu_frontend/src/features/credentials/validation.ts

[meu_frontend/src/features/credentials/validation.ts](../../meu_frontend/src/features/credentials/validation.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |

### Imported by

- [meu_frontend/src/features/credentials/components/EditCred.tsx](#file-ad04fd87d941)
- [meu_frontend/src/features/credentials/components/createCred.tsx](#file-a61b47d55b05)
- [meu_frontend/src/features/credentials/server/router.ts](#file-5813a830e726)

External or unresolved imports: `zod`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-c8683f166fff"></a>

## meu_frontend/src/features/exchange/components/EditExchange.tsx

[meu_frontend/src/features/exchange/components/EditExchange.tsx](../../meu_frontend/src/features/exchange/components/EditExchange.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-exchange` | [meu_frontend/src/features/exchange/hooks/use-exchange.ts](#file-40f9c8c0bd38) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/components/ui/switch` | [meu_frontend/src/components/ui/switch.tsx](#file-5956445d8878) |

### Imported by

- [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/edit/page.tsx](#file-713bcbfecf18)

External or unresolved imports: `@hookform/resolvers/zod`, `lucide-react`, `react-hook-form`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `EditExchangePage` | [36](../../meu_frontend/src/features/exchange/components/EditExchange.tsx#L36) | `BROKERS.includes`, `form.handleSubmit`, `useForm`, `useSuspenseExchange`, `useUpdateExchange`, `zodResolver` |
| `onSubmit` | [53](../../meu_frontend/src/features/exchange/components/EditExchange.tsx#L53) | `updateExchange.mutate` |

<a id="file-020e7b2d2cba"></a>

## meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx

[meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](../../meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-exchange` | [meu_frontend/src/features/exchange/hooks/use-exchange.ts](#file-40f9c8c0bd38) |
| `./account-execution-panel` | [meu_frontend/src/features/exchange/components/account-execution-panel.tsx](#file-561367eaad9f) |
| `./portfolio-overview` | [meu_frontend/src/features/exchange/components/portfolio-overview.tsx](#file-71c3b269af63) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/command` | [meu_frontend/src/components/ui/command.tsx](#file-f880b52c3559) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/popover` | [meu_frontend/src/components/ui/popover.tsx](#file-ee0b115629d8) |
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |
| `@/lib/auth-client` | [meu_frontend/src/lib/auth-client.ts](#file-a6e64c486914) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/dashboard/page.tsx](#file-eff5f999ef04)

External or unresolved imports: `lucide-react`, `next/link`, `next/navigation`, `react`, `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ZerodhaReauth` | [44](../../meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx#L44) | `searchParams.get`, `token.trim`, `useEffect`, `useKiteAuth`, `useRouter`, `useSearchParams`, `useState` |
| `onSettled` | [76](../../meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx#L76) | `router.replace` |
| `ExchangeDashboard` | [192](../../meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx#L192) | `exchanges.find`, `useState`, `useSuspenseExchanges` |
| `ConnectedDashboard` | [227](../../meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx#L227) | `authClient.useSession`, `exchanges.map`, `searchParams.get`, `selectedExchange.name.toUpperCase`, `useGetExchangeData`, `useSearchParams`, `useState`, `warnings.join` |

<a id="file-561367eaad9f"></a>

## meu_frontend/src/features/exchange/components/account-execution-panel.tsx

[meu_frontend/src/features/exchange/components/account-execution-panel.tsx](../../meu_frontend/src/features/exchange/components/account-execution-panel.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../shared/trading/accountRisk` | [shared/trading/accountRisk.ts](#file-60aebedf84e9) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)

External or unresolved imports: `@tanstack/react-query`, `next/link`, `react`, `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `AccountRiskForm` | [20](../../meu_frontend/src/features/exchange/components/account-execution-panel.tsx#L20) | `riskFields.map`, `trpc.exchange.updateAccountRisk.mutationOptions`, `useMutation`, `useQueryClient`, `useState`, `useTRPC` |
| `onSuccess` | [28](../../meu_frontend/src/features/exchange/components/account-execution-panel.tsx#L28) | `cache.invalidateQueries`, `toast.success`, `trpc.exchange.executionState.queryOptions` |
| `AccountExecutionPanel` | [69](../../meu_frontend/src/features/exchange/components/account-execution-panel.tsx#L69) | `JSON.stringify`, `data.orders.map`, `data.positions.map`, `trpc.exchange.executionState.queryOptions`, `useQuery`, `useTRPC` |

<a id="file-752d2ba61e29"></a>

## meu_frontend/src/features/exchange/components/createEx.tsx

[meu_frontend/src/features/exchange/components/createEx.tsx](../../meu_frontend/src/features/exchange/components/createEx.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-exchange` | [meu_frontend/src/features/exchange/hooks/use-exchange.ts](#file-40f9c8c0bd38) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/form` | [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |
| `@/components/ui/select` | [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124) |
| `@/components/ui/switch` | [meu_frontend/src/components/ui/switch.tsx](#file-5956445d8878) |

### Imported by

- [meu_frontend/src/app/(dashboard)/exchanges/create/page.tsx](#file-04b1ab4df132)

External or unresolved imports: `@hookform/resolvers/zod`, `lucide-react`, `react`, `react-hook-form`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `CreateExchangePage` | [36](../../meu_frontend/src/features/exchange/components/createEx.tsx#L36) | `form.handleSubmit`, `useCreateExchange`, `useForm`, `zodResolver` |
| `onSubmit` | [50](../../meu_frontend/src/features/exchange/components/createEx.tsx#L50) | `createExchange.mutate` |

<a id="file-a53ef3559020"></a>

## meu_frontend/src/features/exchange/components/exchange.tsx

[meu_frontend/src/features/exchange/components/exchange.tsx](../../meu_frontend/src/features/exchange/components/exchange.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-exchange` | [meu_frontend/src/features/exchange/hooks/use-exchange.ts](#file-40f9c8c0bd38) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/exchanges/page.tsx](#file-dbb98e596cb7)

External or unresolved imports: `date-fns`, `lucide-react`, `next/link`, `next/navigation`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ExchangesPage` | [23](../../meu_frontend/src/features/exchange/components/exchange.tsx#L23) | `useDeleteExchange`, `useExchangesPaginated`, `useRouter`, `useState` |
| `handleSearch` | [33](../../meu_frontend/src/features/exchange/components/exchange.tsx#L33) | `setPage`, `setSearch` |
| `handlePageChange` | [38](../../meu_frontend/src/features/exchange/components/exchange.tsx#L38) | `setPage` |

<a id="file-71c3b269af63"></a>

## meu_frontend/src/features/exchange/components/portfolio-overview.tsx

[meu_frontend/src/features/exchange/components/portfolio-overview.tsx](../../meu_frontend/src/features/exchange/components/portfolio-overview.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/table` | [meu_frontend/src/components/ui/table.tsx](#file-71ac7e7f4274) |
| `@/components/ui/tabs` | [meu_frontend/src/components/ui/tabs.tsx](#file-2a712ece64d3) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)

External or unresolved imports: `ccxt`, `lucide-react`, `next/link`, `react`, `recharts`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `numeric` | [47](../../meu_frontend/src/features/exchange/components/portfolio-overview.tsx#L47) | `Number`, `Number.isFinite` |
| `number` | [53](../../meu_frontend/src/features/exchange/components/portfolio-overview.tsx#L53) | `n.toLocaleString`, `numeric` |
| `positionPnl` | [63](../../meu_frontend/src/features/exchange/components/portfolio-overview.tsx#L63) | `numeric` |
| `Side` | [67](../../meu_frontend/src/features/exchange/components/portfolio-overview.tsx#L67) | `cn` |
| `PortfolioOverview` | [88](../../meu_frontend/src/features/exchange/components/portfolio-overview.tsx#L88) | `Math.abs`, `Object.keys`, `assetKeys.map`, `cn`, `exchangeName.toUpperCase`, `name.split`, `number`, `openPositions.map`, `openPositions.slice`, `pnlValues.reduce`, `pnlValues.some`, `positions.filter`, `useMemo`, `useState` |

<a id="file-9f41ee2d0004"></a>

## meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx

[meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx](../../meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/reconciliation/page.tsx](#file-b387ed1faddf)

External or unresolved imports: `@tanstack/react-query`, `lucide-react`, `next/link`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `ReconciliationWorkspace` | [17](../../meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx#L17) | `report.issues.map`, `report.locks.map`, `report.orders.map`, `report.pending.map`, `report.positions.map`, `report.unresolvedIntents.map`, `trpc.exchange.pauseForRecovery.mutationOptions`, `trpc.exchange.reconciliation.mutationOptions`, `trpc.exchange.recoverExecution.mutationOptions`, `useMutation`, `useTRPC` |
| `onSuccess` | [20](../../meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx#L20) | `scan.reset` |
| `onSuccess` | [21](../../meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx#L21) | `scan.reset` |

<a id="file-40f9c8c0bd38"></a>

## meu_frontend/src/features/exchange/hooks/use-exchange.ts

[meu_frontend/src/features/exchange/hooks/use-exchange.ts](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/agents/components/AgentDetailView.tsx](#file-2d6ca63749e5)
- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/exchange/components/EditExchange.tsx](#file-c8683f166fff)
- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)
- [meu_frontend/src/features/exchange/components/createEx.tsx](#file-752d2ba61e29)
- [meu_frontend/src/features/exchange/components/exchange.tsx](#file-a53ef3559020)

External or unresolved imports: `@tanstack/react-query`, `ccxt`, `next/navigation`, `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `useSuspenseExchanges` | [13](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L13) | `trpc.exchange.getAll.queryOptions`, `useSuspenseQuery`, `useTRPC` |
| `useExchangesPaginated` | [18](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L18) | `trpc.exchange.getPaginated.queryOptions`, `useQuery`, `useTRPC` |
| `useSuspenseExchange` | [31](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L31) | `trpc.exchange.getOne.queryOptions`, `useSuspenseQuery`, `useTRPC` |
| `useCreateExchange` | [36](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L36) | `trpc.exchange.create.mutationOptions`, `useMutation`, `useQueryClient`, `useRouter`, `useTRPC` |
| `onSuccess` | [42](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L42) | `queryClient.invalidateQueries`, `router.push`, `toast.success`, `trpc.exchange.getAll.queryOptions`, `trpc.exchange.getOne.queryOptions`, `trpc.exchange.getPaginated.queryKey` |
| `onError` | [51](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L51) | `toast.error` |
| `useUpdateExchange` | [58](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L58) | `trpc.exchange.update.mutationOptions`, `useMutation`, `useQueryClient`, `useRouter`, `useTRPC` |
| `onSuccess` | [64](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L64) | `queryClient.invalidateQueries`, `router.push`, `toast.success`, `trpc.exchange.getAll.queryOptions`, `trpc.exchange.getOne.queryOptions`, `trpc.exchange.getPaginated.queryKey` |
| `onError` | [73](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L73) | `toast.error` |
| `useDeleteExchange` | [80](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L80) | `trpc.exchange.delete.mutationOptions`, `useMutation`, `useQueryClient`, `useRouter`, `useTRPC` |
| `onSuccess` | [86](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L86) | `queryClient.invalidateQueries`, `router.push`, `toast.success`, `trpc.exchange.getAll.queryOptions`, `trpc.exchange.getOne.queryOptions`, `trpc.exchange.getPaginated.queryKey` |
| `onError` | [95](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L95) | `toast.error` |
| `useGetExchangeData` | [102](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L102) | `trpc.exData.getById.queryOptions`, `useQuery`, `useTRPC` |
| `useKiteAuth` | [159](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L159) | `trpc.exchange.kiteAuth.mutationOptions`, `useMutation`, `useQueryClient`, `useTRPC` |
| `onSuccess` | [166](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L166) | `queryClient.invalidateQueries`, `toast.error`, `toast.success`, `trpc.exData.getById.queryKey` |
| `onError` | [176](../../meu_frontend/src/features/exchange/hooks/use-exchange.ts#L176) | `toast.error` |

<a id="file-3b174aa1243a"></a>

## meu_frontend/src/features/exchange/server/execution-account.ts

[meu_frontend/src/features/exchange/server/execution-account.ts](../../meu_frontend/src/features/exchange/server/execution-account.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../meu/schedulerService/src/brokers/crypto/cryptoAccount` | [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886) |
| `../../../../../meu/schedulerService/src/config/config` | [meu/schedulerService/src/config/config.ts](#file-9ba5db203d2d) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/lib/encryption` | [meu_frontend/src/lib/encryption.ts](#file-fadfe6773757) |

### Imported by

- [meu_frontend/src/features/agents/server/edit-crypto-agent.ts](#file-5129a594abff)
- [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3)
- [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)
- [meu_frontend/src/features/exchange/server/reconciliation.ts](#file-d0180098de88)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)
- [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1)

External or unresolved imports: `../../../../../meu/schedulerService/node_modules/ccxt`, `@trpc/server`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `executionConnection` | [9](../../meu_frontend/src/features/exchange/server/execution-account.ts#L9) | `configureCryptoExchange`, `connection.name.toUpperCase`, `decryptSecret`, `prisma.exchange.findFirst` |
| `registerExecutionAccount` | [17](../../meu_frontend/src/features/exchange/server/execution-account.ts#L17) | `Array.isArray`, `accountRiskSchema.parse`, `identifyDeltaAccount`, `prisma.$runCommandRaw` |
| `linkedExchangeIds` | [33](../../meu_frontend/src/features/exchange/server/execution-account.ts#L33) | `Array.isArray`, `String`, `links.map`, `prisma.$runCommandRaw` |

<a id="file-d0180098de88"></a>

## meu_frontend/src/features/exchange/server/reconciliation.ts

[meu_frontend/src/features/exchange/server/reconciliation.ts](../../meu_frontend/src/features/exchange/server/reconciliation.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../meu/schedulerService/src/brokers/delta/deltaReconciliation` | [meu/schedulerService/src/brokers/delta/deltaReconciliation.ts](#file-c1cc1175ff3a) |
| `./execution-account` | [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a) |
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |

### Imported by

- [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3)
- [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)
- [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1)

External or unresolved imports: `@trpc/server`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `readRows` | [9](../../meu_frontend/src/features/exchange/server/reconciliation.ts#L9) | `Array.isArray`, `String`, `prisma.$runCommandRaw` |
| `reconciliationReport` | [17](../../meu_frontend/src/features/exchange/server/reconciliation.ts#L17) | `Promise.all`, `active.add`, `active.delete`, `active.has`, `agents.flatMap`, `agents.some`, `before.map`, `broker.issues.map`, `broker.orders.map`, `broker.positions.map`, `connectionIds.map`, `exchange.loadMarkets`, `executionConnection`, `fingerprint`, `inspectDeltaOwnership`, `intents.map`, `linkedExchangeIds`, `locks`, `owners.flatMap`, `owners.some`, `prisma.agent.count`, `prisma.agent.findMany`, `readRows`, `registerExecutionAccount` |
| `locks` | [32](../../meu_frontend/src/features/exchange/server/reconciliation.ts#L32) | `readRows` |
| `fingerprint` | [50](../../meu_frontend/src/features/exchange/server/reconciliation.ts#L50) | `JSON.stringify`, `rows.map` |
| `label` | [52](../../meu_frontend/src/features/exchange/server/reconciliation.ts#L52) | `agents.find` |

<a id="file-05b3fc29b44f"></a>

## meu_frontend/src/features/exchange/server/recover-execution.ts

[meu_frontend/src/features/exchange/server/recover-execution.ts](../../meu_frontend/src/features/exchange/server/recover-execution.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig` | [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f) |
| `../../../../../meu/schedulerService/src/brokers/crypto/cryptoRisk` | [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c) |
| `../../../../../meu/schedulerService/src/brokers/delta/deltaReconciliation` | [meu/schedulerService/src/brokers/delta/deltaReconciliation.ts](#file-c1cc1175ff3a) |
| `../../../../../meu/schedulerService/src/lib/redis` | [meu/schedulerService/src/lib/redis.ts](#file-5940bbec8c7b) |
| `../../../../../shared/trading/sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `../../../../../shared/trading/strategies` | [shared/trading/strategies.ts](#file-08c346741655) |
| `./execution-account` | [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a) |
| `./reconciliation` | [meu_frontend/src/features/exchange/server/reconciliation.ts](#file-d0180098de88) |
| `@/features/backtests/server/delta-data` | [meu_frontend/src/features/backtests/server/delta-data.ts](#file-e9ab06d56b34) |
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |
| `@/lib/app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |

### Imported by

- [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1)

External or unresolved imports: `@trpc/server`, `node:crypto`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `fail` | [22](../../meu_frontend/src/features/exchange/server/recover-execution.ts#L22) | — |
| `written` | [23](../../meu_frontend/src/features/exchange/server/recover-execution.ts#L23) | `Array.isArray` |
| `recoverDeltaExecution` | [28](../../meu_frontend/src/features/exchange/server/recover-execution.ts#L28) | `Date.now`, `JSON.stringify`, `Math.floor`, `Math.max`, `Number.isSafeInteger`, `Promise.all`, `appLog`, `assertUnchanged`, `broker.orders.find`, `broker.orders.some`, `broker.pending.map`, `broker.positions.map`, `connection.name.toUpperCase`, `exchange.loadMarkets`, `executionConnection`, `fail`, `history.candles.at`, `inspectDeltaOwnership`, `intents.map`, `linkedExchangeIds`, `loadDeltaBacktestData`, `owners.flatMap`, `owners.map`, `owners.some`, `peers.filter`, `peers.some`, `periods.find`, `prisma.$runCommandRaw`, `prisma.agent.findMany`, `randomUUID`, `readRows`, `registerExecutionAccount`, `scopes.map`, `strategyStateKey`, `validateCryptoStrategy`, `verifyLeverageIntent`, `verifyOrphan`, `written` |
| `verifyOrphan` | [50](../../meu_frontend/src/features/exchange/server/recover-execution.ts#L50) | `Date.parse`, `JSON.parse`, `Number`, `Number.isFinite`, `Promise.all`, `Promise.race`, `fail`, `import`, `redis.exists`, `redis.hget`, `redis.lpos`, `redis.zscore` |
| `assertUnchanged` | [74](../../meu_frontend/src/features/exchange/server/recover-execution.ts#L74) | `JSON.stringify`, `Promise.all`, `Promise.race`, `connectionIds.map`, `fail`, `import`, `livePeers.map`, `locks.some`, `prisma.agent.count`, `prisma.agent.findFirst`, `readRows`, `redis.exists`, `redis.lpos`, `verifyOrphan` |
| `verifyLeverageIntent` | [113](../../meu_frontend/src/features/exchange/server/recover-execution.ts#L113) | `Number.isSafeInteger`, `agent.market.symbols.some`, `cryptoEntryMarket`, `exchange.fetchMarginMode`, `fail`, `fetchCryptoLeverage`, `validateCryptoStrategy`, `validateSizingPolicy` |

<a id="file-91599ec511d1"></a>

## meu_frontend/src/features/exchange/server/router.ts

[meu_frontend/src/features/exchange/server/router.ts](../../meu_frontend/src/features/exchange/server/router.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../../../../../meu/schedulerService/src/brokers/crypto/cryptoAccount` | [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886) |
| `./execution-account` | [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a) |
| `./reconciliation` | [meu_frontend/src/features/exchange/server/reconciliation.ts](#file-d0180098de88) |
| `./recover-execution` | [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f) |
| `@/features/markets/server/catalog` | [meu_frontend/src/features/markets/server/catalog.ts](#file-caa7eb406200) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/lib/encryption` | [meu_frontend/src/lib/encryption.ts](#file-fadfe6773757) |
| `@/lib/kite` | [meu_frontend/src/lib/kite.ts](#file-e4ebd94e8111) |
| `@/trpc/init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |

### Imported by

- [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195)

External or unresolved imports: `@trpc/server`, `node:crypto`, `zod`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `redactExchange` | [15](../../meu_frontend/src/features/exchange/server/router.ts#L15) | — |
| `label` | [189](../../meu_frontend/src/features/exchange/server/router.ts#L189) | `agents.find` |

<a id="file-3ad2ca352d6e"></a>

## meu_frontend/src/features/help/components/help-workspace.tsx

[meu_frontend/src/features/help/components/help-workspace.tsx](../../meu_frontend/src/features/help/components/help-workspace.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/input` | [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3) |

### Imported by

- [meu_frontend/src/app/(dashboard)/help/page.tsx](#file-6143dc6a7c8f)

External or unresolved imports: `lucide-react`, `next/link`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `HelpWorkspace` | [252](../../meu_frontend/src/features/help/components/help-workspace.tsx#L252) | `query.trim`, `useEffect`, `useMemo`, `useRef`, `useState`, `visible.map` |
| `update` | [263](../../meu_frontend/src/features/help/components/help-workspace.tsx#L263) | `root.getBoundingClientRect`, `section.getBoundingClientRect`, `setActiveId` |
| `schedule` | [275](../../meu_frontend/src/features/help/components/help-workspace.tsx#L275) | `requestAnimationFrame` |

<a id="file-1ecde0d5ac74"></a>

## meu_frontend/src/features/markets/components/ticker-picker.tsx

[meu_frontend/src/features/markets/components/ticker-picker.tsx](../../meu_frontend/src/features/markets/components/ticker-picker.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/command` | [meu_frontend/src/components/ui/command.tsx](#file-f880b52c3559) |
| `@/components/ui/popover` | [meu_frontend/src/components/ui/popover.tsx](#file-ee0b115629d8) |
| `@/components/ui/skeleton` | [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)

External or unresolved imports: `@tanstack/react-query`, `lucide-react`, `react`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-caa7eb406200"></a>

## meu_frontend/src/features/markets/server/catalog.ts

[meu_frontend/src/features/markets/server/catalog.ts](../../meu_frontend/src/features/markets/server/catalog.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/lib/encryption` | [meu_frontend/src/lib/encryption.ts](#file-fadfe6773757) |
| `@/lib/kite` | [meu_frontend/src/lib/kite.ts](#file-e4ebd94e8111) |

### Imported by

- [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa)
- [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1)

External or unresolved imports: `@trpc/server`, `ccxt`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `normalize` | [17](../../meu_frontend/src/features/markets/server/catalog.ts#L17) | `text.toLowerCase` |
| `positive` | [18](../../meu_frontend/src/features/markets/server/catalog.ts#L18) | `Number`, `Number.isFinite` |
| `parseInstrumentCsv` | [21](../../meu_frontend/src/features/markets/server/catalog.ts#L21) | `cell.replace`, `row.push`, `row.some`, `rows.map`, `rows.push`, `rows.shift` |
| `kiteMarkets` | [43](../../meu_frontend/src/features/markets/server/catalog.ts#L43) | `AbortSignal.timeout`, `decoder.decode`, `decryptSecret`, `fetch`, `parseInstrumentCsv`, `reader.cancel`, `reader.read`, `response.body.getReader` |
| `cryptoMarkets` | [59](../../meu_frontend/src/features/markets/server/catalog.ts#L59) | `Object.values`, `choices.push`, `exchange.loadMarkets`, `exchange.setSandboxMode`, `positive` |
| `loadMarketCatalog` | [79](../../meu_frontend/src/features/markets/server/catalog.ts#L79) | `Boolean`, `Date.now`, `Object.hasOwn`, `cached.delete`, `cached.get`, `connection.name.toUpperCase`, `isKiteTokenFresh`, `pending.get`, `pending.set`, `prisma.exchange.findFirst` |
| `searchMarkets` | [111](../../meu_frontend/src/features/markets/server/catalog.ts#L111) | `catalog.markets.filter`, `matches.slice`, `matches.sort`, `normalize` |
| `score` | [115](../../meu_frontend/src/features/markets/server/catalog.ts#L115) | `normalize` |
| `assertMarketSymbols` | [120](../../meu_frontend/src/features/markets/server/catalog.ts#L120) | `catalog.markets.find`, `loadMarketCatalog`, `selected.add`, `selected.has` |

<a id="file-69429fa545c9"></a>

## meu_frontend/src/features/notifications/components/NotificationView.tsx

[meu_frontend/src/features/notifications/components/NotificationView.tsx](../../meu_frontend/src/features/notifications/components/NotificationView.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-notifications` | [meu_frontend/src/features/notifications/hooks/use-notifications.ts](#file-c84e6c94eb3d) |
| `@/components/ui/badge` | [meu_frontend/src/components/ui/badge.tsx](#file-96008f791b5c) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/card` | [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91) |
| `@/components/ui/separator` | [meu_frontend/src/components/ui/separator.tsx](#file-53a723ab88ef) |

### Imported by

- [meu_frontend/src/app/(dashboard)/notifications/[notificationId]/page.tsx](#file-5150ab73d730)

External or unresolved imports: `date-fns`, `framer-motion`, `lucide-react`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `visible` | [27](../../meu_frontend/src/features/notifications/components/NotificationView.tsx#L27) | — |
| `NotificationDetailView` | [54](../../meu_frontend/src/features/notifications/components/NotificationView.tsx#L54) | `JSON.parse`, `format`, `formatDistanceToNow`, `renderValue`, `useEffect`, `useMarkAsRead`, `useSuspenseNotification` |
| `handleMarkAsRead` | [77](../../meu_frontend/src/features/notifications/components/NotificationView.tsx#L77) | `markAsRead.mutate` |
| `renderValue` | [81](../../meu_frontend/src/features/notifications/components/NotificationView.tsx#L81) | `Array.isArray`, `Date.parse`, `Number.isFinite`, `Object.entries`, `String`, `value.join` |

<a id="file-660ac2be4da1"></a>

## meu_frontend/src/features/notifications/components/notification-bell.tsx

[meu_frontend/src/features/notifications/components/notification-bell.tsx](../../meu_frontend/src/features/notifications/components/notification-bell.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-notifications` | [meu_frontend/src/features/notifications/hooks/use-notifications.ts](#file-c84e6c94eb3d) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/components/ui/popover` | [meu_frontend/src/components/ui/popover.tsx](#file-ee0b115629d8) |
| `@/components/ui/scroll-area` | [meu_frontend/src/components/ui/scroll-area.tsx](#file-4cf97c5b3cd2) |

### Imported by

- [meu_frontend/src/components/appHeader.tsx](#file-0f4a984bf6aa)

External or unresolved imports: `date-fns`, `lucide-react`, `next/link`, `next/navigation`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `NotificationBell` | [37](../../meu_frontend/src/features/notifications/components/notification-bell.tsx#L37) | `unread.map`, `useMarkAllAsRead`, `useRouter`, `useUnreadNotifications` |

<a id="file-11d66e1b38b9"></a>

## meu_frontend/src/features/notifications/components/notification-watcher.tsx

[meu_frontend/src/features/notifications/components/notification-watcher.tsx](../../meu_frontend/src/features/notifications/components/notification-watcher.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-browser-notifications` | [meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts](#file-1f343c494dac) |
| `../hooks/use-notifications` | [meu_frontend/src/features/notifications/hooks/use-notifications.ts](#file-c84e6c94eb3d) |

### Imported by

- [meu_frontend/src/app/(dashboard)/layout.tsx](#file-dcdce6cb6d1f)

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `NotificationWatcher` | [10](../../meu_frontend/src/features/notifications/components/notification-watcher.tsx#L10) | `useEffect`, `useNotificationUpdates`, `useRef`, `useUnreadNotifications` |

<a id="file-7f59b6fb5baf"></a>

## meu_frontend/src/features/notifications/components/notifications.tsx

[meu_frontend/src/features/notifications/components/notifications.tsx](../../meu_frontend/src/features/notifications/components/notifications.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../hooks/use-notifications` | [meu_frontend/src/features/notifications/hooks/use-notifications.ts](#file-c84e6c94eb3d) |
| `@/components/entityComponents` | [meu_frontend/src/components/entityComponents/index.ts](#file-c5798052126a) |
| `@/components/ui/alert-dialog` | [meu_frontend/src/components/ui/alert-dialog.tsx](#file-ed34d47c4dac) |
| `@/components/ui/button` | [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7) |
| `@/lib/utils` | [meu_frontend/src/lib/utils.ts](#file-130a50dc24d7) |

### Imported by

- [meu_frontend/src/app/(dashboard)/notifications/page.tsx](#file-af888a812245)

External or unresolved imports: `date-fns`, `lucide-react`, `next/navigation`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `NotificationsPage` | [26](../../meu_frontend/src/features/notifications/components/notifications.tsx#L26) | `buttonVariants`, `useDeleteAllNotifications`, `useMarkAllAsRead`, `useNotifications`, `useRemoveNotifications`, `useRouter`, `useState`, `useUnreadNotifications` |
| `handleSearch` | [39](../../meu_frontend/src/features/notifications/components/notifications.tsx#L39) | `setPage`, `setSearch` |
| `handlePageChange` | [44](../../meu_frontend/src/features/notifications/components/notifications.tsx#L44) | `setPage` |
| `getTypeConfig` | [48](../../meu_frontend/src/features/notifications/components/notifications.tsx#L48) | — |
| `onSuccess` | [106](../../meu_frontend/src/features/notifications/components/notifications.tsx#L106) | `setDeleteDialogOpen`, `setPage`, `setSearch` |

<a id="file-1f343c494dac"></a>

## meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts

[meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/client-error-report` | [meu_frontend/src/lib/client-error-report.ts](#file-eea9cb8bcbfc) |

### Imported by

- [meu_frontend/src/app/(dashboard)/settings/page.tsx](#file-c6b71346cae2)
- [meu_frontend/src/components/appSidebar.tsx](#file-60b41959bf0a)
- [meu_frontend/src/features/notifications/components/notification-watcher.tsx](#file-11d66e1b38b9)

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `emitPermissionChange` | [11](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L11) | `permissionListeners.forEach` |
| `emitEnabledChange` | [13](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L13) | `enabledListeners.forEach` |
| `subscribe` | [16](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L16) | `enabledListeners.add`, `permissionListeners.add` |
| `getPermissionSnapshot` | [25](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L25) | — |
| `getPermissionServerSnapshot` | [32](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L32) | — |
| `isBrowserNotificationsEnabled` | [36](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L36) | `window.localStorage.getItem` |
| `urlBase64ToUint8Array` | [41](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L41) | `raw.charCodeAt`, `window.atob` |
| `registerPushSubscription` | [53](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L53) | `JSON.stringify`, `fetch`, `navigator.serviceWorker.register`, `registration.pushManager.getSubscription`, `registration.pushManager.subscribe`, `reportClientError`, `subscription.toJSON`, `urlBase64ToUint8Array` |
| `unregisterPushSubscription` | [80](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L80) | `encodeURIComponent`, `fetch`, `navigator.serviceWorker.getRegistration`, `registration?.pushManager.getSubscription`, `reportClientError`, `subscription.unsubscribe` |
| `getEnabledServerSnapshot` | [97](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L97) | — |
| `useBrowserNotificationPermission` | [101](../../meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts#L101) | `useCallback`, `useSyncExternalStore` |

<a id="file-c84e6c94eb3d"></a>

## meu_frontend/src/features/notifications/hooks/use-notifications.ts

[meu_frontend/src/features/notifications/hooks/use-notifications.ts](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/client-error-report` | [meu_frontend/src/lib/client-error-report.ts](#file-eea9cb8bcbfc) |
| `@/trpc/client` | [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16) |

### Imported by

- [meu_frontend/src/components/appSidebar.tsx](#file-60b41959bf0a)
- [meu_frontend/src/features/notifications/components/NotificationView.tsx](#file-69429fa545c9)
- [meu_frontend/src/features/notifications/components/notification-bell.tsx](#file-660ac2be4da1)
- [meu_frontend/src/features/notifications/components/notification-watcher.tsx](#file-11d66e1b38b9)
- [meu_frontend/src/features/notifications/components/notifications.tsx](#file-7f59b6fb5baf)

External or unresolved imports: `@tanstack/react-query`, `@trpc/tanstack-react-query`, `sonner`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `useNotifications` | [13](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L13) | `trpc.notifications.getAll.queryOptions`, `useQuery`, `useTRPC` |
| `useNotificationUpdates` | [34](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L34) | `trpc.notifications.onUpdate.subscriptionOptions`, `useQueryClient`, `useSubscription`, `useTRPC` |
| `onData` | [39](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L39) | `queryClient.invalidateQueries`, `trpc.notifications.getAll.queryKey`, `trpc.notifications.getUnread.queryKey` |
| `onError` | [47](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L47) | `reportClientError` |
| `useUnreadNotifications` | [52](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L52) | `trpc.notifications.getUnread.queryOptions`, `useQuery`, `useTRPC` |
| `useSuspenseNotification` | [63](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L63) | `trpc.notifications.getOne.queryOptions`, `useSuspenseQuery`, `useTRPC` |
| `useRemoveNotifications` | [70](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L70) | `trpc.notifications.delete.mutationOptions`, `useMutation`, `useQueryClient`, `useTRPC` |
| `onSuccess` | [75](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L75) | `queryClient.invalidateQueries`, `toast.success`, `trpc.notifications.getAll.queryOptions`, `trpc.notifications.getUnread.queryOptions` |
| `onError` | [84](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L84) | `toast.error` |
| `useMarkAsRead` | [91](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L91) | `trpc.notifications.markAsRead.mutationOptions`, `useMutation`, `useQueryClient`, `useTRPC` |
| `onSuccess` | [96](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L96) | `queryClient.invalidateQueries`, `trpc.notifications.getAll.queryOptions`, `trpc.notifications.getUnread.queryOptions` |
| `onError` | [104](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L104) | `toast.error` |
| `useMarkAllAsRead` | [111](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L111) | `trpc.notifications.markAllRead.mutationOptions`, `useMutation`, `useQueryClient`, `useTRPC` |
| `onSuccess` | [116](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L116) | `queryClient.invalidateQueries`, `toast.success`, `trpc.notifications.getAll.queryOptions`, `trpc.notifications.getUnread.queryOptions` |
| `onError` | [125](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L125) | `toast.error` |
| `useDeleteAllNotifications` | [132](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L132) | `trpc.notifications.deleteAll.mutationOptions`, `useMutation`, `useQueryClient`, `useTRPC` |
| `onSuccess` | [136](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L136) | `Promise.all`, `queryClient.invalidateQueries`, `toast.success`, `trpc.notifications.getAll.queryKey`, `trpc.notifications.getOne.queryKey`, `trpc.notifications.getUnread.queryKey` |
| `onError` | [144](../../meu_frontend/src/features/notifications/hooks/use-notifications.ts#L144) | `toast.error` |

<a id="file-6674456ea0f0"></a>

## meu_frontend/src/features/notifications/server/router.ts

[meu_frontend/src/features/notifications/server/router.ts](../../meu_frontend/src/features/notifications/server/router.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/generated/prisma/enums` | [meu_frontend/src/generated/prisma/enums.ts](../../meu_frontend/src/generated/prisma/enums.ts) |
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/lib/notification-events` | [meu_frontend/src/lib/notification-events.ts](#file-205cdec58c8d) |
| `@/trpc/init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |

### Imported by

- [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195)

External or unresolved imports: `zod`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-2d0a959134b6"></a>

## meu_frontend/src/features/settings/server/router.ts

[meu_frontend/src/features/settings/server/router.ts](../../meu_frontend/src/features/settings/server/router.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `@/trpc/init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |

### Imported by

- [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195)

External or unresolved imports: `zod`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-2ac5bd1a5826"></a>

## meu_frontend/src/hooks/use-mobile.ts

[meu_frontend/src/hooks/use-mobile.ts](../../meu_frontend/src/hooks/use-mobile.ts)

### Imported by

- [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76)

External or unresolved imports: `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `useIsMobile` | [5](../../meu_frontend/src/hooks/use-mobile.ts#L5) | `React.useEffect`, `React.useState` |
| `onChange` | [10](../../meu_frontend/src/hooks/use-mobile.ts#L10) | `setIsMobile` |

<a id="file-c0e3f54a8a6d"></a>

## meu_frontend/src/instrumentation.ts

[meu_frontend/src/instrumentation.ts](../../meu_frontend/src/instrumentation.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/notification-events` | [meu_frontend/src/lib/notification-events.ts](#file-205cdec58c8d) |

External or unresolved imports: `mongodb`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `startNotificationWatcher` | [5](../../meu_frontend/src/instrumentation.ts#L5) | `client.close`, `client.connect`, `console.error`, `setTimeout`, `watch` |
| `watch` | [20](../../meu_frontend/src/instrumentation.ts#L20) | `client.db`, `stream.on` |
| `reconnect` | [22](../../meu_frontend/src/instrumentation.ts#L22) | `Math.min`, `retry.unref`, `setTimeout`, `stream.close` |
| `register` | [40](../../meu_frontend/src/instrumentation.ts#L40) | `startNotificationWatcher` |

<a id="file-cf2ad0523213"></a>

## meu_frontend/src/lib/app-logger.ts

[meu_frontend/src/lib/app-logger.ts](../../meu_frontend/src/lib/app-logger.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/log-safety` | [meu_frontend/src/lib/log-safety.ts](#file-8763257ce406) |

### Imported by

- [meu_frontend/src/app/api/client-errors/route.ts](#file-996af6889829)
- [meu_frontend/src/app/api/exchange/[id]/route.ts](#file-8c016e19d984)
- [meu_frontend/src/app/api/push/subscribe/route.ts](#file-9b8b767a7f1d)
- [meu_frontend/src/app/api/trpc/[trpc]/route.ts](#file-45fb100e52b8)
- [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)
- [meu_frontend/src/lib/config.ts](#file-217ac8c08a1d)
- [meu_frontend/src/lib/kite.ts](#file-e4ebd94e8111)
- [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3)

External or unresolved imports: `node:crypto`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `newRequestId` | [7](../../meu_frontend/src/lib/app-logger.ts#L7) | `randomUUID` |
| `appLog` | [11](../../meu_frontend/src/lib/app-logger.ts#L11) | `JSON.stringify`, `Math.max`, `Math.round`, `Number.isFinite`, `Number.isInteger`, `console.error`, `console.info`, `console.warn`, `isRequestId` |

<a id="file-a6e64c486914"></a>

## meu_frontend/src/lib/auth-client.ts

[meu_frontend/src/lib/auth-client.ts](../../meu_frontend/src/lib/auth-client.ts)

### Imported by

- [meu_frontend/src/components/appHeader.tsx](#file-0f4a984bf6aa)
- [meu_frontend/src/components/appSidebar.tsx](#file-60b41959bf0a)
- [meu_frontend/src/components/login.tsx](#file-b650cf92caec)
- [meu_frontend/src/components/signup.tsx](#file-5cb998c8a647)
- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)

External or unresolved imports: `better-auth/react`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-efa6d7b5ecdb"></a>

## meu_frontend/src/lib/auth-utils.ts

[meu_frontend/src/lib/auth-utils.ts](../../meu_frontend/src/lib/auth-utils.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./auth` | [meu_frontend/src/lib/auth.ts](#file-88f27c02508d) |

### Imported by

- [meu_frontend/src/app/(auth)/login/page.tsx](#file-8418dee91050)
- [meu_frontend/src/app/(auth)/signup/page.tsx](#file-d7cb34fa9ca0)
- [meu_frontend/src/app/(dashboard)/agents/[agentId]/edit/page.tsx](#file-313c27dc4df3)
- [meu_frontend/src/app/(dashboard)/agents/[agentId]/page.tsx](#file-6903106b05fd)
- [meu_frontend/src/app/(dashboard)/agents/create/page.tsx](#file-5b7fe1f94a73)
- [meu_frontend/src/app/(dashboard)/agents/page.tsx](#file-968870bfc4bb)
- [meu_frontend/src/app/(dashboard)/charts/page.tsx](#file-67b8a16fdcc7)
- [meu_frontend/src/app/(dashboard)/credentials/[credentialId]/edit/page.tsx](#file-052bcf1e24b9)
- [meu_frontend/src/app/(dashboard)/credentials/create/page.tsx](#file-dbffdf68cab5)
- [meu_frontend/src/app/(dashboard)/credentials/page.tsx](#file-a7babf3707cc)
- [meu_frontend/src/app/(dashboard)/dashboard/page.tsx](#file-eff5f999ef04)
- [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/edit/page.tsx](#file-713bcbfecf18)
- [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/reconciliation/page.tsx](#file-b387ed1faddf)
- [meu_frontend/src/app/(dashboard)/exchanges/create/page.tsx](#file-04b1ab4df132)
- [meu_frontend/src/app/(dashboard)/exchanges/page.tsx](#file-dbb98e596cb7)
- [meu_frontend/src/app/(dashboard)/help/page.tsx](#file-6143dc6a7c8f)
- [meu_frontend/src/app/(dashboard)/notifications/[notificationId]/page.tsx](#file-5150ab73d730)
- [meu_frontend/src/app/(dashboard)/notifications/page.tsx](#file-af888a812245)
- [meu_frontend/src/app/(dashboard)/strategies/page.tsx](#file-833f53dd6014)

External or unresolved imports: `next/headers`, `next/navigation`, `react`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `requireAuth` | [14](../../meu_frontend/src/lib/auth-utils.ts#L14) | `getSession`, `redirect` |
| `requireNoAuth` | [24](../../meu_frontend/src/lib/auth-utils.ts#L24) | `getSession`, `redirect` |

<a id="file-88f27c02508d"></a>

## meu_frontend/src/lib/auth.ts

[meu_frontend/src/lib/auth.ts](../../meu_frontend/src/lib/auth.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |

### Imported by

- [meu_frontend/src/app/api/auth/[...all]/route.ts](#file-77ec7a0ab574)
- [meu_frontend/src/app/api/client-errors/route.ts](#file-996af6889829)
- [meu_frontend/src/app/api/exchange/[id]/route.ts](#file-8c016e19d984)
- [meu_frontend/src/app/api/push/subscribe/route.ts](#file-9b8b767a7f1d)
- [meu_frontend/src/lib/auth-utils.ts](#file-efa6d7b5ecdb)
- [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3)

External or unresolved imports: `better-auth`, `better-auth/adapters/prisma`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-eea9cb8bcbfc"></a>

## meu_frontend/src/lib/client-error-report.ts

[meu_frontend/src/lib/client-error-report.ts](../../meu_frontend/src/lib/client-error-report.ts)

### Imported by

- [meu_frontend/src/app/(dashboard)/error.tsx](#file-590cbaa3d7b3)
- [meu_frontend/src/components/LoggedErrorBoundary.tsx](#file-f8a6e3de084a)
- [meu_frontend/src/components/ui-settings.tsx](#file-10bad29dc90f)
- [meu_frontend/src/features/notifications/hooks/use-browser-notifications.ts](#file-1f343c494dac)
- [meu_frontend/src/features/notifications/hooks/use-notifications.ts](#file-c84e6c94eb3d)
- [meu_frontend/src/trpc/query-client.ts](#file-f3f53cdac28e)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `reportClientError` | [9](../../meu_frontend/src/lib/client-error-report.ts#L9) | `Date.now`, `JSON.stringify`, `fetch`, `recentReports.delete`, `recentReports.get`, `recentReports.set` |

<a id="file-6d8ab70e2e1a"></a>

## meu_frontend/src/lib/client-error-validation.ts

[meu_frontend/src/lib/client-error-validation.ts](../../meu_frontend/src/lib/client-error-validation.ts)

### Imported by

- [meu_frontend/src/app/api/client-errors/route.ts](#file-996af6889829)
- [meu_frontend/src/app/api/push/subscribe/route.ts](#file-9b8b767a7f1d)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `parseClientReport` | [12](../../meu_frontend/src/lib/client-error-validation.ts#L12) | `Array.isArray`, `Object.hasOwn` |
| `readBoundedJsonBody` | [22](../../meu_frontend/src/lib/client-error-validation.ts#L22) | `JSON.parse`, `decoder.decode`, `reader.cancel`, `reader.read`, `reader.releaseLock`, `req.body?.getReader` |

<a id="file-217ac8c08a1d"></a>

## meu_frontend/src/lib/config.ts

[meu_frontend/src/lib/config.ts](../../meu_frontend/src/lib/config.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `./db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `./encryption` | [meu_frontend/src/lib/encryption.ts](#file-fadfe6773757) |
| `./kite` | [meu_frontend/src/lib/kite.ts](#file-e4ebd94e8111) |

### Imported by

- [meu_frontend/src/app/api/exchange/[id]/route.ts](#file-8c016e19d984)
- [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195)

External or unresolved imports: `@trpc/server`, `ccxt`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `getExchangeData` | [21](../../meu_frontend/src/lib/config.ts#L21) | `appLog`, `decryptSecret`, `exchange.fetchBalance`, `exchange.fetchMyTrades`, `exchange.fetchPositions`, `exchange.setSandboxMode`, `exchangeData.name.toUpperCase`, `getKiteDashboardData`, `isZerodhaExchange`, `positions.map`, `prisma.exchange.findUnique` |

<a id="file-79fe743e2bb6"></a>

## meu_frontend/src/lib/db.ts

[meu_frontend/src/lib/db.ts](../../meu_frontend/src/lib/db.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/generated/prisma/client` | [meu_frontend/src/generated/prisma/client.ts](../../meu_frontend/src/generated/prisma/client.ts) |

### Imported by

- [meu_frontend/src/app/api/push/subscribe/route.ts](#file-9b8b767a7f1d)
- [meu_frontend/src/features/agents/server/edit-crypto-agent.ts](#file-5129a594abff)
- [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3)
- [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2)
- [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)
- [meu_frontend/src/features/backtests/server/router.ts](#file-077c1fd7ba8c)
- [meu_frontend/src/features/charts/server/router.ts](#file-f9d982eae1de)
- [meu_frontend/src/features/credentials/server/models.ts](#file-2d782da7bfbc)
- [meu_frontend/src/features/credentials/server/router.ts](#file-5813a830e726)
- [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a)
- [meu_frontend/src/features/exchange/server/reconciliation.ts](#file-d0180098de88)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)
- [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1)
- [meu_frontend/src/features/markets/server/catalog.ts](#file-caa7eb406200)
- [meu_frontend/src/features/notifications/server/router.ts](#file-6674456ea0f0)
- [meu_frontend/src/features/settings/server/router.ts](#file-2d0a959134b6)
- [meu_frontend/src/lib/auth.ts](#file-88f27c02508d)
- [meu_frontend/src/lib/config.ts](#file-217ac8c08a1d)
- [meu_frontend/src/lib/kite.ts](#file-e4ebd94e8111)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-fadfe6773757"></a>

## meu_frontend/src/lib/encryption.ts

[meu_frontend/src/lib/encryption.ts](../../meu_frontend/src/lib/encryption.ts)

### Imported by

- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)
- [meu_frontend/src/features/credentials/server/models.ts](#file-2d782da7bfbc)
- [meu_frontend/src/features/credentials/server/router.ts](#file-5813a830e726)
- [meu_frontend/src/features/exchange/server/execution-account.ts](#file-3b174aa1243a)
- [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1)
- [meu_frontend/src/features/markets/server/catalog.ts](#file-caa7eb406200)
- [meu_frontend/src/lib/config.ts](#file-217ac8c08a1d)
- [meu_frontend/src/lib/kite.ts](#file-e4ebd94e8111)

External or unresolved imports: `node:crypto`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `key` | [4](../../meu_frontend/src/lib/encryption.ts#L4) | `Buffer.from` |
| `encryptSecret` | [11](../../meu_frontend/src/lib/encryption.ts#L11) | `Buffer.concat`, `cipher.final`, `cipher.getAuthTag`, `cipher.update`, `createCipheriv`, `key`, `randomBytes` |
| `decryptSecret` | [17](../../meu_frontend/src/lib/encryption.ts#L17) | `Buffer.concat`, `createDecipheriv`, `decipher.final`, `decipher.setAuthTag`, `decipher.update`, `key`, `parts.map`, `value.slice`, `value.startsWith` |

<a id="file-e4ebd94e8111"></a>

## meu_frontend/src/lib/kite.ts

[meu_frontend/src/lib/kite.ts](../../meu_frontend/src/lib/kite.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `./db` | [meu_frontend/src/lib/db.ts](#file-79fe743e2bb6) |
| `./encryption` | [meu_frontend/src/lib/encryption.ts](#file-fadfe6773757) |

### Imported by

- [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1)
- [meu_frontend/src/features/markets/server/catalog.ts](#file-caa7eb406200)
- [meu_frontend/src/lib/config.ts](#file-217ac8c08a1d)

External or unresolved imports: `ccxt`, `crypto`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `isZerodhaExchange` | [20](../../meu_frontend/src/lib/kite.ts#L20) | — |
| `istDateKey` | [25](../../meu_frontend/src/lib/kite.ts#L25) | — |
| `isKiteTokenFresh` | [35](../../meu_frontend/src/lib/kite.ts#L35) | `istDateKey` |
| `kiteLoginUrl` | [43](../../meu_frontend/src/lib/kite.ts#L43) | — |
| `kiteGet` | [57](../../meu_frontend/src/lib/kite.ts#L57) | `AbortSignal.timeout`, `decryptSecret`, `fetch`, `res.json` |
| `exchangeKiteRequestToken` | [76](../../meu_frontend/src/lib/kite.ts#L76) | `AbortSignal.timeout`, `decryptSecret`, `encryptSecret`, `fetch`, `isZerodhaExchange`, `prisma.exchange.findFirst`, `prisma.exchange.update`, `res.json` |
| `getKiteDashboardData` | [152](../../meu_frontend/src/lib/kite.ts#L152) | `appLog`, `decryptSecret`, `isKiteTokenFresh`, `kiteGet`, `kiteLoginUrl`, `prisma.exchange.findFirst` |

<a id="file-8763257ce406"></a>

## meu_frontend/src/lib/log-safety.ts

[meu_frontend/src/lib/log-safety.ts](../../meu_frontend/src/lib/log-safety.ts)

### Imported by

- [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `isRequestId` | [57](../../meu_frontend/src/lib/log-safety.ts#L57) | `Boolean` |
| `safeLogCode` | [61](../../meu_frontend/src/lib/log-safety.ts#L61) | `logCodes.has` |
| `safeProcedureName` | [65](../../meu_frontend/src/lib/log-safety.ts#L65) | `procedureNames.has` |

<a id="file-205cdec58c8d"></a>

## meu_frontend/src/lib/notification-events.ts

[meu_frontend/src/lib/notification-events.ts](../../meu_frontend/src/lib/notification-events.ts)

### Imported by

- [meu_frontend/src/features/notifications/server/router.ts](#file-6674456ea0f0)
- [meu_frontend/src/instrumentation.ts](#file-c0e3f54a8a6d)

External or unresolved imports: `events`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `emitter` | [3](../../meu_frontend/src/lib/notification-events.ts#L3) | — |
| `emitNotificationChange` | [7](../../meu_frontend/src/lib/notification-events.ts#L7) | `emitter` |
| `getNotificationVersion` | [11](../../meu_frontend/src/lib/notification-events.ts#L11) | — |
| `notificationIterator` | [12](../../meu_frontend/src/lib/notification-events.ts#L12) | `emitter`, `signal?.addEventListener`, `signal?.removeEventListener` |
| `onChange` | [16](../../meu_frontend/src/lib/notification-events.ts#L16) | `wake` |
| `onAbort` | [21](../../meu_frontend/src/lib/notification-events.ts#L21) | `wake` |

<a id="file-c82bb8b2781e"></a>

## meu_frontend/src/lib/push-validation.ts

[meu_frontend/src/lib/push-validation.ts](../../meu_frontend/src/lib/push-validation.ts)

### Imported by

- [meu_frontend/src/app/api/push/subscribe/route.ts](#file-9b8b767a7f1d)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `validPushEndpoint` | [1](../../meu_frontend/src/lib/push-validation.ts#L1) | `host.endsWith` |
| `validPushKeys` | [11](../../meu_frontend/src/lib/push-validation.ts#L11) | `decoded` |
| `decoded` | [12](../../meu_frontend/src/lib/push-validation.ts#L12) | `Buffer.from`, `bytes.toString`, `value.replace` |

<a id="file-130a50dc24d7"></a>

## meu_frontend/src/lib/utils.ts

[meu_frontend/src/lib/utils.ts](../../meu_frontend/src/lib/utils.ts)

### Imported by

- [meu_frontend/src/app/(dashboard)/settings/page.tsx](#file-c6b71346cae2)
- [meu_frontend/src/components/entityComponents/Empty.tsx](#file-e1341d0db420)
- [meu_frontend/src/components/entityComponents/EntityAvatar.tsx](#file-d9686ce9473d)
- [meu_frontend/src/components/entityComponents/EntityBadge.tsx](#file-09f652494ac0)
- [meu_frontend/src/components/entityComponents/EntityContainer.tsx](#file-c50e046c4d82)
- [meu_frontend/src/components/entityComponents/EntityItem.tsx](#file-ab7840c4ffc7)
- [meu_frontend/src/components/entityComponents/EntityList.tsx](#file-51b6547cb94e)
- [meu_frontend/src/components/entityComponents/EntitySearch.tsx](#file-ea60ae8d3698)
- [meu_frontend/src/components/meu-logo.tsx](#file-6af34cce3d3d)
- [meu_frontend/src/components/password-input.tsx](#file-392b4a261058)
- [meu_frontend/src/components/ui/accordion.tsx](#file-eff37b7f84f0)
- [meu_frontend/src/components/ui/alert-dialog.tsx](#file-ed34d47c4dac)
- [meu_frontend/src/components/ui/alert.tsx](#file-4b3b987cd573)
- [meu_frontend/src/components/ui/avatar.tsx](#file-e322d48e8673)
- [meu_frontend/src/components/ui/badge.tsx](#file-96008f791b5c)
- [meu_frontend/src/components/ui/breadcrumb.tsx](#file-f311fadbc5f0)
- [meu_frontend/src/components/ui/button-group.tsx](#file-f6c6961b6694)
- [meu_frontend/src/components/ui/button.tsx](#file-caabce9f69f7)
- [meu_frontend/src/components/ui/calendar.tsx](#file-5f2a05aae429)
- [meu_frontend/src/components/ui/card.tsx](#file-a6e3af238d91)
- [meu_frontend/src/components/ui/carousel.tsx](#file-5cbde50d17bf)
- [meu_frontend/src/components/ui/chart.tsx](#file-f34345485153)
- [meu_frontend/src/components/ui/checkbox.tsx](#file-11a7e2a3811d)
- [meu_frontend/src/components/ui/command.tsx](#file-f880b52c3559)
- [meu_frontend/src/components/ui/context-menu.tsx](#file-8230cddfc2c2)
- [meu_frontend/src/components/ui/dialog.tsx](#file-4beaf9ef9641)
- [meu_frontend/src/components/ui/drawer.tsx](#file-f5484344fc4d)
- [meu_frontend/src/components/ui/dropdown-menu.tsx](#file-a909309f87df)
- [meu_frontend/src/components/ui/empty.tsx](#file-81bcf9c30795)
- [meu_frontend/src/components/ui/field.tsx](#file-f4505bee987d)
- [meu_frontend/src/components/ui/form.tsx](#file-2cb2dc7aa932)
- [meu_frontend/src/components/ui/hover-card.tsx](#file-ec8c56a7a926)
- [meu_frontend/src/components/ui/input-group.tsx](#file-527fa4f479a7)
- [meu_frontend/src/components/ui/input-otp.tsx](#file-3a75b4c20de8)
- [meu_frontend/src/components/ui/input.tsx](#file-763a125345f3)
- [meu_frontend/src/components/ui/item.tsx](#file-aa2bd4eb0462)
- [meu_frontend/src/components/ui/kbd.tsx](#file-b21d8d189df5)
- [meu_frontend/src/components/ui/label.tsx](#file-729f4f420ef1)
- [meu_frontend/src/components/ui/menubar.tsx](#file-74314c0f564a)
- [meu_frontend/src/components/ui/navigation-menu.tsx](#file-4a474d0a0863)
- [meu_frontend/src/components/ui/pagination.tsx](#file-56f81f70501f)
- [meu_frontend/src/components/ui/popover.tsx](#file-ee0b115629d8)
- [meu_frontend/src/components/ui/progress.tsx](#file-908f8d4c4daf)
- [meu_frontend/src/components/ui/radio-group.tsx](#file-0962ccbebd06)
- [meu_frontend/src/components/ui/resizable.tsx](#file-ee5d87634e98)
- [meu_frontend/src/components/ui/scroll-area.tsx](#file-4cf97c5b3cd2)
- [meu_frontend/src/components/ui/select.tsx](#file-f8f0016aa124)
- [meu_frontend/src/components/ui/separator.tsx](#file-53a723ab88ef)
- [meu_frontend/src/components/ui/sheet.tsx](#file-91354f28c1fd)
- [meu_frontend/src/components/ui/sidebar.tsx](#file-4ae565dd6d76)
- [meu_frontend/src/components/ui/skeleton.tsx](#file-8fad368dc2d5)
- [meu_frontend/src/components/ui/slider.tsx](#file-0cba7d7b0991)
- [meu_frontend/src/components/ui/spinner.tsx](#file-323294c82ba3)
- [meu_frontend/src/components/ui/switch.tsx](#file-5956445d8878)
- [meu_frontend/src/components/ui/table.tsx](#file-71ac7e7f4274)
- [meu_frontend/src/components/ui/tabs.tsx](#file-2a712ece64d3)
- [meu_frontend/src/components/ui/textarea.tsx](#file-263dd5b6b75d)
- [meu_frontend/src/components/ui/toggle-group.tsx](#file-6d0286bae86d)
- [meu_frontend/src/components/ui/toggle.tsx](#file-d9f27669dfb9)
- [meu_frontend/src/components/ui/tooltip.tsx](#file-696410254fcf)
- [meu_frontend/src/features/agents/components/agent.tsx](#file-3984b831a40c)
- [meu_frontend/src/features/exchange/components/ExchangeDashboard.tsx](#file-020e7b2d2cba)
- [meu_frontend/src/features/exchange/components/portfolio-overview.tsx](#file-71c3b269af63)
- [meu_frontend/src/features/notifications/components/notifications.tsx](#file-7f59b6fb5baf)

External or unresolved imports: `ccxt`, `clsx`, `tailwind-merge`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `cn` | [6](../../meu_frontend/src/lib/utils.ts#L6) | `clsx`, `twMerge` |
| `normalizeTrade` | [10](../../meu_frontend/src/lib/utils.ts#L10) | — |
| `computePnlSeries` | [35](../../meu_frontend/src/lib/utils.ts#L35) | `sorted.map` |

<a id="file-f97f83ba2e16"></a>

## meu_frontend/src/trpc/client.tsx

[meu_frontend/src/trpc/client.tsx](../../meu_frontend/src/trpc/client.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./query-client` | [meu_frontend/src/trpc/query-client.ts](#file-f3f53cdac28e) |
| `./routers/_app` | [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195) |

### Imported by

- [meu_frontend/src/app/layout.tsx](#file-9f5b43d9b9de)
- [meu_frontend/src/components/ui-settings.tsx](#file-10bad29dc90f)
- [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/agents/components/entry-preview.tsx](#file-568e139a6989)
- [meu_frontend/src/features/agents/hooks/use-agent.ts](#file-2750ed7a6002)
- [meu_frontend/src/features/backtests/components/agent-launch.tsx](#file-af786abb6830)
- [meu_frontend/src/features/backtests/components/backtest-price-chart.tsx](#file-33ffc77904e1)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)
- [meu_frontend/src/features/backtests/components/paper-portfolio.tsx](#file-fc0f457d3c6a)
- [meu_frontend/src/features/charts/components/meu-chart-workspace.tsx](#file-b3914f0d1ad2)
- [meu_frontend/src/features/credentials/components/model-picker.tsx](#file-00eb873b472a)
- [meu_frontend/src/features/credentials/hooks/use-credentials.ts](#file-1382f3bd3f99)
- [meu_frontend/src/features/exchange/components/account-execution-panel.tsx](#file-561367eaad9f)
- [meu_frontend/src/features/exchange/components/reconciliation-workspace.tsx](#file-9f41ee2d0004)
- [meu_frontend/src/features/exchange/hooks/use-exchange.ts](#file-40f9c8c0bd38)
- [meu_frontend/src/features/markets/components/ticker-picker.tsx](#file-1ecde0d5ac74)
- [meu_frontend/src/features/notifications/hooks/use-notifications.ts](#file-c84e6c94eb3d)

External or unresolved imports: `@tanstack/react-query`, `@trpc/client`, `@trpc/tanstack-react-query`, `react`, `superjson`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `getQueryClient` | [13](../../meu_frontend/src/trpc/client.tsx#L13) | `makeQueryClient` |
| `getUrl` | [25](../../meu_frontend/src/trpc/client.tsx#L25) | — |
| `makeLinks` | [34](../../meu_frontend/src/trpc/client.tsx#L34) | `getUrl`, `httpBatchLink`, `httpSubscriptionLink`, `splitLink` |
| `condition` | [37](../../meu_frontend/src/trpc/client.tsx#L37) | — |
| `TRPCReactProvider` | [58](../../meu_frontend/src/trpc/client.tsx#L58) | `getQueryClient`, `useState` |

<a id="file-7c41dca4d8b3"></a>

## meu_frontend/src/trpc/init.ts

[meu_frontend/src/trpc/init.ts](../../meu_frontend/src/trpc/init.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/app-logger` | [meu_frontend/src/lib/app-logger.ts](#file-cf2ad0523213) |
| `@/lib/auth` | [meu_frontend/src/lib/auth.ts](#file-88f27c02508d) |

### Imported by

- [meu_frontend/src/app/api/trpc/[trpc]/route.ts](#file-45fb100e52b8)
- [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa)
- [meu_frontend/src/features/backtests/server/router.ts](#file-077c1fd7ba8c)
- [meu_frontend/src/features/charts/server/router.ts](#file-f9d982eae1de)
- [meu_frontend/src/features/credentials/server/router.ts](#file-5813a830e726)
- [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1)
- [meu_frontend/src/features/notifications/server/router.ts](#file-6674456ea0f0)
- [meu_frontend/src/features/settings/server/router.ts](#file-2d0a959134b6)
- [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195)
- [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d)

External or unresolved imports: `@trpc/server`, `next/headers`, `react`, `superjson`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-f3f53cdac28e"></a>

## meu_frontend/src/trpc/query-client.ts

[meu_frontend/src/trpc/query-client.ts](../../meu_frontend/src/trpc/query-client.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `@/lib/client-error-report` | [meu_frontend/src/lib/client-error-report.ts](#file-eea9cb8bcbfc) |

### Imported by

- [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16)
- [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d)

External or unresolved imports: `@tanstack/react-query`, `superjson`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `makeQueryClient` | [9](../../meu_frontend/src/trpc/query-client.ts#L9) | — |
| `onError` | [12](../../meu_frontend/src/trpc/query-client.ts#L12) | `reportClientError` |
| `onError` | [15](../../meu_frontend/src/trpc/query-client.ts#L15) | `reportClientError` |
| `shouldDehydrateQuery` | [23](../../meu_frontend/src/trpc/query-client.ts#L23) | `defaultShouldDehydrateQuery` |

<a id="file-1a19320ef195"></a>

## meu_frontend/src/trpc/routers/_app.ts

[meu_frontend/src/trpc/routers/_app.ts](../../meu_frontend/src/trpc/routers/_app.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `../init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |
| `@/features/agents/server/router` | [meu_frontend/src/features/agents/server/router.ts](#file-82b4c31078aa) |
| `@/features/backtests/server/router` | [meu_frontend/src/features/backtests/server/router.ts](#file-077c1fd7ba8c) |
| `@/features/charts/server/router` | [meu_frontend/src/features/charts/server/router.ts](#file-f9d982eae1de) |
| `@/features/credentials/server/router` | [meu_frontend/src/features/credentials/server/router.ts](#file-5813a830e726) |
| `@/features/exchange/server/router` | [meu_frontend/src/features/exchange/server/router.ts](#file-91599ec511d1) |
| `@/features/notifications/server/router` | [meu_frontend/src/features/notifications/server/router.ts](#file-6674456ea0f0) |
| `@/features/settings/server/router` | [meu_frontend/src/features/settings/server/router.ts](#file-2d0a959134b6) |
| `@/lib/config` | [meu_frontend/src/lib/config.ts](#file-217ac8c08a1d) |

### Imported by

- [meu_frontend/src/app/api/trpc/[trpc]/route.ts](#file-45fb100e52b8)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)
- [meu_frontend/src/trpc/client.tsx](#file-f97f83ba2e16)
- [meu_frontend/src/trpc/server.tsx](#file-01d2fd7b8a5d)

External or unresolved imports: `zod`.

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-01d2fd7b8a5d"></a>

## meu_frontend/src/trpc/server.tsx

[meu_frontend/src/trpc/server.tsx](../../meu_frontend/src/trpc/server.tsx)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./init` | [meu_frontend/src/trpc/init.ts](#file-7c41dca4d8b3) |
| `./query-client` | [meu_frontend/src/trpc/query-client.ts](#file-f3f53cdac28e) |
| `./routers/_app` | [meu_frontend/src/trpc/routers/_app.ts](#file-1a19320ef195) |

### Imported by

- [meu_frontend/src/app/(dashboard)/agents/[agentId]/edit/page.tsx](#file-313c27dc4df3)
- [meu_frontend/src/app/(dashboard)/agents/[agentId]/page.tsx](#file-6903106b05fd)
- [meu_frontend/src/app/(dashboard)/agents/create/page.tsx](#file-5b7fe1f94a73)
- [meu_frontend/src/app/(dashboard)/agents/page.tsx](#file-968870bfc4bb)
- [meu_frontend/src/app/(dashboard)/credentials/[credentialId]/edit/page.tsx](#file-052bcf1e24b9)
- [meu_frontend/src/app/(dashboard)/credentials/page.tsx](#file-a7babf3707cc)
- [meu_frontend/src/app/(dashboard)/dashboard/page.tsx](#file-eff5f999ef04)
- [meu_frontend/src/app/(dashboard)/exchanges/[exchangeId]/edit/page.tsx](#file-713bcbfecf18)
- [meu_frontend/src/app/(dashboard)/exchanges/page.tsx](#file-dbb98e596cb7)
- [meu_frontend/src/app/(dashboard)/notifications/[notificationId]/page.tsx](#file-5150ab73d730)
- [meu_frontend/src/app/(dashboard)/notifications/page.tsx](#file-af888a812245)

External or unresolved imports: `@tanstack/react-query`, `@trpc/tanstack-react-query`, `react`, `server-only`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `HydrateClient` | [17](../../meu_frontend/src/trpc/server.tsx#L17) | `dehydrate`, `getQueryClient` |

<a id="file-60aebedf84e9"></a>

## shared/trading/accountRisk.ts

[shared/trading/accountRisk.ts](../../shared/trading/accountRisk.ts)

### Imported by

- [meu/schedulerService/src/brokers/crypto/cryptoAccount.ts](#file-8c5d1a686886)
- [meu_frontend/src/features/exchange/components/account-execution-panel.tsx](#file-561367eaad9f)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-a654820bbc46"></a>

## shared/trading/brokerCapabilities.ts

[shared/trading/brokerCapabilities.ts](../../shared/trading/brokerCapabilities.ts)

### Imported by

- [meu_frontend/src/features/agents/components/EditAgent.tsx](#file-e3f55dd74ffd)
- [meu_frontend/src/features/agents/components/agent-budget-fields.tsx](#file-4c202d5fe0ed)
- [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98)
- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `brokerCapabilities` | [2](../../shared/trading/brokerCapabilities.ts#L2) | `name.toUpperCase` |

<a id="file-780ed3a879a0"></a>

## shared/trading/delta-data.ts

[shared/trading/delta-data.ts](../../shared/trading/delta-data.ts)

### Imported by

- [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f)
- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu/schedulerService/src/workers/executionFailure.ts](#file-131187bc349f)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)
- [meu_frontend/src/features/backtests/server/delta-data.ts](#file-e9ab06d56b34)

External or unresolved imports: `node:crypto`.

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `fail` | [82](../../shared/trading/delta-data.ts#L82) | — |
| `parseFinite` | [86](../../shared/trading/delta-data.ts#L86) | `Number`, `Number.isFinite`, `value.trim` |
| `details` | [109](../../shared/trading/delta-data.ts#L109) | — |
| `retryDelay` | [113](../../shared/trading/delta-data.ts#L113) | `Date.now`, `Date.parse`, `Math.ceil`, `Math.min`, `Number`, `Number.isFinite`, `response.headers.get` |
| `getJson` | [120](../../shared/trading/delta-data.ts#L120) | `AbortSignal.timeout`, `Date.now`, `JSON.parse`, `Math.max`, `Math.min`, `Number`, `Number.isFinite`, `buffer.set`, `chunks.push`, `fetcher`, `reader.cancel`, `reader.read`, `reader.releaseLock`, `response.body.getReader`, `response.headers.get`, `response?.body?.cancel`, `retryDelay`, `url.pathname.includes` |
| `validateRequest` | [165](../../shared/trading/delta-data.ts#L165) | `Date.now`, `Math.floor`, `Number.isSafeInteger`, `Object.hasOwn`, `fail` |
| `verifyProduct` | [184](../../shared/trading/delta-data.ts#L184) | `fail`, `parseFinite` |
| `parseCandles` | [199](../../shared/trading/delta-data.ts#L199) | `Array.isArray`, `fail`, `rawCandles.map` |
| `loadDeltaBacktestData` | [222](../../shared/trading/delta-data.ts#L222) | `Date.now`, `JSON.stringify`, `Math.floor`, `Math.min`, `String`, `all.push`, `all.sort`, `candles.filter`, `createHash`, `deduped.push`, `encodeURIComponent`, `fail`, `getJson`, `parseCandles`, `url.searchParams.set`, `validateRequest`, `verifyProduct` |

<a id="file-1d7dd8e6da1e"></a>

## shared/trading/emaCrossover.ts

[shared/trading/emaCrossover.ts](../../shared/trading/emaCrossover.ts)

### Imported by

- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu/schedulerService/src/algorithms/emaCrossover.ts](#file-14a300d88a33)
- [meu_frontend/src/features/backtests/chart/analysis.ts](#file-dac1b352656a)
- [meu_frontend/src/features/backtests/server/router.ts](#file-077c1fd7ba8c)
- [shared/trading/paperTrading.ts](#file-39c515f77d12)
- [shared/trading/perpetualBacktest.ts](#file-14821081d1df)
- [shared/trading/strategies.ts](#file-08c346741655)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `validateEmaCrossoverParams` | [22](../../shared/trading/emaCrossover.ts#L22) | `Number.isSafeInteger` |
| `completedCandles` | [29](../../shared/trading/emaCrossover.ts#L29) | `Math.max`, `Math.min`, `candles.filter` |
| `ema` | [43](../../shared/trading/emaCrossover.ts#L43) | `Array`, `values.slice` |
| `crossoverEvents` | [56](../../shared/trading/emaCrossover.ts#L56) | `bars.map`, `ema` |
| `evaluateEmaCrossover` | [74](../../shared/trading/emaCrossover.ts#L74) | `completedCandles`, `crossoverEvents`, `validateEmaCrossoverParams` |
| `runBacktest` | [125](../../shared/trading/emaCrossover.ts#L125) | `Math.max`, `completedCandles`, `crossoverEvents`, `enter`, `equityCurve.at`, `equityCurve.push`, `exit`, `trades.filter`, `validateEmaCrossoverParams` |
| `enter` | [143](../../shared/trading/emaCrossover.ts#L143) | — |
| `exit` | [151](../../shared/trading/emaCrossover.ts#L151) | `trades.push` |

<a id="file-a7506f843f73"></a>

## shared/trading/executionCosts.ts

[shared/trading/executionCosts.ts](../../shared/trading/executionCosts.ts)

### Imported by

- [meu_frontend/src/features/agents/components/createAgent.tsx](#file-849ce7f84952)
- [meu_frontend/src/features/backtests/components/backtest-workspace.tsx](#file-47c93f33e5a4)
- [shared/trading/sizing.ts](#file-864c148ae550)

No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.

<a id="file-6d32b175ded4"></a>

## shared/trading/exitPolicy.ts

[shared/trading/exitPolicy.ts](../../shared/trading/exitPolicy.ts)

### Imported by

- [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f)
- [shared/trading/paperTrading.ts](#file-39c515f77d12)
- [shared/trading/perpetualBacktest.ts](#file-14821081d1df)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `validateExitPolicy` | [20](../../shared/trading/exitPolicy.ts#L20) | `Number.isFinite` |
| `advanceExitProtection` | [34](../../shared/trading/exitPolicy.ts#L34) | `Math.max`, `Math.min`, `validateExitPolicy` |

<a id="file-79c73731e830"></a>

## shared/trading/marketDay.ts

[shared/trading/marketDay.ts](../../shared/trading/marketDay.ts)

### Imported by

- [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c)
- [meu/schedulerService/src/execution/dailyRiskUsage.ts](#file-103be3729f36)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)
- [shared/trading/paperTrading.ts](#file-39c515f77d12)
- [shared/trading/perpetualBacktest.ts](#file-14821081d1df)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `marketDayOffset` | [4](../../shared/trading/marketDay.ts#L4) | — |
| `marketDayIndex` | [10](../../shared/trading/marketDay.ts#L10) | `Math.floor`, `Number.isFinite`, `marketDayOffset` |
| `marketDayStart` | [15](../../shared/trading/marketDay.ts#L15) | `marketDayIndex`, `marketDayOffset` |
| `marketDate` | [19](../../shared/trading/marketDay.ts#L19) | `marketDayIndex` |
| `exchangeMarketTimezone` | [23](../../shared/trading/marketDay.ts#L23) | `exchange.toUpperCase` |

<a id="file-39c515f77d12"></a>

## shared/trading/paperTrading.ts

[shared/trading/paperTrading.ts](../../shared/trading/paperTrading.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./emaCrossover` | [shared/trading/emaCrossover.ts](#file-1d7dd8e6da1e) |
| `./exitPolicy` | [shared/trading/exitPolicy.ts](#file-6d32b175ded4) |
| `./marketDay` | [shared/trading/marketDay.ts](#file-79c73731e830) |
| `./perpetualBacktest` | [shared/trading/perpetualBacktest.ts](#file-14821081d1df) |
| `./sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `./strategies` | [shared/trading/strategies.ts](#file-08c346741655) |

### Imported by

- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu_frontend/src/features/backtests/components/paper-portfolio.tsx](#file-fc0f457d3c6a)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `initializePaperState` | [29](../../shared/trading/paperTrading.ts#L29) | `Number.isFinite`, `Number.isSafeInteger`, `marketDayIndex` |
| `validCandle` | [38](../../shared/trading/paperTrading.ts#L38) | `Math.max`, `Math.min`, `Number.isSafeInteger` |
| `validateInputs` | [44](../../shared/trading/paperTrading.ts#L44) | `Array.isArray`, `Math.abs`, `Math.max`, `Number.isFinite`, `Number.isSafeInteger`, `marketDayOffset`, `position.protectionTimeline.at`, `position.protectionTimeline.some`, `state.usedEntryProposalIds.every`, `validCandle`, `validateExitPolicy` |
| `advancePaperState` | [124](../../shared/trading/paperTrading.ts#L124) | `Math.floor`, `Math.max`, `Math.min`, `Number.isSafeInteger`, `Object.assign`, `advanceExitProtection`, `bootstrap.at`, `candles.filter`, `closePosition`, `decideSimulationEntry`, `marketDayIndex`, `marketDayStart`, `next.history.at`, `next.history.push`, `next.usedEntryProposalIds!.push`, `p.protectionTimeline!.push`, `prepareStrategy`, `sizeAutomaticSimulationEntry`, `state.position.protectionTimeline.map`, `validCandle`, `validateInputs` |
| `closePosition` | [178](../../shared/trading/paperTrading.ts#L178) | `Math.max`, `next.trades.push`, `next.trades.splice`, `p.protectionTimeline.filter` |

<a id="file-14821081d1df"></a>

## shared/trading/perpetualBacktest.ts

[shared/trading/perpetualBacktest.ts](../../shared/trading/perpetualBacktest.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./emaCrossover` | [shared/trading/emaCrossover.ts](#file-1d7dd8e6da1e) |
| `./exitPolicy` | [shared/trading/exitPolicy.ts](#file-6d32b175ded4) |
| `./marketDay` | [shared/trading/marketDay.ts](#file-79c73731e830) |
| `./sizing` | [shared/trading/sizing.ts](#file-864c148ae550) |
| `./strategies` | [shared/trading/strategies.ts](#file-08c346741655) |

### Imported by

- [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f)
- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu_frontend/src/features/backtests/chart/analysis.ts](#file-dac1b352656a)
- [meu_frontend/src/features/backtests/server/router.ts](#file-077c1fd7ba8c)
- [shared/trading/paperTrading.ts](#file-39c515f77d12)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `evaluateMeanReversionEntry` | [54](../../shared/trading/perpetualBacktest.ts#L54) | `Math.abs`, `Math.max`, `Math.min`, `reject` |
| `reject` | [59](../../shared/trading/perpetualBacktest.ts#L59) | — |
| `decideSimulationEntry` | [71](../../shared/trading/perpetualBacktest.ts#L71) | `Math.max`, `Math.min`, `Number.isFinite`, `evaluateMeanReversionEntry`, `input.usedIds.includes`, `sizeAutomaticSimulationEntry`, `sizeEntry`, `skip` |
| `skip` | [78](../../shared/trading/perpetualBacktest.ts#L78) | — |
| `runPerpetualBacktest` | [120](../../shared/trading/perpetualBacktest.ts#L120) | `Math.abs`, `Math.floor`, `Math.max`, `Math.min`, `Number.isFinite`, `Number.isSafeInteger`, `advanceExitProtection`, `bars.at`, `bars.every`, `close`, `decideSimulationEntry`, `equityCurve.push`, `marketDayIndex`, `marketDayOffset`, `p.protectionTimeline!.push`, `prepareStrategy`, `sizeAutomaticSimulationEntry`, `trades.filter`, `trades.reduce`, `usedIds.push`, `validateExitPolicy` |
| `close` | [163](../../shared/trading/perpetualBacktest.ts#L163) | `Math.max`, `trades.push` |

<a id="file-864c148ae550"></a>

## shared/trading/sizing.ts

[shared/trading/sizing.ts](../../shared/trading/sizing.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./executionCosts` | [shared/trading/executionCosts.ts](#file-a7506f843f73) |

### Imported by

- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu/schedulerService/src/brokers/crypto/cryptoRisk.ts](#file-6357ab2b453c)
- [meu/schedulerService/src/execution/tradeGuard.ts](#file-d18977cdf0f6)
- [meu/schedulerService/src/workers/worker.ts](#file-a0f114ee53de)
- [meu_frontend/src/features/agents/components/agent-sizing-fields.tsx](#file-f282a54dea98)
- [meu_frontend/src/features/agents/server/entry-preview.ts](#file-03bf55708ad3)
- [meu_frontend/src/features/agents/server/start-delta-agent.ts](#file-e4e52a8102c4)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)
- [shared/trading/paperTrading.ts](#file-39c515f77d12)
- [shared/trading/perpetualBacktest.ts](#file-14821081d1df)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `validateSizingPolicy` | [23](../../shared/trading/sizing.ts#L23) | `Number.isInteger` |
| `sizeEntry` | [38](../../shared/trading/sizing.ts#L38) | `Math.max`, `Math.min`, `Number.isFinite`, `budgets.indexOf`, `input.roundDown`, `insufficient` |
| `insufficient` | [60](../../shared/trading/sizing.ts#L60) | — |
| `minimumViableLeverage` | [81](../../shared/trading/sizing.ts#L81) | `Number.isSafeInteger`, `fits` |
| `selectAutomaticLeverage` | [88](../../shared/trading/sizing.ts#L88) | `Math.max`, `Number.isSafeInteger`, `sizeCandidate` |
| `sizeAutomaticSimulationEntry` | [111](../../shared/trading/sizing.ts#L111) | `Math.max`, `selectAutomaticLeverage` |

<a id="file-08c346741655"></a>

## shared/trading/strategies.ts

[shared/trading/strategies.ts](../../shared/trading/strategies.ts)

### Internal dependencies

| Import / re-export | Source target |
|---|---|
| `./emaCrossover` | [shared/trading/emaCrossover.ts](#file-1d7dd8e6da1e) |

### Imported by

- [meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig.ts](#file-8a3ab198552f)
- [meu/schedulerService/src/algorithms/crypto/runCryptoStrategy.ts](#file-75b27250a586)
- [meu_frontend/src/features/agents/server/recover-delta-agent.ts](#file-681653d00ae2)
- [meu_frontend/src/features/backtests/chart/analysis.ts](#file-dac1b352656a)
- [meu_frontend/src/features/backtests/server/router.ts](#file-077c1fd7ba8c)
- [meu_frontend/src/features/exchange/server/recover-execution.ts](#file-05b3fc29b44f)
- [shared/trading/paperTrading.ts](#file-39c515f77d12)
- [shared/trading/perpetualBacktest.ts](#file-14821081d1df)

### Named functions and direct calls

| Function / method | Source line | Direct calls (syntax only) |
|---|---|---|
| `validateStrategy` | [47](../../shared/trading/strategies.ts#L47) | `Number.isSafeInteger`, `strategyCatalog.some` |
| `ema` | [57](../../shared/trading/strategies.ts#L57) | `out.push` |
| `prepareStrategy` | [72](../../shared/trading/strategies.ts#L72) | `Math.abs`, `Math.max`, `Math.min`, `Math.sqrt`, `atr.push`, `bands.push`, `bars.map`, `bars.slice`, `closes.slice`, `decisions.push`, `ema`, `entryProposals.push`, `exitSignals.push`, `means.push`, `prior.map`, `qualityValid`, `rawSignals.push`, `regimeReason`, `rsi.push`, `signals.push`, `trendValid`, `validateStrategy`, `window.reduce` |
| `regimeReason` | [149](../../shared/trading/strategies.ts#L149) | `Math.abs` |
| `trendValid` | [223](../../shared/trading/strategies.ts#L223) | — |
| `qualityValid` | [224](../../shared/trading/strategies.ts#L224) | `Math.abs`, `regimeReason` |
| `evaluateStrategy` | [311](../../shared/trading/strategies.ts#L311) | `bars.filter`, `prepareStrategy`, `prepared.atr.at`, `prepared.decisions.at`, `prepared.entryProposals.at`, `prepared.exitSignals.at`, `prepared.means.at`, `prepared.rawSignals.at`, `prepared.signals.at` |
| `strategyStateKey` | [316](../../shared/trading/strategies.ts#L316) | `config.stateId.slice`, `config.stateId.startsWith` |
