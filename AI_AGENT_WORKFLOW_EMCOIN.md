# EmCoin AI Agent Workflow

Quy trình phối hợp Claude, Codex và Google Antigravity cho project EmCoin.

Mục tiêu: một người vẫn giữ quyền quyết định, nhưng ba agent chia nhau làm kiến trúc, implementation, visual QA và audit. Không để nhiều agent cùng sửa một file trong cùng thời điểm.

## 1. Vai trò cố định

| Agent | Vai trò | Việc chính |
| --- | --- | --- |
| Claude | Architect và reviewer | Phân tích game, viết plan, acceptance criteria, audit logic và UX |
| Codex | Engineer chính | Sửa source, chạy test, refactor, build, Docker, CI/CD và deploy |
| Antigravity | Browser QA và visual reviewer | Chạy flow trên browser, kiểm tra mobile, screenshot, animation và layout |
| Gemini/Nano Banana | Asset assistant | Tạo concept, reskin, biến thể 2D và reference sheet |

## 2. Model nên dùng

### Claude

- **Claude Opus 5 hoặc Opus mới nhất đang có:** architecture, state machine, audit backend realtime, security review, kế hoạch lớn. Nếu giao diện chưa có Opus 5, dùng Opus 4.6.
- **Claude Sonnet 5 hoặc Sonnet mới nhất đang có:** UX flow, component spec, copywriting, review diff và việc hàng ngày. Nếu giao diện chưa có Sonnet 5, dùng Sonnet 4.6.
- **Claude Haiku 4.5 hoặc Haiku mới nhất đang có:** tóm tắt log, đổi format, tạo checklist, viết test case nhỏ.

Không dùng Haiku cho quyết định phase, Redis persistence hoặc logic coin.

### Codex

- **GPT-6 Astra, reasoning high/xhigh:** migration lớn, Redis/reconnect, race condition, backend state machine, audit khó và release blocker.
- **GPT-5.6 Terra, reasoning medium/high:** model mặc định để code frontend/backend, refactor module và viết test.
- **GPT-5.6 Luna, reasoning low/medium:** lint fix, CSS, rename, test lặp lại, tài liệu và thay đổi nhỏ.

Quy tắc đơn giản: dùng Terra cho phần lớn task; chỉ dùng Astra khi lỗi có thể làm hỏng dữ liệu hoặc multiplayer; dùng Luna cho việc lặp lại.

### Google Antigravity

- **Gemini 3 Pro nếu workspace có lựa chọn:** visual QA phức tạp, phân tích nhiều screenshot, browser flow dài, review landing page.
- **Gemini 3.8 Flash hoặc model Flash mặc định:** chạy smoke test, kiểm tra responsive, kiểm tra popup, navigation và các lỗi UI rõ ràng.

Antigravity là agent kiểm tra sản phẩm trong browser. Không giao cho nó tự ý thay đổi backend realtime nếu chưa có acceptance criteria và test.

Tên model có thể thay đổi theo subscription hoặc giao diện từng thời điểm. Khi không thấy đúng tên, chọn model cùng cấp năng lực: flagship cho architecture, balanced cho daily coding, fast cho tác vụ lặp lại.

## 3. Luật làm việc bắt buộc

1. Claude lập đặc tả trước khi Codex sửa code.
2. Codex là agent duy nhất được quyền merge implementation cuối cùng.
3. Antigravity chỉ báo cáo lỗi browser, trừ khi được giao rõ một patch UI riêng.
4. Một file chỉ được một agent chỉnh tại một thời điểm.
5. Không cho agent sửa `Caddyfile` trên VPS nếu chưa được chỉ định rõ.
6. Không commit khi chưa có test hoặc ghi rõ test chưa chạy được.
7. Mỗi task phải có: mục tiêu, file scope, acceptance criteria, test plan và rollback note.
8. Không dùng AI để quyết định license của asset. Người làm phải kiểm tra license nguồn.

## 4. Cấu trúc tài liệu nên có trong repo

```text
.ai/
  product-context.md
  architecture.md
  gameplay-state-machine.md
  event-contract.md
  design-system.md
  asset-license-ledger.md
  qa-matrix.md
  prompts/
    claude-plan.md
    claude-audit.md
    codex-implement.md
    codex-debug.md
    antigravity-qa.md
```

Các file này là context dùng chung. Không copy một plan dài vào nhiều agent nếu có thể trỏ về cùng một file.

## 5. Workflow chuẩn cho một feature

### Bước A — Claude lập plan

Model: Opus cho task lớn, Sonnet cho task vừa.

Prompt:

```text
Bạn là architect của EmCoin.

Đọc các file sau trước khi trả lời:
- game.md
- README.md
- .ai/product-context.md nếu có
- .ai/architecture.md nếu có
- các file liên quan đến task được nêu bên dưới

Task:
[MÔ TẢ TASK]

Không sửa code. Hãy trả về:
1. Hiện trạng đang hoạt động thế nào.
2. Luồng state/phase/event liên quan.
3. File cần sửa và file không nên sửa.
4. Acceptance criteria có thể kiểm tra được.
5. Edge cases về refresh, reconnect, duplicate socket event, role không tồn tại và rollback.
6. Test plan frontend, backend và E2E.
7. Rủi ro migration hoặc dữ liệu Redis.
8. Thứ tự implementation ngắn nhất và an toàn nhất.

Không đoán tên event hoặc schema. Nếu chưa chắc, chỉ rõ file cần đọc thêm.
```

Output ghi vào mục `## Implementation plan` của đúng task file, ví dụ `.ai/tasks/R00-baseline-and-recovery.md`. Không tạo plan rời nếu không cần.

### Bước B — Codex implement

Model: Terra mặc định; Astra cho persistence, backend state machine hoặc bug production.

Prompt:

```text
Bạn là engineer chính của EmCoin.

Đọc:
- plan đã được Claude phê duyệt: [ĐƯỜNG DẪN PLAN]
- game.md
- README.md
- các file liên quan

Implement đúng scope của plan.

Yêu cầu:
- đọc code hiện tại trước khi sửa
- giữ nguyên behavior không liên quan
- không tạo event socket trùng tên
- backend là nguồn sự thật cho phase, role, card, vote và coin
- kiểm tra quyền host/player trước mọi mutation
- xử lý refresh, reconnect và duplicate request nếu task có liên quan
- thêm hoặc cập nhật test
- chạy lint, test và build phù hợp

Kết thúc bằng:
1. File đã thay đổi.
2. Behavior đã sửa.
3. Test đã chạy và kết quả.
4. Rủi ro còn lại.
5. Hướng rollback nếu cần.
```

### Bước C — Antigravity kiểm tra browser

Model: Flash cho smoke test; Pro cho flow dài hoặc lỗi visual khó.

Prompt:

```text
Bạn là QA browser của EmCoin.

Mở app local tại:
[URL]

Kiểm tra task:
[MÔ TẢ TASK]

Thực hiện flow thật từ đầu đến cuối, không chỉ nhìn source.
Kiểm tra tại:
- mobile 360x800
- mobile 390x844
- desktop 1280x800

Kiểm tra:
- layout không overflow ngang/dọc ngoài ý muốn
- text không bị cắt hoặc lỗi encoding
- popup có thể mở và đóng
- loading, disabled, success, error state
- animation không bị giữ lại sau khi đổi phase
- refresh/reconnect nếu task liên quan
- role khác nhau có UI đúng quyền

Không sửa code. Trả về:
- PASS/FAIL
- bước tái hiện lỗi
- viewport lỗi
- screenshot hoặc mô tả vị trí lỗi
- mức độ blocker/high/medium/low
```

### Bước D — Claude audit

Model: Opus cho backend/gameplay; Sonnet cho UI và diff thông thường.

Prompt:

```text
Bạn là reviewer độc lập của EmCoin.

Đọc:
- plan: [PATH]
- git diff
- test output
- QA report của Antigravity: [PATH]

Review theo thứ tự ưu tiên:
1. Bug làm sai phase, role, coin hoặc quyền người chơi.
2. Race condition, duplicate socket event và stale state.
3. Reconnect/Redis persistence và rollback.
4. Regression ở role khác hoặc round khác.
5. Security và validation phía backend.
6. Lỗi UI nghiêm trọng trên mobile.
7. Test còn thiếu.

Chỉ báo cáo finding có căn cứ bằng file và line.
Mỗi finding ghi severity, impact, reproduction và cách sửa.
Nếu không có lỗi, ghi rõ residual risk và test gap.
Không tự sửa code.
```

### Bước E — Codex hoàn thiện

Prompt:

```text
Dựa trên plan, diff hiện tại và audit report, sửa chỉ các finding đã xác nhận.

Sau khi sửa:
- chạy lint
- chạy unit/integration test
- chạy build frontend/backend
- nếu có socket hoặc phase, chạy E2E tương ứng
- kiểm tra git diff không chứa thay đổi ngoài scope

Báo cáo ngắn gọn file đã sửa, test đã chạy và rủi ro còn lại.
```

## 6. Workflow theo loại task

### Gameplay/backend realtime

1. Claude Opus: state transition, event contract, edge cases.
2. Codex Astra: handler, Redis snapshot, reconnect, validation và test.
3. Claude Opus: audit race condition và quyền mutation.
4. Codex Terra: sửa finding, chạy test.
5. Antigravity Flash: chơi thật bằng nhiều tab/browser.

### Frontend/UI

1. Claude Sonnet: UX flow, component states, text và responsive rules.
2. Codex Terra: implement component và state binding.
3. Antigravity Pro: screenshot comparison và browser QA.
4. Claude Sonnet: review consistency và accessibility.
5. Codex Luna/Terra: sửa visual bug và chạy build.

### Asset 2D

1. Claude Sonnet: viết art brief và prompt cố định.
2. Nano Banana/Gemini: generate hoặc reskin biến thể.
3. Người làm: chọn bản đạt chuẩn và xác nhận quyền sử dụng.
4. Codex Luna: convert, compress, rename và cập nhật manifest.
5. Antigravity Flash: kiểm tra asset ở các viewport.

### Animation/VFX/audio

1. Claude Sonnet: event-to-animation mapping.
2. Người làm: tạo animation trong Rive/Lottie hoặc chỉnh asset.
3. Codex Terra: tích hợp lifecycle, cancel khi phase đổi, reduced motion.
4. Antigravity Pro: kiểm tra timing và cảm giác trên mobile.
5. Codex Luna: tối ưu kích thước và cleanup.

### Production bug

1. Antigravity: tái hiện bằng browser và ghi video/screenshot nếu có thể.
2. Codex Astra: đọc log, trace event và kiểm tra Redis/state.
3. Claude Opus: audit nguyên nhân và đề xuất patch nhỏ nhất.
4. Codex Astra: sửa, test regression và chuẩn bị rollback.

## 7. Cách lập workflow AI tự động

### Mức 1 — Workflow thủ công có cấu trúc

Dùng GitHub Issue template với các trường:

```text
## Goal

## Scope

## Acceptance criteria

## Files likely involved

## Test plan

## Rollback note

## Agent handoff
- Claude plan: pending/done
- Codex implementation: pending/done
- Antigravity QA: pending/done
- Claude audit: pending/done
```

Đây là mức nên dùng ngay vì dễ kiểm soát và không cần thêm hạ tầng.

### Mức 2 — Tự động hóa CI

Sau mỗi pull request:

1. GitHub Actions chạy lint, unit test, build và E2E.
2. Nếu fail, gửi log cho Codex/Codex CLI để sửa trên branch riêng.
3. Khi pass, Antigravity chạy smoke flow trên staging.
4. Claude review diff và test report trước khi merge.

Không nên cho agent tự merge production. Quyền merge cuối vẫn thuộc về bạn.

### Mức 3 — Handoff bằng file artifact

Mỗi task tạo các file:

```text
.ai/tasks/2026-09-09-healer-target.md
.ai/tasks/2026-09-09-healer-target.qa.md
.ai/tasks/2026-09-09-healer-target.audit.md
```

Claude đọc plan, Codex đọc plan và ghi implementation report, Antigravity ghi QA report, Claude đọc tất cả để audit. Cách này giữ context bền hơn việc copy nhiều đoạn chat.

## 8. Quy tắc branch và quyền sửa

```text
main                  production-ready only
codex/feature-name    implementation branch
qa/feature-name       optional browser QA notes only
```

- Claude mặc định không sửa source.
- Antigravity mặc định không sửa source.
- Codex sửa source và tạo commit.
- Bạn review diff trước khi merge.
- Không chạy hai agent ghi vào cùng working tree.

## 9. Checklist trước khi merge

