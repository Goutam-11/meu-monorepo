# Research evidence inventory

**Status: local-only evidence. This README and `SHA256SUMS` are versioned; all experiment artifacts remain local-only.**

This directory is excluded from Git by policy, except this README and `SHA256SUMS`. The repository records *that* an experiment ran, with its hashes and producing commands; a fresh clone does not contain the result records, frozen manifests, ledgers or candle caches, so it cannot re-derive a byte-identical number without them.

## What a re-run reproduces

A re-run with the same frozen manifest, source revision and public candle data reproduces the **method and decision path**. It does not reproduce the byte-identical output against the original historical snapshot unless the local ledgers and candle caches below are present. The 1,638 ledger comparisons are evidence from the development machine, not a fresh-clone test.

## Primary artefacts

All paths are relative to the repository root. "Not shipped" means the file is present only on the development machine and is covered by the complete hash manifest below.

| Artefact | Size | SHA-256 | Producing command | Shipped |
|---|---:|---|---|---|
| `docs/reports/STRATEGY_EVALUATION_2026-10-11.json` | 1.1 MB | `3a9fa2e928250030f295740df6f3481fdca7850f74900bc046a6437962bfa842` | `bun scripts/research/evaluate.ts` | No |
| `docs/reports/STRATEGY_EVALUATION_FULL_2026-10-11.json.gz` | 6.0 MB | `795a9586dfdcd8b1b95d53f39cc47c37d3f178864c6fcd716a24e963a5a9f238` | `bun scripts/research/evaluate.ts` | No |
| `docs/reports/STRATEGY_EVALUATION_DATA_CHECKS_2026-10-11.json` | 8.9 KB | `d1013e80f3e199827a4c4fccae6e9a1b955ed39ea4a6cf4ac755269eb3bc1a2d` | `python scripts/research/check-data.py docs/reports/STRATEGY_EVALUATION_2026-10-11.json` | No |
| `docs/reports/SIGNAL_STUDY_2026-10-11.json` | 2.1 MB | `6eddb36bbca3bb411e839fe099fd4482251518fd3e14f09c2a0bc71ba0a3e374` | `bun scripts/research/evaluate-signals.ts` | No |
| `docs/reports/SIGNAL_STUDY_PRIOR_2026-10-11.json` | 2.2 MB | `8659b83a46928efe1a77efe6fcef852598a1a9a5f95513ddfe4bc3e3d57d0208` | `bun scripts/research/evaluate-signals.ts --prior` | No |
| `docs/reports/SIGNAL_STUDY_FULL_2026-10-11.json.gz` | 3.6 MB | `4e7b7e5b83755c6468447288c679ef3e4a8497635f4ff94cc4f20a9e5f426a64` | `bun scripts/research/evaluate-signals.ts` | No |
| `docs/reports/SIGNAL_STUDY_PRIOR_FULL_2026-10-11.json.gz` | 3.7 MB | `6c8723b0edf2344e1378069b215577c67492ac4010ea30175f9f891e7a3442b4` | `bun scripts/research/evaluate-signals.ts --prior` | No |
| `docs/reports/SIGNAL_STUDY_DATA_CHECKS_2026-10-11.json` | 10.3 KB | `266a101eefda7d648fba9174aa9426e5c6196e3b7748dece65eb81491766e5c9` | `python scripts/research/check-data.py docs/reports/SIGNAL_STUDY_2026-10-11.json` | No |
| `docs/reports/ROBUSTNESS_2026-10-11.json` | 1.2 MB | `34002a95f37f27d97151d624d1c987c763915085d2c126dd0de5c35130a5c6cb` | `bun scripts/research/evaluate-robustness.ts` | No |
| `docs/reports/ROBUSTNESS_FULL_2026-10-11.json.gz` | 897.9 KB | `93e8289f859d102d59e356bfabcd1b0814cd28a2196058884a6ac195ce62acb4` | `bun scripts/research/evaluate-robustness.ts` | No |
| `docs/reports/ROBUSTNESS_DATA_CHECKS_2026-10-11.json` | 3.5 KB | `a5af89c72adbc897dc7c0f2047d057327b2d27b79f084ec490e08fa15fa3db04` | `python scripts/research/check-data.py docs/reports/ROBUSTNESS_2026-10-11.json` | No |
| `docs/reports/ROBUSTNESS_CHOICES_2026-10-11.json` | 31.3 KB | `0effb9bde7b64ad91d29f47d6c134e3e9de3578e2bc4f9ee7aaaa6993842508d` | `bun scripts/research/evaluate-robustness.ts` | No |
| `docs/reports/CONTINUATION_2026-10-11.json` | 499.1 KB | `0221dc6b26721d5a484d62baf95af128eb028fb23b5c57e9bb81dbb5b418978d` | `bun scripts/research/evaluate-continuation.ts` | No |
| `docs/reports/CONTINUATION_FULL_2026-10-11.json.gz` | 1.2 MB | `1dbe7660c4751082886c14366157ef99371c6ff0b4a98dde944e6011a35b8b80` | `bun scripts/research/evaluate-continuation.ts` | No |
| `docs/reports/CONTINUATION_DATA_CHECKS_2026-10-11.json` | 3.5 KB | `1ff4d47ef50191fd9cfe0711960ca2792b4c2d57eb70c8b9dd5c9798ad298e82` | `python scripts/research/check-data.py docs/reports/CONTINUATION_2026-10-11.json` | No |
| `docs/reports/EXECUTION_AUDIT_2026-10-11.json` | 199.3 KB | `6c7c81578332e7bf7fb35bfc1fc912e68b7056ab39cddce0a35099987e236558` | `bun scripts/research/evaluate-audit.ts` | No |
| `docs/reports/EXECUTION_AUDIT_FULL_2026-10-11.json.gz` | 870.7 KB | `eb8883d6c1eaa22bf06242a22d4a9c6a384e4d2b45386f8a3191ca505d03c6e0` | `bun scripts/research/evaluate-audit.ts` | No |
| `docs/reports/EXECUTION_AUDIT_DATA_CHECKS_2026-10-11.json` | 3 B | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` | `python scripts/research/check-data.py docs/reports/EXECUTION_AUDIT_2026-10-11.json` | No |
| `docs/reports/EXTENDED_2026-10-11.json` | 510.4 KB | `4931c027cb50984d1ccfbd31ad88ac3fcde2348e53fafb06130f0ff3e4aafb0e` | `bun scripts/research/evaluate-extended.ts` | No |
| `docs/reports/EXTENDED_FULL_2026-10-11.json.gz` | 394.6 KB | `68f0f867aa5588223aec195002004a22fc2582200b5cd5d7a7002ccd71418332` | `bun scripts/research/evaluate-extended.ts` | No |
| `docs/reports/EXTENDED_DATA_CHECKS_2026-10-11.json` | 3 B | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` | `python scripts/research/check-data.py docs/reports/EXTENDED_2026-10-11.json` | No |
| `docs/reports/EXTENDED_QUOTES_2026-10-11.json` | 7.8 KB | `af5be3b9b3b678bf13af8a8092a952c68836193fa6215bb74de13f8d3444a4ce` | `python scripts/research/sample-quotes.py` | No |
| `docs/reports/US_SESSION_STUDY_2026-10-11.json` | 3.8 MB | `3129eec69ed52641e3b5383caeede3b9a876cb1139f4c7e09690953e99318023` | `bun scripts/research/evaluate-sessions.ts` | No |
| `docs/reports/US_SESSION_LEDGERS_2026-10-11.json.gz` | 3.7 MB | `05e654f5d936c25a9f7b18f7222fb86af7b0e859f459b396ae96e6f6dbcb8141` | `bun scripts/research/evaluate-sessions.ts` | No |
| `docs/reports/COMBINED_ALGORITHMS_2026-10-13.json` | 2.8 MB | `e92f7812259d6020f0d729bb29fd087ce54e550755f01cacc360b6bc88233f26` | `bun scripts/research/combined-evaluate.ts` | No |
| `docs/reports/COMBINED_ALGORITHMS_2026-10-13_LEDGERS.json.gz` | 5.7 MB | `784ae69e2f8c539de5228ff50209e712a95d1bc03172d3c0a07611cd522ba317` | `bun scripts/research/combined-evaluate.ts` | No |
| `docs/reports/COMBINED_VERIFICATION_2026-10-13.json` | 25.7 KB | `ca86f39916ad2f2ce49ecb4ee5c6713bb226f190dbb3eda5118cf7973c4df26a` | `python scripts/research/check-data.py docs/reports/COMBINED_ALGORITHMS_2026-10-13.json` | No |
| `docs/reports/COMBINED_CONTINUOUS_2026-10-13.json` | 42.0 KB | `155c18fea6943d5982e454aed040051b1539cf75ece4e52e8313dc3b9ccc6a3b` | `bun scripts/research/combined-continuous.ts` | No |
| `docs/reports/COMBINED_CONTINUOUS_2026-10-13_LEDGERS.json.gz` | 71.9 KB | `a1a9d9e849addddb1cf818362a25f2e75ed3f7466a087c16b01404b5cb388c25` | `bun scripts/research/combined-continuous.ts` | No |
| `docs/reports/COMBINED_FILTERS_2026-10-13.json` | 1.1 MB | `742778b9c0739ea449f54fca0fc3ad14b1a3f18d79159c9f9e2658315353bf35` | `bun scripts/research/combined-filter-evaluate.ts` | No |
| `docs/reports/COMBINED_FILTERS_2026-10-13_LEDGERS.json.gz` | 1.4 MB | `d11253bd142dfd7aeb2a586f0746d6d80efa92d01cb9f1f33d6662568aab0834` | `bun scripts/research/combined-filter-evaluate.ts` | No |
| `docs/reports/COMBINED_VALIDATION_2026-10-13.json` | 370.6 KB | `c764e4dfc3efc4bfb20320ec78a38bedb66e6e1084bc64cd5dcad835e264c394` | `bun scripts/research/combined-validation.ts` | No |
| `docs/reports/COMBINED_VALIDATION_2026-10-13_LEDGERS.json.gz` | 696.2 KB | `7ac9715a45ebe9aeecfb5d53cf46f8b9837f5468fecf4bc8feca98af31193d8f` | `bun scripts/research/combined-validation.ts` | No |
| `docs/reports/COMBINED_VALIDATION_FETCH_2026-10-13.json` | 379 B | `ce448b80c6d0ec110f274864b92dbbc971e8cb6f57dc870516a40928236ec21b` | `bun scripts/research/combined-validation.ts` | No |
| `docs/reports/ENSEMBLE_STRATEGIES_2026-10-13.json` | 957.8 KB | `dd52ef89888ec213ad86c08284666cdf81a6c2014ad4499ad52f5cfd4ce905ab` | `bun scripts/research/ensemble-evaluate.ts` | No |
| `docs/reports/ENSEMBLE_STRATEGIES_2026-10-13_LEDGERS.json.gz` | 622.0 KB | `53dc9d26077a791c7779ea511e6f7e16c94aba2306ae9d766a7194a7b6b86359` | `bun scripts/research/ensemble-evaluate.ts` | No |
| `docs/reports/ENSEMBLE_VERIFICATION_2026-10-13.json` | 26.3 KB | `d4123228e2bc558e57721c539cdb3e5c24b2f9b7b7d41095cb68e2e14a9dbbb8` | `python scripts/research/check-data.py docs/reports/ENSEMBLE_STRATEGIES_2026-10-13.json` | No |
| `docs/reports/ENSEMBLE_CONFLUENCE_2026-10-13.json` | 583.3 KB | `7f7b6bb31ef02166c4b992a4357b190175d324b847f85d72b31238e800e71d85` | `bun scripts/research/ensemble-confluence.ts` | No |
| `docs/reports/ENSEMBLE_CONFLUENCE_2026-10-13_LEDGERS.json.gz` | 97.1 KB | `9df8e8782e315c06dd49a7e9469272e1bc2ea6972f5fc3182b009809612b0ccb` | `bun scripts/research/ensemble-confluence.ts` | No |
| `docs/reports/MULTI_TICKER_FAMILIES_2026-10-13.json` | 2.5 MB | `8d84d5597539e3feaf794c083d231b4d44f87cdbd80ce79455a23e34605db5c4` | `bun scripts/research/families-evaluate.ts` | No |
| `docs/reports/MULTI_TICKER_FAMILIES_2026-10-13_LEDGERS.json.gz` | 9.2 MB | `2c7b3b6721b47359b94ae9bd07791d959d10b08f42f44da63362053fc217aa3d` | `bun scripts/research/families-evaluate.ts` | No |
| `docs/reports/MULTI_TICKER_FOLLOWUP_2026-10-13.json` | 2.3 MB | `6a72fbead92e21b1f2b158909cdcda7c935d1750f4dd9fab0a89473275966be1` | `bun scripts/research/families-followup-evaluate.ts` | No |
| `docs/reports/MULTI_TICKER_FOLLOWUP_2026-10-13_LEDGERS.json.gz` | 1.4 MB | `c8550198d7b27fa7c10c27ff136efcd2f08c6f776a8312e560cf52d2d2c1ca74` | `bun scripts/research/families-followup-evaluate.ts` | No |
| `docs/reports/MULTI_TICKER_RISK_2026-10-13.json` | 1.1 MB | `e3ee7ff64c4e6fcf13b961d3b686d321e2abbe87aa8fcfd14797229ccf57943f` | `bun scripts/research/families-risk-evaluate.ts` | No |
| `docs/reports/MULTI_TICKER_RISK_2026-10-13_LEDGERS.json.gz` | 875.5 KB | `fe08325140e27264f1b574c5a4ad260d0b8ebfeddf9d328cf9c3493b3aa55719` | `bun scripts/research/families-risk-evaluate.ts` | No |
| `docs/reports/MULTI_TICKER_VERIFICATION_2026-10-13.json` | 298.2 KB | `8fd58f0a5af224d15a6f3aef51c99cf2572c47cb44c7149e1c2a77db71723331` | `python scripts/research/families-verify.py` | No |
| `docs/reports/NEXT_ALGORITHM_TESTS_2026-10-13.json` | 183.3 KB | `a5e12a6d910b6cd8afe4d18c4b558721a2892ac2f57cc208b498ccfb8ba353d5` | `bun scripts/research/next-evaluate.ts` | No |
| `docs/reports/NEXT_ALGORITHM_TESTS_2026-10-13_LEDGERS.json.gz` | 1.6 MB | `d96f864b9d503993c4b148348a633344d732a644dabdbf223b515e01a04f4196` | `bun scripts/research/next-evaluate.ts` | No |
| `docs/reports/PAPER_REPLAY_PARITY_2026-10-11.json` | 8.0 KB | `122d9b4c7e085144304d495c7a4ce7d9fb44916f4486ca1b37e451f711883cae` | `bun scripts/research/verify-paper-replay.ts` | No |

