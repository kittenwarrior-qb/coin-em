# EmCoin Refactor Task Index

Nguồn backlog: `REFACTOR_MASTER_PLAN.md` §3. Đây là bảng điều phối; mỗi task có một brief riêng trong thư mục này trước khi giao implementation cho Luna/Codex.

| ID | Priority | Task | Dependency | Status |
| --- | --- | --- | --- | --- |
| R00 | P0 | Baseline và recovery evidence | — | qa |
| R01 | P0 | ADR luật và rules version | R00 | blocked |
| R02 | P0 | Release guardrail | R00 | planned |
| R03 | P0 | Test harness isolation | R00 | planned |
| R04 | P0 | Socket contract | R01 | planned |
| R05 | P0 | Quyền, input và role secrecy | R04 | planned |
| R06 | P0 | Unified state machine | R01, R04 | planned |
| R07 | P0 | Per-room concurrency | R03, R04, R06 | planned |
| R08 | P0 | Durable persistence | R07 | planned |
| R09 | P0 | Resume và session | R05, R08 | planned |
| R10 | P0 | Timer và lifecycle | R06, R08 | planned |
| R11 | P0 | Migration và backup | R08 | planned |
| R12 | P0 | Role deck theo số người | R01, R06 | planned |
| R13 | P0 | Night action integrity | R01, R07, R12 | planned |
| R14 | P0 | Coin ledger và rollback | R01, R07, R13 | planned |
| R15 | P0 | Card catalog integrity | R01, R04, R07 | planned |
| R16 | P0 | End state và hydration | R04, R08, R09, R15 | planned |
| R17 | P0 | Frontend transport | R04, R07, R09, R16 | planned |
| R18 | P1 | Frontend state boundary | R15, R17 | planned |
| R19 | P1 | GameBoard decomposition | R18 | planned |
| R20 | P1 | Phase UI registry | R06, R12, R19 | planned |
| R21 | P1 | Mobile shell | R19 | planned |
| R22 | P1 | Design system | R21 | planned |
| R23 | P1 | Overlay và accessibility | R17, R21 | planned |
| R24 | P1 | Asset manifest | R15 | planned |
| R25 | P1 | Animation 2D lifecycle | R17, R19, R24 | planned |
| R26 | P2 | Showcase 3D | R24, R25 | planned |
| R27 | P0 | Gameplay regression suite | R01, R03 | planned |
| R28 | P0 | Real Redis persistence suite | R03, R08, R09, R10, R11 | planned |
| R29 | P1 | Browser QA suite | R17, R20, R21, R23 | planned |
| R30 | P1 | Load/SLO | R27, R28, R35 | planned |
| R31 | P1 | PWA | R17, R21, R24, R29 | planned |
| R32 | P2 | Capacitor native shell | R31, R30, R33 | planned |
| R33 | P1 | Privacy và deletion | R05, R09, R11 | planned |
| R34 | P2 | Store release | R32, R33, R35, R37 | planned |
| R35 | P1 | Monitoring | R08, R17 | planned |
| R36 | P1 | Admin tối thiểu | R05, R08, R33, R35 | planned |
| R37 | P1 | Release và rollback | R02, R11, R28, R29, R35 | planned |
| R38 | P1 | Website và documentation | R01, R22, R24, R33 | planned |
| R39 | P1 | Toolchain hygiene | R00, R03 | planned |

## Status values

- `planned`: brief chưa được review.
- `ready`: dependency và decision cần thiết đã chốt; có thể giao Luna/Codex.
- `blocked`: thiếu dependency hoặc quyết định sản phẩm.
- `in progress`: một branch/agent đang sửa.
- `qa`: implementation xong, chờ test/audit.
- `done`: merge, test và rollback note đã hoàn tất.

Không giao một task `planned` cho Luna. Mỗi task phải có brief, acceptance criteria, test command và rollback note trước khi chuyển sang `ready`.
