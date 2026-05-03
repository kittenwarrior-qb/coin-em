You are a senior QA automation engineer specializing in real-time multiplayer games.

Your task is to analyze my fullstack project (Node.js + Socket.IO backend, React frontend) and generate Playwright E2E tests.

## Project Context
- Multiplayer real-time game (similar to Werewolf / Mafia)
- 5–9 players per room
- Uses Socket.IO for real-time communication

## Requirements

### 1. Multi-user simulation
- Use Playwright browser contexts to simulate 5–10 players
- Each player must act independently
- Each player has unique name and joins same room

### 2. Core E2E flows to implement

#### Flow 1: Full game happy path
- All players join room
- Host starts game
- Go through all phases
- Perform basic valid actions
- Ensure phase transitions correctly
- Assert UI updates for all players

#### Flow 2: Real-time synchronization
- One player performs action (vote, coin, etc)
- Other players must see update immediately

#### Flow 3: Role-based behavior
- Identify player roles from UI
- Only allow valid role actions (silencer, healer, narrator)
- Assert invalid actions are blocked in UI

#### Flow 4: Reconnect scenario
- One player reloads page
- Must restore correct game state from server

#### Flow 5: Spam prevention (UI level)
- Rapid clicking actions
- Ensure UI prevents duplicate actions
- No duplicate UI state

### 3. Assertions
- UI reflects correct phase
- Player count correct
- Actions applied correctly
- No desync between players
- No duplicate actions visible

### 4. Constraints
- Do NOT test backend logic (already covered by unit tests)
- Focus only on user behavior and UI correctness
- Tests must be deterministic (no flaky timing issues)
- Use proper waits for socket events (not arbitrary timeout)

### 5. Output format
- Provide full Playwright test file
- Include helper functions:
  - createPlayer()
  - joinRoom()
  - performAction()
  - waitForPhase()
- Use clean, maintainable structure

Generate production-ready E2E test code.

lưu ý với những design test cho hợp lý 
Test Doubles (Đối tượng giả lập): Có 5 loại chính để thay thế dependency thực:
Dummy: Chỉ để lấp đầy tham số, không thực hiện gì
.
Fake: Bản thực thi đơn giản (ví dụ: In-memory DB thay vì DB thật)
.
Stub: Trả về giá trị hard-code cố định
.
Spy: Ghi lại thông tin truyền vào để kiểm tra method có được gọi không
.
Mock: Giả lập hành vi và kiểm tra sự tương tác (số lần gọi, tham số)
.
Quy trình và Quy chuẩn:
Mẫu AAA (Arrange-Act-Assert): Chia code test thành 3 phần: Thiết lập trạng thái - Thực hiện hành động - Khẳng định kết quả
.
Naming Convention: Tên test nên mô tả hành vi và kỳ vọng (ví dụ: invalid_input_returns_error) thay vì chi tiết kỹ thuật
.
Các Pattern thiết kế cho Unit Test:
Object Mother: Tạo các đối tượng mẫu có thể tái sử dụng để giảm lặp code trong phần Arrange
.
Builder Pattern: Giúp tạo đối tượng test linh hoạt với nhiều cấu hình khác nhau
.
Assert Object: Sử dụng class chuyên biệt để kiểm tra kết quả, giúp code test dễ đọc và bảo trì hơn
.
Humble Object: Giải pháp để xử lý các thành phần khó kiểm thử
.
Kỹ thuật nâng cao & Sai lầm cần tránh:
Parameterized Test: Chạy một bài test với nhiều bộ dữ liệu khác nhau để tăng độ bao phủ
.
Mutation Testing: Giải pháp thay thế cho vấn đề "100% Code Coverage" ảo, giúp kiểm tra chất lượng thực sự của các test case
.
Anti-patterns: Cần tránh việc lộ trạng thái private, test private method, hoặc phụ thuộc vào thời gian (volatile dependency)
.