## Frozen manifests

These files were frozen before evaluation and must not be edited. They are local-only (`scripts/research/` is ignored), so their hashes are recorded here.

| Manifest | Size | SHA-256 |
|---|---:|---|
| `scripts/research/audit-manifest.json` | 1560 B | `8fd73fada03b10069a2f8e1fc5e0c82386f92ddd7f95ccd00bcd67d33bff17fc` |
| `scripts/research/combined-continuous-manifest.json` | 585 B | `aadf3d519b05cec865c9232e69ba2f338b90ac789ab2b94f756aa05bc5c16225` |
| `scripts/research/combined-filter-manifest.json` | 1303 B | `7bcd0331981f6a8e502081b500535b0bcd4c0d981535150855e5feaedbdc1fb8` |
| `scripts/research/combined-manifest.json` | 3147 B | `8d826c43104d0fdfc290f968140a5fdbba23e4287bb741ca25830f7d7aa9211c` |
| `scripts/research/combined-validation-manifest.json` | 3303 B | `e9f938ddec8fe0fb14c3b0134e6a02e50add4c6e5272ae899d809f97d0d9ed65` |
| `scripts/research/continuation-manifest.json` | 1357 B | `434e22ab20d3d973ce0c69226f5a38b4853a999787c08c239444516a055b16a4` |
| `scripts/research/ensemble-manifest.json` | 3016 B | `dd282456ff8a3004552b68a7e6ba4891aabb6a739df5ffd4cc6cb56b3fc612d0` |
| `scripts/research/extended-manifest.json` | 1395 B | `c6746a9a9ceb9e9afa52e0d246f933ef93bb8884ab7898c8926ce31e419e9060` |
| `scripts/research/families-followup-manifest.json` | 2103 B | `0f7a09069f21ac326d535463c67d8a965183115254c580d17214d81828fa3c4f` |
| `scripts/research/families-manifest.json` | 4034 B | `ae357cd622a72e374f563a2c166ce0dcffdc64ab3b0f84d7a1c577a406a490d0` |
| `scripts/research/families-risk-manifest.json` | 838 B | `fd44568b5e88167334d018d218a519492cb6422597f260765625eba59009e5b2` |
| `scripts/research/manifest.json` | 1304 B | `355a8774fbc1ece2d3943ae62ef65143ed9451a9eaa0da979e0b810042993e23` |
| `scripts/research/next-manifest.json` | 2664 B | `4673c482579faf56256e1275344bab86be39fc65bf12da0450d0072711c8e0cd` |
| `scripts/research/robustness-manifest.json` | 1288 B | `4112aaac6887534922f0e55662ad03f07294cf75c298373a4417395449273a6c` |
| `scripts/research/session-manifest.json` | 1953 B | `e091c12ea0153fe7b02317aeae4f825cd4c62fc9bea52cae1b44d89bf6d71920` |
| `scripts/research/signals-manifest.json` | 1773 B | `c79a265bda76f13cfdc8d8d7225c15b9210cfc62653eb977f71927a1078a1c35` |