- [ ] Plan đã có acceptance criteria.
- [ ] Backend validation đã có nếu task thay đổi state.
- [ ] Không có duplicate socket event.
- [ ] Refresh/reconnect đã được kiểm tra nếu liên quan.
- [ ] Role không tồn tại không làm crash phase.
- [ ] Coin/card/role không bị double grant.
- [ ] Mobile 360px không overflow.
- [ ] Lint, test và build pass.
- [ ] Asset mới có license/source.
- [ ] Có rollback note.

## 10. Quyết định nhanh

| Câu hỏi | Chọn |
| --- | --- |
| Cần hiểu logic trước khi code? | Claude Opus |
| Cần sửa code thật? | Codex Terra |
| Bug production liên quan Redis/socket? | Codex Astra + Claude Opus audit |
| CSS, rename, test nhỏ? | Codex Luna |
| Cần xem UI như người dùng? | Antigravity Flash |
| Flow visual phức tạp nhiều screenshot? | Antigravity Pro |
| Cần tạo/reskin hình 2D? | Nano Banana/Gemini |
| Cần quyết định license? | Người làm kiểm tra nguồn, không giao cho AI |

## 11. Chế độ Token Poor

Nếu ngân sách token thấp, không chạy đủ năm bước cho mọi task. Dùng quy trình rút gọn sau:

### Phân vai tiết kiệm

- **Claude Sonnet:** chỉ dùng cho plan ngắn, gameplay khó, UX decision hoặc audit các file nhạy cảm.
- **Codex Luna:** implementation nhỏ, lint, CSS, test, rename, tài liệu và refactor có scope rõ.
- **Codex Terra nếu còn quota:** backend phase, Redis, socket và task có nhiều file.
- **Antigravity Flash:** chỉ chạy sau khi feature đã xong để kiểm tra browser; không gửi toàn bộ screenshot nếu không cần.

### Quy tắc tiết kiệm context

1. Không yêu cầu agent đọc toàn repo cho mọi task.
2. Claude chỉ đọc `game.md`, file liên quan và 1–2 contract cần thiết.
3. Sau mỗi task lưu summary tối đa 20 dòng vào `.ai/tasks/`.
4. Agent sau đọc summary, không đọc lại toàn bộ lịch sử chat.
5. Chỉ gửi `git diff --stat` và các file thay đổi, không gửi log dài.
6. Gộp các việc nhỏ cùng một module vào một prompt Luna.
7. Không gọi Antigravity cho lỗi hiển nhiên đã thấy trong source.
8. Không dùng model mạnh để viết code boilerplate.

### Workflow rút gọn cho task thông thường

```text
1. Tự viết mục tiêu và acceptance criteria trong 5 dòng.
2. Luna đọc đúng các file liên quan và implement.
3. Luna chạy lint/test/build.
4. Antigravity kiểm tra browser nếu có thay đổi UI.
5. Chỉ gọi Sonnet khi có lỗi logic, UX mơ hồ hoặc test fail khó hiểu.
```

### Prompt Luna ngắn

```text
Task: [MÔ TẢ NGẮN]
Scope: [FILE/FOLDER ĐƯỢC PHÉP SỬA]
Acceptance:
- [điều kiện 1]
- [điều kiện 2]

Đọc code liên quan trước khi sửa. Implement tối thiểu, không refactor ngoài scope.
Chạy lint/test/build phù hợp. Cuối cùng trả về file đã sửa, test đã chạy và rủi ro còn lại.
```

### Prompt Sonnet tiết kiệm

```text
Đọc game.md và các file sau: [DANH SÁCH FILE]

Hãy đưa ra plan tối đa 15 dòng cho task: [TASK].
Chỉ nêu file cần sửa, state/event liên quan, acceptance criteria và 3 edge cases quan trọng.
Không giải thích nền tảng chung, không sửa code.
```

### Khi nào bắt buộc gọi Sonnet

- Thay đổi phase, role, coin hoặc quyền host.
- Thay đổi Redis persistence, reconnect hoặc rollback.
- Có nguy cơ duplicate socket event.
- Không biết behavior đúng theo `game.md` là gì.
- Luna đã sửa nhưng test vẫn fail sau hai lần.

### Khi nào không cần gọi Sonnet

- Chỉnh spacing, màu, responsive nhỏ.
- Sửa lint hoặc TypeScript type rõ ràng.
- Đổi tên file/constant.
- Thêm test cho behavior đã có.
- Nén ảnh, đổi format, cập nhật manifest.

### Ngân sách quota theo tuần