n đang đi đúng hướng rồi, nhưng cần tổ chức lại cho “chuẩn production” một chút — vì CI/CD + code review + automation test mà làm lệch là sẽ thành rối rất nhanh.

Mình nói thẳng luôn:

👉 Appleboy dùng được, nhưng chỉ nên dùng cho deploy step, KHÔNG phải toàn bộ CI/CD pipeline

🧠 1. Tổng thể kiến trúc chuẩn cho bạn
🔥 Flow đúng nên là:
Developer push code
        ↓
GitHub Actions (CI)
        ↓
Lint + Unit test + Integration test
        ↓
E2E test (Playwright)
        ↓
Code Review (PR)
        ↓
Merge vào main
        ↓
GitHub Actions (CD)
        ↓
Build Docker image
        ↓
Deploy lên VPS (Appleboy SSH)
        ↓
Docker Compose restart
⚙️ 2. Công cụ bạn nên dùng
✅ CI/CD (bắt buộc)
GitHub Actions

👉 bạn đã đúng hướng

✅ Deploy
appleboy/ssh-action

👉 dùng để:

ssh vào VPS
pull code
docker compose up

✔️ Appleboy = OK cho project của bạn

✅ Code Review automation

Bạn có 3 lựa chọn:

🔹 Option 1 (Đơn giản nhất – khuyên dùng)

👉 GitHub native + rules

Require PR trước khi merge
Require CI pass
Require review (ít nhất 1 – có thể là bạn tự review 😅)

✔️ đủ cho solo dev

🔹 Option 2 (Auto review bằng AI)
CodeRabbit
Reviewdog

👉 nó sẽ:

comment trực tiếp vào PR
check bug, anti-pattern
🔹 Option 3 (Lint + static analysis)
ESLint
TypeScript strict
Prettier

👉 cái này bắt buộc phải có

🧩 3. Bạn nên tổ chức repo như sau
.github/
 └── workflows/
     ├── ci.yml        # test + lint
     ├── e2e.yml       # playwright
     └── deploy.yml    # deploy VPS

be/
fe/
docker-compose.yml
🚀 4. CI workflow (ci.yml)
name: CI

on:
  pull_request:
  push:
    branches: [develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: cd be && npm install
      - run: cd fe && npm install

      - name: Run backend tests
        run: cd be && npm test

      - name: Run frontend lint
        run: cd fe && npm run lint
🎭 5. E2E workflow (Playwright)
name: E2E

on:
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - run: npm install
      - run: npx playwright install

      - run: docker compose up -d

      - run: npx playwright test
🚀 6. Deploy workflow (Appleboy)
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: SSH Deploy
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: root
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app
            git pull origin main
            docker compose down
            docker compose up -d --build
⚠️ 7. Những sai lầm cần tránh
❌ 1. Dùng Appleboy cho CI

👉 sai — nó chỉ để deploy

❌ 2. Không tách CI và CD

👉 phải tách:

CI = test
CD = deploy
❌ 3. Deploy mỗi lần push

👉 nguy hiểm

✔️ nên:

PR → test
merge → deploy
❌ 4. Không có E2E

👉 với game realtime = dễ chết production

🔥 8. Câu hỏi bạn quan tâm nhất
❓ “Solo dev có cần code review không?”

👉 Có, nhưng:

không cần người khác
dùng:
CI check
AI review
rule PR

👉 coi như “robot reviewer”

💡 9. Stack tối ưu cho bạn
Mục	Tool
Unit test	Vitest
Integration	Vitest
E2E	Playwright
CI/CD	GitHub Actions
Deploy	Appleboy
Review	CodeRabbit + ESLint
🎯 10. Kết luận
Appleboy → dùng đúng chỗ (deploy) ✅
GitHub Actions → xương sống pipeline ✅
Code review → dùng AI + CI thay người ✅
E2E → bắt buộc với game của bạn ⚠️

Nếu bạn muốn, mình có thể: