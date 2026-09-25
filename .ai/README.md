# EmCoin AI Workspace

Thư mục này là nguồn context dùng chung cho Claude, Codex/Luna và Antigravity. Không để plan quan trọng chỉ trong chat.

## Cấu trúc

```text
.ai/
  README.md
  product-context.md
  architecture.md
  gameplay-state-machine.md
  event-contract.md
  design-system.md
  asset-license-ledger.md
  qa-matrix.md
  tasks/
    INDEX.md
    R00-baseline-and-recovery.md
    ...
```

## Quy ước

Mỗi task chỉ có một file chính. Plan, implementation report, QA report và audit report nằm trong cùng file đó. Ví dụ:

```text
.ai/tasks/R00-baseline-and-recovery.md
```

Không tạo `R00-plan.md`, `R00-notes.md` và `R00-final.md` riêng nếu không thật sự cần. Việc tách nhiều file dễ tạo plan cũ và plan mới cùng tồn tại.

Vòng đời task:

```text
planned → ready → in progress → qa → done
                    ↓
                 blocked
```

Terra/Sonnet ghi `## Implementation plan`. Luna/Codex ghi `## Implementation report`. Antigravity/Playwright ghi `## QA report`. Claude ghi `## Audit report`. Người sở hữu sản phẩm quyết định `## Open questions`.

## Template tối thiểu

```markdown
# R00 Task name

**Priority:** P0
**Status:** planned
**Owner:** Codex Luna/Terra
**Reviewer:** Claude Sonnet
**Dependencies:** R00, R01

## Goal
## Current evidence
## Scope
### Files to read
### Files allowed to change
### Files explicitly out of scope
## State/event/data flow
## Acceptance criteria
- [ ]
## Test plan
## Risks and rollback
## Open questions
## Implementation plan
<!-- Terra/Sonnet ghi ở đây. -->
## Implementation report
<!-- Luna/Codex ghi sau khi code. -->
## QA report
<!-- Antigravity/Playwright ghi sau khi test. -->
## Audit report
<!-- Claude ghi finding. -->
## Decision log
```

## Quy tắc cập nhật

- `INDEX.md` chỉ chứa ID, dependency và status; report dài nằm trong task file.
- Khi plan đổi, thêm `Plan revision` mới, không xóa plan cũ trong git history.
- Nếu thay đổi ảnh hưởng nhiều task, tạo ADR hoặc cập nhật context file rồi link lại.
- Agent chỉ đọc task file và các context file được task chỉ định, không cần đọc toàn bộ `.ai/`.
- Không ghi secrets, token, dữ liệu thật của người chơi hoặc thông tin trẻ em vào task file.
- Không để hai agent sửa cùng một task/branch cùng lúc.

## Prompt cho Luna

```text
Đọc D:\Desktop\coinem\.ai\tasks\R00-baseline-and-recovery.md.
Chỉ implement mục Implementation plan.
Tôn trọng Scope, Out of scope và Acceptance criteria.
Sau khi làm, cập nhật Implementation report và không xóa plan.
```