## Candle caches

Candle caches are local-only. They are fetched from public Delta India endpoints; the fetchers never use credentials or trading APIs.

| Cache | Fetch command | Shipped |
|---|---|---|
| `docs/reports/strategy-evaluation-data` | `python scripts/research/fetch-candles.py scripts/research/manifest.json docs/reports/strategy-evaluation-data` | No |
| `docs/reports/signal-study-data` | `python scripts/research/fetch-candles.py scripts/research/signals-manifest.json docs/reports/signal-study-data` | No |
| `docs/reports/robustness-data` | `python scripts/research/fetch-candles.py scripts/research/robustness-manifest.json docs/reports/robustness-data` | No |
| `docs/reports/continuation-data` | `python scripts/research/fetch-candles.py scripts/research/continuation-manifest.json docs/reports/continuation-data` | No |
| `docs/reports/extended-data` | `python scripts/research/fetch-candles.py scripts/research/extended-manifest.json docs/reports/extended-data` | No |
| `docs/reports/combined-data` | `python scripts/research/fetch-candles.py scripts/research/combined-manifest.json docs/reports/combined-data` | No |
| `docs/reports/combined-validation-data` | `python scripts/research/fetch-candles.py scripts/research/combined-validation-manifest.json docs/reports/combined-validation-data` | No |

## Complete hash inventory

`SHA256SUMS` lists every top-level and nested file in this directory with its SHA-256. Verify a local copy from the repository root:

```sh
sha256sum -c docs/reports/SHA256SUMS
```
Missing ledgers or candle caches make that check fail by design: it describes the development machine, not what a fresh clone contains.

## What is not claimed

- The repository does not ship the result records, 1,638 trade ledgers, candle caches, frozen manifests or `scripts/research/` by default.

- The report and `docs/MULTI_MARKET_RESEARCH.md` state this boundary; a re-run reproduces the method, not byte-identical output.

- No credentials, private exchange data or live account records are included in these artifacts.