| Việc | Agent | Tần suất |
| --- | --- | --- |
| Plan/audit gameplay | Sonnet | 1–2 lần |
| Implementation | Luna | Hàng ngày |
| Visual QA | Antigravity Flash | Sau mỗi nhóm UI |
| Backend khó | Sonnet hoặc Terra | Chỉ khi cần |
| Tài liệu/checklist | Luna | Gộp cuối ngày |

Mục tiêu là chỉ dùng Sonnet để giảm rủi ro quyết định, không dùng Sonnet thay cho mọi thao tác code.

## 12. Quy trình quản lý mỗi ngày

### Buổi sáng — chọn đúng một mục tiêu

Tạo một file mới:

```text
.ai/tasks/2026-09-09-healer-ui.md
```

Nội dung tối thiểu:

```markdown
# Task

## Goal
Một câu mô tả kết quả cần đạt.

## Scope
- fe/src/...
- be/src/...

## Acceptance
- [ ] Điều kiện đúng 1
- [ ] Điều kiện đúng 2
- [ ] Không regression role khác

## Test
- npm run lint
- npm run build
- Test flow: ...

## Status
planned
```

Mỗi ngày chỉ chọn một task chính. Nếu task lớn hơn một ngày, chia thành các task nhỏ theo behavior, không chia theo số file.

### Prompt buổi sáng cho Luna

```text
Đọc file .ai/tasks/[TASK].md và chỉ các file trong Scope.

Implement task này với thay đổi nhỏ nhất.
Không mở rộng scope, không refactor file không liên quan.
Sau khi sửa chạy các lệnh Test trong task.
Nếu acceptance criteria mơ hồ, dừng và ghi câu hỏi thay vì tự đoán.
Cuối cùng cập nhật Status, ghi:
- đã làm gì
- file đã sửa
- test pass/fail
- việc còn lại
```

### Giữa ngày — checkpoint ngắn

Nếu Luna làm đúng, tiếp tục cùng task. Không mở chat mới cho cùng một task.

Nếu Luna bị kẹt, không gửi lại toàn bộ lịch sử. Gửi prompt này:

```text
Task hiện tại: [TÊN TASK]
Lỗi hiện tại: [ERROR NGẮN]
Đã thử: [1–3 Ý]
File liên quan: [DANH SÁCH]

Hãy tìm nguyên nhân gốc, đề xuất patch nhỏ nhất và chạy lại test.
Không refactor ngoài scope.
```

Nếu vẫn fail hai lần, dùng Sonnet:

```text
Đọc task file và output lỗi bên dưới.
Không sửa code. Hãy xác định nguyên nhân gốc trong tối đa 10 dòng,
chỉ ra file/line cần kiểm tra và đề xuất hướng sửa cho Codex.

Error:
[DÁN ERROR]
```

### Cuối ngày — đóng task

Chỉ đánh dấu `done` khi đã có:

```markdown
## Result
- Changed: ...
- Tests: pass/fail
- Manual QA: pass/fail/not run
- Risk: ...
- Next task: ...
```

Nếu có UI, dùng Antigravity Flash kiểm tra ba viewport. Nếu không có UI, bỏ qua bước này để tiết kiệm quota.

### Prompt QA cho Antigravity

```text
Kiểm tra task [URL + TASK].
Chỉ test các behavior sau: [3–5 BULLET].
Viewport: 390x844 và 1280x800.
Không sửa code. Trả về PASS hoặc FAIL, bước tái hiện và lỗi nghiêm trọng nhất.
```

### Prompt review cuối ngày cho Sonnet

Chỉ dùng khi task chạm gameplay hoặc backend:

```text
Review ngắn task [PATH TASK] và git diff hiện tại.
Tập trung vào phase, role, coin, socket duplicate, reconnect và regression.
Chỉ trả về finding có severity và file/line.
Nếu không có blocker, trả lời: PASS + residual risk trong tối đa 5 dòng.
Không sửa code.
```

## 13. Bảng quản lý tối giản

Chỉ cần một bảng Markdown hoặc GitHub Project:

| Task | Agent | Status | Test | Ghi chú |
| --- | --- | --- | --- | --- |
| Healer target | Luna | in progress | pending | phase 1 |
| Card flip | Luna | done | pass | mobile checked |
| Redis resume | Sonnet + Codex | blocked | fail | cần reproduce VPS |

Các trạng thái nên dùng: `planned`, `in progress`, `blocked`, `qa`, `done`.

## 14. Quy tắc không bị rối

- Một ngày chỉ có một task chính và tối đa hai task phụ nhỏ.
- Không đổi agent giữa chừng nếu chưa lưu summary.
- Không đưa cả log terminal dài; chỉ đưa error đầu tiên và stack trace liên quan.
- Không hỏi “hãy kiểm tra toàn bộ project” nếu chỉ sửa một phase.
- Mỗi prompt phải nói rõ scope, acceptance và test.
- Cuối ngày luôn ghi task tiếp theo để sáng hôm sau bắt đầu ngay.

## 15. Điều khiển workflow bằng điện thoại

Mô hình nên dùng:

```text
Điện thoại
  ↓
GitHub Issue / Pull Request
  ↓
Claude Code web/mobile hoặc GitHub Actions
  ↓
Branch riêng + test + report
  ↓
Bạn review và merge
```

### Cách đơn giản nhất

1. Tạo GitHub Issue từ điện thoại.
2. Dán prompt ngắn và link đến file task trong `.ai/tasks/`.
3. Gọi Claude bằng comment `@claude` để lập plan, review hoặc tạo patch.
4. GitHub Actions tự chạy lint, test và build.
5. Claude comment lại kết quả hoặc tạo PR.
6. Bạn review diff trên GitHub mobile.

Claude Code web/mobile có thể kết nối GitHub, nhận task từ điện thoại, tạo branch và để bạn review PR sau đó. [Claude Code on the web](https://code.claude.com/docs/en/web-quickstart)

### Comment command đề xuất

```text
@claude plan
Đọc .ai/tasks/[TASK].md. Không sửa code. Trả về plan tối đa 15 dòng.
```

```text
@claude review
Review PR này theo gameplay, socket duplicate, Redis, coin và regression.
Chỉ báo cáo finding có file/line và severity.
```

```text
@claude fix
Sửa các finding P0/P1 đã được xác nhận trong PR này.
Chạy test liên quan, không mở rộng scope.
```

```text
@claude summarize
Tóm tắt thay đổi, test, rủi ro và bước tiếp theo trong tối đa 10 dòng.
```

### GitHub Actions nên tự chạy

Mỗi Pull Request nên tự chạy:

```text
npm run lint
npm run test
npm run build
backend integration test
frontend E2E smoke test
```

Không nên cho CI tự deploy production hoặc tự merge. CI chỉ kiểm tra và báo cáo.

### Cách đưa Codex vào mô hình mobile

Ở giai đoạn đầu, không cần cố gọi Codex trực tiếp từ điện thoại. Dùng điện thoại để:

- tạo issue
- ghi acceptance criteria
- xem CI
- xem PR
- gửi yêu cầu review

Sau đó khi về máy, Codex đọc task file và implement. Nếu sau này cần fully remote, có thể chạy Codex CLI trên máy luôn bật hoặc runner riêng, nhưng phải thêm authentication, giới hạn quyền và cơ chế khóa branch.

### Cách kiểm tra UI tự động khi không có laptop

Antigravity không cần được gọi cho mọi task. Với UI quan trọng, để CI chạy Playwright screenshot ở các viewport 390px và 1280px. Bạn xem artifact screenshot từ GitHub mobile; chỉ mở Antigravity khi screenshot cho thấy lỗi cần tái hiện tương tác.

### Cấu trúc issue điện thoại

```markdown
## Goal
[Một câu]

## Acceptance
- [ ] ...
- [ ] ...

## Agent request
@claude plan / review / summarize

## Scope
[File hoặc module]
```

### Bảo vệ chi phí và source code

- Dùng `--max-turns` thấp cho Claude Action.
- Chỉ chạy Claude khi có label `ai-review` hoặc comment `@claude`.
- Giới hạn `paths` để CI không chạy lại vô ích.
- Không đưa secrets production vào prompt hoặc issue.
- Chỉ cấp quyền PR/Issue/Contents cần thiết.
- Review mọi branch agent tạo trước khi merge.

## Tài liệu tham khảo

- Codex model guidance: https://developers.openai.com/api/docs/models
- Claude Code overview: https://code.claude.com/docs/en/overview
- Google Antigravity: https://www.antigravity.google/
- Google One AI Pro và quota Antigravity: https://support.google.com/googleone/answer/14534406
