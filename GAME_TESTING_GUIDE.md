# 🎮 HƯỚNG DẪN TEST GAME EMCOIN - CHI TIẾT TỪNG BƯỚC

## 📋 TỔNG QUAN LUỒNG GAME

Game EmCoin có **8 bước chính** trong mỗi vòng chơi (round):

1. **Role Reveal** - Chia vai trò
2. **Night Mode** - Vai trò đặc biệt hành động
3. **Day - NTG bốc Tình huống & Cảm xúc** - NTG bốc thẻ và kể chuyện
4. **Reflection** - NTG chọn thẻ phản tư
5. **Self-care** - NTG chọn bí kíp ôm
6. **Voting** - Đoán vai trò
7. **Reward** - Tặng coin
8. **End Round** - Tổng kết và bắt đầu round mới

---

## 🎯 PHASE 1: ROLE REVEAL

### **Bước 1: Role Reveal (Chia vai trò)**

**Màn hình hiển thị:**
- Giữa bàn: 5 deck thẻ úp (Tình huống, Cảm xúc, Phản tư, Bí kíp)
- 9 ô player xếp lưới 3x3
- Góc trên trái: Coin counter (Đỏ/Vàng/Xanh)
- Góc trên phải: Nút Back
- Góc trên giữa: "Round 1/1 • role-reveal"

**Khi nào xảy ra:**
- Tự động khi game bắt đầu (status = 'playing')
- Hoặc Moderator click nút **"Bắt đầu game"**

**Màn hình hiển thị:**
- **Mỗi người chơi**: Thấy popup thẻ vai trò của MÌNH (1 lần duy nhất)
  - Thẻ úp → Click để lật → Thấy vai trò
  - Vuốt xuống để đóng
- **Vai trò công khai** (hiển thị badge trên đầu card):
  - 👑 Người Quản trò (Moderator)
  - 💖 Người Trao Gửi (NTG)
- **Vai trò bí mật** (chỉ mình biết):
  - Người Im Lặng (x2)
  - Người Kết Nối (x2)
  - Người Gợi Mở
  - Người Dẫn Lối
  - Người Chữa Lành

**Người chơi làm gì:**
1. Xem vai trò của mình
2. Nhớ nhiệm vụ bí mật
3. Đóng popup
4. **Moderator**: Click nút **"Chuyển sang Night"**

**Cách test:**
```
✅ Mỗi người chỉ thấy popup 1 lần
✅ Click vào avatar mình → Có thể xem lại vai trò bất cứ lúc nào
✅ Click vào avatar người khác → Không thấy vai trò (chỉ thấy popup tặng coin)
✅ Badge "Quản trò" và "Trao gửi" hiển thị trên đầu card
```

---

## 🌙 PHASE 2: NIGHT MODE

### **Bước 2: Night (Đêm - Vai trò hành động)**

**Khi nào xảy ra:**
- Moderator click **"Chuyển sang Night"**

**Màn hình hiển thị:**
- Background chuyển tối (có thể thêm overlay xanh/tím)
- Chat bị khóa (hoặc chỉ Moderator chat được)
- Moderator thấy nút **"Chuyển sang Day"**

**Người chơi làm gì:**

**Moderator (offline/voice):**
1. Hô: "Trời tối, mọi người nhắm mắt"
2. Gọi từng vai trò:
   - "Người Chữa Lành tỉnh giấc" → Người này chỉ vào 1 người để heal
   - "Người Im Lặng tỉnh giấc" → Người này chỉ vào 1 người để mute
   - "Người Dẫn Lối tỉnh giấc" → Người này xem thẻ Tình huống và chọn 1 thẻ Bí kíp
3. Hô: "Trời sáng"
4. Click nút **"Chuyển sang Day"**

**Trong app (hiện tại):**
- Người có vai trò đặc biệt click vào avatar người khác
- Hệ thống ghi nhận action (heal/mute)

**Cách test:**
```
✅ Người Chữa Lành click vào 1 người → Người đó có badge ✨ (healed)
✅ Người Im Lặng click vào 1 người → Người đó có badge 🔇 (muted)
✅ Moderator click "Chuyển sang Day" → Chuyển phase
```

---

## ☀️ PHASE 3: DAY MODE - STORYTELLING

### **Bước 3: NTG Bốc Thẻ Tình Huống & Cảm Xúc**

**Khi nào xảy ra:**
- Moderator click **"Chuyển sang Day"**

**Màn hình hiển thị:**
- **NTG**: Thấy nút **"📋 Bốc thẻ Tình huống"** (màu vàng)
- **Người khác**: Chỉ xem, chờ NTG bốc thẻ

**NTG làm gì - BƯỚC 1: Bốc Tình Huống**
1. Click nút **"📋 Bốc thẻ Tình huống"**
2. Hệ thống random 1 thẻ từ deck Situation
3. Thẻ **LẬT NGỬA** ở giữa bàn cho tất cả mọi người xem
   - Animation: Zoom to center (3s) → Thu nhỏ lại
   - Label: "📋 Tình huống"
4. **Tất cả người chơi** đọc thẻ Tình huống

**NTG làm gì - BƯỚC 2: Chọn Cảm Xúc**
5. Sau khi đọc xong, NTG thấy nút **"💭 Chọn thẻ Cảm xúc"** (màu hồng)
6. Click nút **"💭 Chọn thẻ Cảm xúc"**
7. Popup hiện ra với 64 thẻ cảm xúc
8. Có 4 tab: Cơ bản / Nhẹ / Mạnh / Nâng cao
9. Click vào 1 thẻ → Thẻ được highlight (border xanh)
10. Click nút **"✓ Chọn thẻ này"**
11. Popup đóng
12. Thẻ cảm xúc hiển thị ở giữa bàn (dưới thẻ Tình huống)
    - Border màu hồng
    - Label: "💭 Cảm xúc của NTG"
    - Animation: Scale + rotate

**NTG làm gì - BƯỚC 3: Kể Chuyện**
13. Sau khi chọn xong cảm xúc, NTG bắt đầu kể chuyện qua mic/chat
14. Người khác lắng nghe và phản hồi theo vai trò

**Moderator làm gì:**
- Sau khi NTG kể xong → Click nút **"Chọn Reflection"**

**Cách test:**
```
✅ NTG thấy nút "Bốc thẻ Tình huống" đầu tiên
✅ Click → Thẻ Tình huống lật ngửa cho tất cả xem
✅ Sau đó NTG mới thấy nút "Chọn thẻ Cảm xúc"
✅ Popup hiện 64 thẻ với 4 tab
✅ Chọn thẻ → Thẻ hiển thị giữa bàn với border hồng
✅ Moderator thấy nút "Chọn Reflection" sau khi NTG chọn xong
```

---

### **Bước 4: Reflection (Phản tư)**

**Khi nào xảy ra:**
- Moderator click **"Chọn Reflection"**

**Màn hình hiển thị:**
- **NTG**: Thấy nút **"🤔 Chọn Reflection (0/3)"** (màu xanh)
- **Người khác**: Chỉ xem

**NTG làm gì:**
1. Click nút **"🤔 Chọn Reflection"**
2. Popup hiện ra với 14 thẻ Phản tư
3. Click vào 1 thẻ → Highlight
4. Click **"✓ Chọn thẻ này"**
5. Thẻ hi ở giữa bàn (dưới thẻ Cảm xúc)
6. **Lặp lại** tối đa 3 lần (có thể chọn 1-3 thẻ)
7. Các thẻ xếp thành hàng ngang

**NTG trả lời:**
- Đọc câu hỏi trên thẻ
- Suy ngẫm và chia sẻ với nhóm

**Moderator làm gì:**
- Sau khi NTG chọn đủ (1-3 thẻ) → Click nút **"Chọn Bí kíp"**

**Cách test:**
```
✅ NTG có thể chọn 1-3 thẻ
✅ Nút hiển thị số lượng: "Chọn Reflection (1/3)"
✅ Thẻ xếp thành hàng ngang ở giữa bàn
✅ Moderator thấy nút "Chọn Bí kíp"
```

---

### **Bước 5: Self-care (Bí kíp ôm)**

**Khi nào xảy ra:**
- Moderator click **"Chọn Bí kíp"**

**Màn hình hiển thị:**
- **NTG**: Thấy nút **"🌟 Chọn Bí kíp ôm"** (màu xanh lá)
- **Người khác**: Chỉ xem

**NTG làm gì:**
1. Click nút **"🌟 Chọn Bí kíp ôm"**
2. Popup hiện ra với 15 thẻ Bí kíp
3. Click vào 1 thẻ → Highlight
4. Click **"✓ Chọn thẻ này"**
5. Thẻ hiển thị ở giữa bàn (dưới thẻ Reflection)
   - Border màu xanh lá
   - Label: "🌟 Bí kíp ôm"
   - Animation: Scale + glow

**Cả nhóm làm gì:**
- Đọc hướng dẫn trên thẻ
- Cùng thực hiện (ví dụ: thở sâu, vỗ tay, vươn vai...)

**Moderator làm gì:**
- Sau khi thực hiện xong → Click nút **"Đoán vai trò"**

**Cách test:**
```
✅ Chỉ NTG thấy nút "Chọn Bí kíp ôm"
✅ Popup hiện 15 thẻ
✅ Thẻ hiển thị giữa bàn với border xanh lá
✅ Moderator thấy nút "Đoán vai trò"
```

---

## 🎭 PHASE 4: VOTING

### **Bước 6: Guess Role (Đoán vai trò)**

**Khi nào xảy ra:**
- Moderator click **"Đoán vai trò"**

**Màn hình hiển thị:**ển thị
- Câu hỏi: "Ai là Người Im Lặng?"
- Tất cả avatar có thể click để vote
- Countdown: 10 giây (optional)

**Người chơi làm gì:**
1. Click vào avatar người mình nghĩ là "Người Im Lặng"
2. Hệ thống ghi nhận vote
3. Sau 10s hoặc khi tất cả vote xong:
   - Animation: Mask break effect
   - Reveal tất cả vai trò bí mật

**Moderator làm gì:**
- Click nút **"Tặng coin"**

**Cách test:**
```
✅ Tất cả người chơi có thể vote
✅ Có countdown timer
✅ Reveal animation đẹp
✅ Hiển thị đúng vai trò của mọi người
```

---

## 🎁 PHASE 5: REWARD

### **Bước 7: Reward (Tặng coin)**

**Khi nào xảy ra:**
- Moderator click **"Tặng coin"**

**Màn hình hiển thị:**
- Tất cả thẻ đã chọn vẫn hiển thị ở giữa
- Người chơi có thể tặng coin cho nhau

**Người chơi làm gì:**
1. Click vào avatar người khác
2. Popup hiện 3 loại coin:
   - ❤️ Đỏ: Lòng tốt vô hạn
   - 💛 Vàng: Trao yêu thương
   - 💚 Xanh: Được yêu thương
3. Click vào coin muốn tặng
4. Animation: Coin bay từ mình → người nhận
5. Số coin của người nhận tăng lên

**Moderator làm gì:**
- Sau khi tất cả tặng xong → Click nút **"Kết thúc round"**

**Cách test:**
```
✅ Click avatar → Popup coin
✅ Tặng coin → Animation bay
✅ Số coin tăng đúng
✅ Moderator thấy nút "Kết thúc round"
```

---

## 🔄 PHASE 6: END ROUND

### **Bước 8: End Round (Kết thúc vòng)**

**Khi nào xảy ra:**
- Moderator click **"Kết thúc round"**

**Màn hình hiển thị:**
- Modal/Screen hiển thị:
  - Tổng coin của mỗi người
  - Input: "Hôm nay bạn gọi tên cảm xúc nào?"
  - Confetti animation

**Người chơi làm gì:**
1. Nhìn lại số coin của mình
2. Nhập câu trả lời (text hoặc voice)
3. Chia sẻ cảm nhận

**Moderator làm gì:**
- Chọn NTG mới cho round tiếp theo
- Click **"Bắt đầu round mới"**
- Hệ thống reset về Bước 0

**Cách test:**
```
✅ Hiển thị đúng số coin
✅ Input hoạt động
✅ Confetti animation
✅ Reset về Bước 0 khi bắt đầu round mới
```

---

---

## 🚨 CRITICAL BUGS & EDGE CASES - PHẢI TEST

### **🔴 CRITICAL: Race Conditions & State Consistency**

#### **1. Role Reveal - Lộ vai trò & Double render**

**Bug tiềm ẩn:**
```
❌ Multi-tab: Mở 2 tab cùng 1 user → Thấy role popup 2 lần
❌ Reconnect: F5 giữa role reveal → Có thể thấy role của người khác
❌ Double render: React strict mode → Role popup hiện 2 lần
❌ Network delay: Socket event đến muộn → Không thấy role
```

**Test cases PHẢI chạy:**
```
🧪 TEST 1: Multi-tab Protection
1. Login user A trên Chrome
2. Mở thêm tab mới, login cùng user A
3. Start game
✅ Expected: Chỉ 1 tab thấy role popup
✅ Expected: Tab kia bị kick hoặc readonly mode
❌ Current: Cả 2 tab đều thấy role → Có thể lộ role

🧪 TEST 2: Reconnect During Role Reveal
1. Start game → Role reveal phase
2. User A: F5 page ngay khi popup role hiện
3. Reconnect vào room
✅ Expected: Vẫn thấy đúng role của mình
❌ Risk: Có thể thấy role của người khác nếu state sync sai

🧪 TEST 3: React Strict Mode Double Render
1. Enable React.StrictMode
2. Start game
✅ Expected: Role popup chỉ hiện 1 lần
❌ Current: Có thể hiện 2 lần do useEffect chạy 2 lần

🧪 TEST 4: Network Delay
1. Throttle network to 3G (Chrome DevTools)
2. Start game
3. Socket event 'role_assigned' đến sau 5s
✅ Expected: Vẫn thấy role popup
❌ Risk: Timeout → Không thấy role
```

**Giải pháp cần implement:**
```typescript
// Frontend: Idempotent role reveal
const [roleRevealed, setRoleRevealed] = useState(false)

useEffect(() => {
  if (roleRevealed) return // Chỉ hiện 1 lần
  
  socket.on('role_assigned', (data) => {
    if (!roleRevealed) {
      showRolePopup(data.role)
      setRoleRevealed(true)
    }
  })
}, [roleRevealed])

// Backend: Server là source of truth
socket.on('request_role', ({ roomId, userId }) => {
  const room = roomRepository.findById(roomId)
  const player = room.players.find(p => p.userId === userId)
  
  // Chỉ gửi role cho đúng người
  socket.emit('role_assigned', { 
    role: player.role,
    timestamp: Date.now() // Để client check duplicate
  })
})
```

---

#### **2. Night Phase - Race Condition khi nhiều action cùng lúc**

**Bug tiềm ẩn:**
```
❌ 2 Người Im Lặng click cùng 1 target cùng lúc → Mute 2 lần?
❌ Người Chữa Lành heal sau khi phase đã chuyển → Action bị mất
❌ Click spam: Click 10 lần vào 1 người → Gửi 10 events
❌ Action conflict: Heal và Mute cùng 1 người → Ai thắng?
```

**Test cases PHẢI chạy:**
```
🧪 TEST 5: Concurrent Actions - Same Target
1. 2 Người Im Lặng (Player A & B)
2. Cả 2 click vào Player C cùng lúc (trong 100ms)
✅ Expected: Chỉ 1 action được accept
✅ Expected: Player B thấy error "Target đã bị chọn"
❌ Current: Cả 2 action đều gửi → Server xử lý sao?

🧪 TEST 6: Action After Phase Transition
1. Night phase, countdown 30s
2. Người Chữa Lành chờ đến giây thứ 29
3. Click heal → Nhưng server đã chuyển sang Day
✅ Expected: Action bị reject với error "Phase đã kết thúc"
❌ Risk: Action vẫn được accept → Sai logic

🧪 TEST 7: Spam Click Protection
1. Night phase
2. Người Im Lặng click vào Player A 10 lần liên tục
✅ Expected: Chỉ 1 action được gửi
✅ Expected: UI disable button sau lần click đầu
❌ Current: Gửi 10 events → Server overload

🧪 TEST 8: Action Conflict Resolution
1. Người Chữa Lành heal Player A
2. Người Im Lặng mute Player A
3. Cả 2 action gửi cùng lúc
✅ Expected: Server có priority rule (heal > mute?)
✅ Expected: Hiển thị đúng badge (✨ hoặc 🔇)
❌ Risk: Hiển thị cả 2 badge → Confusing
```

**Giải pháp cần implement:**
```typescript
// Backend: Action Queue + Validation
class NightPhaseManager {
  private actionQueue: Map<string, GameAction> = new Map()
  private processedTargets: Set<string> = new Set()
  
  executeAction(room: Room, action: GameAction): Result {
    // 1. Validate phase
    if (room.currentPhase !== 'night') {
      return { success: false, error: 'PHASE_ENDED' }
    }
    
    // 2. Check duplicate target
    if (this.processedTargets.has(action.targetId)) {
      return { success: false, error: 'TARGET_ALREADY_SELECTED' }
    }
    
    // 3. Validate role permission
    if (!this.canPerformAction(action.actorRole, action.type)) {
      return { success: false, error: 'INVALID_ROLE' }
    }
    
    // 4. Add to queue
    this.actionQueue.set(action.id, action)
    this.processedTargets.add(action.targetId)
    
    // 5. Apply action
    this.applyAction(room, action)
    
    return { success: true }
  }
  
  // Priority: heal > mute
  private applyAction(room: Room, action: GameAction) {
    const target = room.players.find(p => p.id === action.targetId)
    
    if (action.type === 'heal') {
      target.status.healed = true
      target.status.muted = false // Heal removes mute
    } else if (action.type === 'mute' && !target.status.healed) {
      target.status.muted = true
    }
  }
}

// Frontend: Debounce + Disable button
const handleNightAction = useMemo(
  () => debounce((targetId: string) => {
    if (actionSent) return // Prevent spam
    
    setActionSent(true)
    socket.emit('night_action', { roomId, targetId, action: 'mute' })
    
    // Disable button
    setButtonDisabled(true)
  }, 300),
  [actionSent]
)
```

---

#### **3. Day Phase - NTG bốc thẻ: Missing step & Sync issues**

**Bug tiềm ẩn:**
```
❌ NTG skip bước: Bốc Tình huống → Không chọn Cảm xúc → Nhảy luôn sang Reflection
❌ Moderator click "Chọn Reflection" trước khi NTG chọn Cảm xúc
❌ NTG disconnect giữa chừng → Ai tiếp tục?
❌ 2 người cùng thấy nút "Bốc thẻ" → Cả 2 click → 2 thẻ Tình huống?
```

**Test cases PHẢI chạy:**
```
🧪 TEST 9: Skip Step - Missing Emotion
1. NTG bốc Tình huống
2. Không click "Chọn Cảm xúc"
3. Moderator click "Chọn Reflection"
✅ Expected: Button bị disable cho đến khi NTG chọn Cảm xúc
❌ Risk: Cho phép skip → Game state sai

🧪 TEST 10: Moderator Force Skip
1. NTG đang chọn Cảm xúc (chưa xong)
2. Moderator click "Chọn Reflection" ngay
✅ Expected: Hiện warning "NTG chưa chọn xong"
❌ Risk: Phase chuyển → NTG không chọn được nữa

🧪 TEST 11: NTG Disconnect Mid-Action
1. NTG bốc Tình huống xong
2. Đang chọn Cảm xúc → Disconnect (F5 hoặc mất mạng)
3. Reconnect sau 10s
✅ Expected: Vẫn thấy nút "Chọn Cảm xúc"
✅ Expected: Thẻ Tình huống vẫn hiển thị
❌ Risk: State mất → Phải bốc lại từ đầu

🧪 TEST 12: Double Draw - Race Condition
1. Có bug: 2 người cùng thấy nút "Bốc thẻ Tình huống"
2. Cả 2 click cùng lúc
✅ Expected: Chỉ 1 người được bốc
✅ Expected: Người kia thấy error
❌ Risk: 2 thẻ Tình huống hiện ra → Confusing
```

**Giải pháp cần implement:**
```typescript
// Backend: State Machine với validation
class DayPhaseManager {
  private requiredSteps = ['draw_situation', 'choose_emotion', 'storytelling']
  private completedSteps: Set<string> = new Set()
  
  canAdvanceToReflection(room: Room): boolean {
    // Phải hoàn thành tất cả steps
    return this.requiredSteps.every(step => 
      this.completedSteps.has(step)
    )
  }
  
  drawSituation(room: Room, userId: string): Result {
    // 1. Check if already drawn
    if (this.completedSteps.has('draw_situation')) {
      return { success: false, error: 'ALREADY_DRAWN' }
    }
    
    // 2. Check if user is NTG
    if (room.currentNTG !== userId) {
      return { success: false, error: 'NOT_NTG' }
    }
    
    // 3. Draw card
    const card = this.deckManager.drawSituation()
    room.currentCards.situation = card
    this.completedSteps.add('draw_situation')
    
    return { success: true, card }
  }
  
  chooseEmotion(room: Room, userId: string, emotionId: string): Result {
    // Must draw situation first
    if (!this.completedSteps.has('draw_situation')) {
      return { success: false, error: 'MUST_DRAW_SITUATION_FIRST' }
    }
    
    // ... rest of logic
  }
}

// Frontend: Conditional rendering based on server state
{room.currentPhase === 'day' && (
  <>
    {!room.completedSteps.includes('draw_situation') && isNTG && (
      <Button onClick={handleDrawSituation}>Bốc thẻ Tình huống</Button>
    )}
    
    {room.completedSteps.includes('draw_situation') && 
     !room.completedSteps.includes('choose_emotion') && isNTG && (
      <Button onClick={handleChooseEmotion}>Chọn thẻ Cảm xúc</Button>
    )}
    
    {room.completedSteps.includes('choose_emotion') && isModerator && (
      <Button onClick={handleNextPhase}>Chọn Reflection</Button>
    )}
  </>
)}
```

---

#### **4. Voting Phase - Spam vote & Disconnect**

**Bug tiềm ẩn:**
```
❌ Player vote 10 lần liên tục → Gửi 10 events
❌ Player disconnect giữa voting → Vote của họ mất?
❌ Countdown hết nhưng chưa đủ người vote → Làm gì?
❌ Player vote xong → Đổi ý → Vote lại → Có được không?
```

**Test cases PHẢI chạy:**
```
🧪 TEST 13: Spam Vote Protection
1. Voting phase bắt đầu
2. Player A click vote Player B 10 lần trong 1s
✅ Expected: Chỉ 1 vote được gửi
✅ Expected: Button disable sau lần click đầu
❌ Current: Gửi 10 events → Server phải handle

🧪 TEST 14: Vote During Disconnect
1. Player A vote Player B
2. Ngay sau đó disconnect (mất mạng)
3. Reconnect sau 5s
✅ Expected: Vote vẫn được lưu
✅ Expected: UI hiển thị "Bạn đã vote Player B"
❌ Risk: Vote bị mất → Phải vote lại

🧪 TEST 15: Timeout With Incomplete Votes
1. Voting phase, 10 players
2. Chỉ 7 người vote
3. Countdown hết 10s
✅ Expected: Tự động reveal với 7 votes
✅ Expected: 3 người không vote = abstain
❌ Risk: Game bị stuck chờ mãi

🧪 TEST 16: Change Vote
1. Player A vote Player B
2. Đổi ý, click vote Player C
✅ Expected: Vote chuyển từ B → C
✅ Expected: Hiển thị "Bạn đã đổi vote"
❌ Risk: Cả 2 votes đều được tính → Sai logic
```

**Giải pháp cần implement:**
```typescript
// Backend: Vote Manager với timeout
class VotingManager {
  private votes: Map<string, string> = new Map() // voterId → targetId
  private votingDeadline: number
  
  startVoting(room: Room, duration: number = 10000) {
    this.votes.clear()
    this.votingDeadline = Date.now() + duration
    
    // Auto-reveal sau timeout
    setTimeout(() => {
      this.revealVotes(room)
    }, duration)
  }
  
  castVote(voterId: string, targetId: string): Result {
    // 1. Check timeout
    if (Date.now() > this.votingDeadline) {
      return { success: false, error: 'VOTING_ENDED' }
    }
    
    // 2. Allow change vote
    const previousVote = this.votes.get(voterId)
    this.votes.set(voterId, targetId)
    
    return { 
      success: true, 
      changed: !!previousVote,
      previousTarget: previousVote 
    }
  }
  
  revealVotes(room: Room) {
    // Count votes
    const voteCount = new Map<string, number>()
    this.votes.forEach((targetId) => {
      voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1)
    })
    
    // Broadcast results
    io.to(room.id).emit('votes_revealed', {
      votes: Array.from(this.votes.entries()),
      voteCount: Array.from(voteCount.entries()),
      roles: room.players.map(p => ({ id: p.id, role: p.role }))
    })
  }
}

// Frontend: Optimistic UI + Rollback
const [myVote, setMyVote] = useState<string | null>(null)
const [voteConfirmed, setVoteConfirmed] = useState(false)

const handleVote = (targetId: string) => {
  // Optimistic update
  setMyVote(targetId)
  
  socket.emit('cast_vote', { roomId, targetId }, (response) => {
    if (response.success) {
      setVoteConfirmed(true)
    } else {
      // Rollback
      setMyVote(null)
      showError(response.error)
    }
  })
}
```

---

#### **5. Reward Phase - Spam coin & Overflow**

**Bug tiềm ẩn:**
```
❌ Player A tặng Player B 100 coins trong 1s → Spam click
❌ Coin overflow: Player có 999999 coins → UI vỡ
❌ Tặng coin cho chính mình → Có được không?
❌ Tặng coin âm (hack request) → Trừ coin của người khác?
```

**Test cases PHẢI chạy:**
```
🧪 TEST 17: Spam Coin Protection
1. Reward phase
2. Player A click tặng coin cho Player B 50 lần liên tục
✅ Expected: Rate limit 1 coin/500ms
✅ Expected: Sau 10 coins → Cooldown 5s
❌ Current: Gửi 50 events → Server crash?

🧪 TEST 18: Coin Overflow
1. Player A có 999 coins
2. Nhận thêm 100 coins
✅ Expected: Cap tại 999 (hoặc 9999)
✅ Expected: UI hiển thị "999+"
❌ Risk: Số quá lớn → UI vỡ layout

🧪 TEST 19: Self-Gift Prevention
1. Player A click vào avatar của chính mình
2. Chọn coin để tặng
✅ Expected: Hiện error "Không thể tặng cho chính mình"
❌ Risk: Cho phép → Tự tăng coin

🧪 TEST 20: Negative Coin Hack
1. Hacker modify request: { amount: -10 }
2. Gửi lên server
✅ Expected: Server validate amount > 0
✅ Expected: Reject request
❌ Risk: Trừ coin của người khác
```

**Giải pháp cần implement:**
```typescript
// Backend: Rate Limiter + Validation
class CoinManager {
  private readonly MAX_COINS = 999
  private readonly RATE_LIMIT = 500 // ms
  private lastGiftTime: Map<string, number> = new Map()
  
  giveCoin(giverId: string, receiverId: string, type: CoinType): Result {
    // 1. Prevent self-gift
    if (giverId === receiverId) {
      return { success: false, error: 'CANNOT_GIFT_SELF' }
    }
    
    // 2. Rate limit
    const lastTime = this.lastGiftTime.get(giverId) || 0
    if (Date.now() - lastTime < this.RATE_LIMIT) {
      return { success: false, error: 'RATE_LIMITED' }
    }
    
    // 3. Validate coin type
    if (!['red', 'yellow', 'green'].includes(type)) {
      return { success: false, error: 'INVALID_COIN_TYPE' }
    }
    
    // 4. Apply coin (with cap)
    const receiver = room.players.find(p => p.id === receiverId)
    receiver.coins[type] = Math.min(
      receiver.coins[type] + 1,
      this.MAX_COINS
    )
    
    // 5. Update rate limit
    this.lastGiftTime.set(giverId, Date.now())
    
    return { success: true }
  }
}

// Frontend: Debounce + Visual feedback
const handleGiveCoin = useMemo(
  () => debounce((receiverId: string, coinType: CoinType) => {
    // Show loading
    setGivingCoin(true)
    
    socket.emit('give_coin', { roomId, receiverId, coinType }, (response) => {
      setGivingCoin(false)
      
      if (response.success) {
        // Show animation
        playCoinAnimation(myId, receiverId, coinType)
      } else {
        showError(response.error)
      }
    })
  }, 500),
  []
)
```

---

#### **6. End Round - Reset state & Reconnect**

**Bug tiềm ẩn:**
```
❌ Reset state sai → Round mới vẫn còn thẻ cũ
❌ Player reconnect giữa end round → Thấy gì?
❌ Moderator click "Bắt đầu round mới" 2 lần → 2 rounds?
❌ Chưa chọn NTG mới → Bắt đầu round → Ai là NTG?
```

**Test cases PHẢI chạy:**
```
🧪 TEST 21: Incomplete State Reset
1. End round
2. Start round mới
3. Check: Thẻ Tình huống, Cảm xúc, Reflection cũ còn không?
✅ Expected: Tất cả thẻ bị clear
✅ Expected: Chỉ giữ lại coins
❌ Risk: Thẻ cũ vẫn hiển thị → Confusing

🧪 TEST 22: Reconnect During End Round
1. End round, đang hiển thị modal tổng kết
2. Player A disconnect
3. Reconnect sau 5s
✅ Expected: Vẫn thấy modal tổng kết
✅ Expected: Thấy đúng coins của mình
❌ Risk: Nhảy về setup screen → Mất context

🧪 TEST 23: Double Start Round
1. End round
2. Moderator click "Bắt đầu round mới"
3. Ngay sau đó click lại lần 2 (double click)
✅ Expected: Chỉ 1 round được tạo
✅ Expected: Button disable sau lần click đầu
❌ Risk: Tạo 2 rounds → Game state vỡ

🧪 TEST 24: Missing NTG Selection
1. End round
2. Moderator không chọn NTG mới
3. Click "Bắt đầu round mới"
✅ Expected: Hiện error "Vui lòng chọn NTG"
✅ Expected: Button bị disable
❌ Risk: Round mới không có NTG → Game stuck
```

**Giải pháp cần implement:**
```typescript
// Backend: Clean state reset
class RoundManager {
  endRound(room: Room): void {
    // 1. Save final state
    this.saveRoundHistory(room)
    
    // 2. Clear game state (keep coins)
    room.currentCards = {
      situation: null,
      emotion: null,
      reflections: [],
      selfcare: null
    }
    room.completedSteps = []
    room.votes = []
    room.nightActions = []
    
    // 3. Reset player status (keep coins)
    room.players.forEach(player => {
      player.status = {
        healed: false,
        muted: false,
        voted: false
      }
      // Keep: player.coins
    })
    
    // 4. Increment round
    room.currentRound++
    room.currentPhase = 'waiting'
    room.currentNTG = null // Must select new NTG
  }
  
  startNewRound(room: Room, newNTGId: string): Result {
    // 1. Validate NTG selected
    if (!newNTGId) {
      return { success: false, error: 'NTG_NOT_SELECTED' }
    }
    
    // 2. Prevent double start
    if (room.currentPhase !== 'waiting') {
      return { success: false, error: 'ROUND_ALREADY_STARTED' }
    }
    
    // 3. Assign new roles
    this.roleManager.assignRoles(room, newNTGId)
    
    // 4. Start role reveal
    room.currentPhase = 'role_reveal'
    
    return { success: true }
  }
}
```

---

### **🔴 CRITICAL: Reconnect System - PHẢI TEST KỸ**

**Scenarios cần test:**

```
🧪 TEST 25: Reconnect During Role Reveal
1. Game start, role reveal phase
2. Player A: F5 ngay khi thấy role popup
3. Reconnect
✅ Expected: Vẫn thấy role của mình
✅ Expected: Không thấy role người khác
❌ Risk: State sync sai → Thấy role sai

🧪 TEST 26: Reconnect During Night (After Action)
1. Night phase
2. Người Im Lặng đã mute Player B
3. Disconnect → Reconnect
✅ Expected: Thấy badge 🔇 trên Player B
✅ Expected: Button "Mute" bị disable (đã action rồi)
❌ Risk: Có thể mute lại → Double action

🧪 TEST 27: Reconnect During Voting
1. Voting phase
2. Player A đã vote Player B
3. Disconnect → Reconnect
✅ Expected: Thấy "Bạn đã vote Player B"
✅ Expected: Có thể đổi vote
❌ Risk: Vote bị mất → Phải vote lại

🧪 TEST 28: Reconnect After Game Ended
1. Game đã end
2. Player disconnect
3. Reconnect sau 1 giờ
✅ Expected: Thấy "Game đã kết thúc"
✅ Expected: Có thể join game mới
❌ Risk: Vẫn ở phase cũ → Stuck
```

**Giải pháp reconnect system:**
```typescript
// Backend: Reconnect handler
socket.on('reconnect_room', async ({ roomId, userId, oldSocketId }) => {
  const room = roomRepository.findById(roomId)
  if (!room) {
    return socket.emit('error', { code: 'ROOM_NOT_FOUND' })
  }
  
  // Find player
  const player = room.players.find(p => p.userId === userId)
  if (!player) {
    return socket.emit('error', { code: 'PLAYER_NOT_FOUND' })
  }
  
  // Update socket ID
  player.socketId = socket.id
  
  // Leave old socket from room
  if (oldSocketId) {
    io.sockets.sockets.get(oldSocketId)?.leave(roomId)
  }
  
  // Join new socket to room
  socket.join(roomId)
  
  // Send full state
  socket.emit('reconnect_success', {
    room: this.sanitizeRoomForPlayer(room, userId),
    yourRole: player.role,
    yourActions: this.getPlayerActions(room, userId),
    yourVote: this.getPlayerVote(room, userId)
  })
})

// Sanitize: Chỉ gửi info mà player được biết
private sanitizeRoomForPlayer(room: Room, userId: string): any {
  return {
    ...room,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      coins: p.coins,
      status: p.status,
      // Chỉ reveal role nếu đang ở phase reveal hoặc end
      role: (room.currentPhase === 'voting_reveal' || room.currentPhase === 'end')
        ? p.role
        : (p.userId === userId ? p.role : null) // Chỉ thấy role của mình
    }))
  }
}
```

---

### **⚠️ HIGH: Server Restart - Data Loss**

**Test case:**
```
🧪 TEST 29: Server Restart During Game
1. Game đang chơi, đang ở phase Reflection
2. Restart server (Ctrl+C → npm start)
3. Players vẫn ở trên browser
✅ Expected: Reconnect tự động
✅ Expected: Game state được restore
❌ CURRENT: Tất cả rooms bị mất → Players bị kick

🧪 TEST 30: Deploy New Version
1. 10 rooms đang chơi
2. Deploy version mới → Server restart
✅ Expected: Rooms được save vào Redis/File
✅ Expected: Load lại khi server start
❌ CURRENT: Tất cả rooms mất → User experience tệ
```

**Giải pháp:**
```typescript
// Implement persistence (xem ARCHITECTURE_ANALYSIS.md)
// Option 1: File-based (quick fix)
// Option 2: Redis (production-ready)
```

---

## 🐛 LỖI HIỆN TẠI CẦN FIX

### **1. Role Card hiển thị sai**
**Hiện tượng:**
- Thẻ vai trò hiển thị nhiều lần
- Hoặc không hiển thị khi bắt đầu game

**✅ ĐÃ FIX** - Xem code trong GameBoard.tsx

---

## 📝 CHECKLIST TEST TỪNG BƯỚC

### **Role Reveal - Basic**
- [ ] Hiển thị 5 deck ở giữa
- [ ] 9 ô player xếp lưới 3x3
- [ ] Mỗi người thấy popup vai trò 1 lần duy nhất
- [ ] Click để lật thẻ
- [ ] Vuốt xuống để đóng
- [ ] Badge "Quản trò" và "Trao gửi" hiển thị
- [ ] Click avatar mình → Xem lại vai trò
- [ ] Click avatar người khác → Không thấy vai trò

### **Role Reveal - Edge Cases** 🔴
- [ ] TEST 1: Multi-tab protection (chỉ 1 tab thấy role)
- [ ] TEST 2: Reconnect during role reveal (vẫn thấy đúng role)
- [ ] TEST 3: React strict mode (không double render)
- [ ] TEST 4: Network delay (vẫn nhận được role)

### **Night Mode - Basic**
- [ ] Background tối
- [ ] Người Chữa Lành click → Badge ✨
- [ ] Người Im Lặng click → Badge 🔇
- [ ] Moderator click "Chuyển sang Day"

### **Night Mode - Edge Cases** 🔴
- [ ] TEST 5: Concurrent actions (chỉ 1 action/target)
- [ ] TEST 6: Action after phase transition (bị reject)
- [ ] TEST 7: Spam click protection (chỉ 1 action gửi)
- [ ] TEST 8: Action conflict resolution (heal > mute)

### **Day - NTG Bốc Thẻ - Basic**
- [ ] NTG thấy nút "Bốc thẻ Tình huống" đầu tiên
- [ ] Click → Thẻ Tình huống lật ngửa cho tất cả xem
- [ ] Animation zoom
- [ ] Sau đó NTG thấy nút "Chọn thẻ Cảm xúc"
- [ ] Popup 64 thẻ với 4 tab
- [ ] Chọn thẻ → Hiển thị giữa bàn (border hồng)
- [ ] NTG kể chuyện
- [ ] Moderator thấy nút "Chọn Reflection"

### **Day - NTG Bốc Thẻ - Edge Cases** 🔴
- [ ] TEST 9: Skip step (không cho phép skip Cảm xúc)
- [ ] TEST 10: Moderator force skip (hiện warning)
- [ ] TEST 11: NTG disconnect mid-action (state preserved)
- [ ] TEST 12: Double draw race condition (chỉ 1 thẻ)

### **Reflection - Basic**
- [ ] NTG chọn 1-3 thẻ
- [ ] Nút hiển thị số lượng
- [ ] Thẻ xếp hàng ngang

### **Self-care - Basic**
- [ ] NTG chọn 1 thẻ
- [ ] Hiển thị giữa bàn (border xanh lá)

### **Voting - Basic**
- [ ] Tất cả có thể vote
- [ ] Countdown timer
- [ ] Reveal animation

### **Voting - Edge Cases** 🔴
- [ ] TEST 13: Spam vote protection (chỉ 1 vote gửi)
- [ ] TEST 14: Vote during disconnect (vote preserved)
- [ ] TEST 15: Timeout with incomplete votes (auto reveal)
- [ ] TEST 16: Change vote (vote updated correctly)

### **Reward - Basic**
- [ ] Click avatar → Popup coin
- [ ] Tặng coin → Animation bay
- [ ] Số coin tăng đúng

### **Reward - Edge Cases** 🔴
- [ ] TEST 17: Spam coin protection (rate limit)
- [ ] TEST 18: Coin overflow (cap at 999)
- [ ] TEST 19: Self-gift prevention (error message)
- [ ] TEST 20: Negative coin hack (server validation)

### **End Round - Basic**
- [ ] Hiển thị tổng coin
- [ ] Input hoạt động
- [ ] Confetti animation
- [ ] Reset về Setup

### **End Round - Edge Cases** 🔴
- [ ] TEST 21: Incomplete state reset (thẻ cũ bị clear)
- [ ] TEST 22: Reconnect during end round (vẫn thấy modal)
- [ ] TEST 23: Double start round (chỉ 1 round tạo)
- [ ] TEST 24: Missing NTG selection (error message)

### **Reconnect System** 🔴
- [ ] TEST 25: Reconnect during role reveal
- [ ] TEST 26: Reconnect during night (after action)
- [ ] TEST 27: Reconnect during voting
- [ ] TEST 28: Reconnect after game ended

### **Server Persistence** 🔴
- [ ] TEST 29: Server restart during game
- [ ] TEST 30: Deploy new version (rooms preserved)

---

## 🎯 PRIORITY FIX

### **🔴 CRITICAL (Phải fix ngay - Có thể phá game)**

1. **Race Conditions trong Night Phase**
   - [ ] Implement action queue với validation
   - [ ] Add target locking (1 target chỉ nhận 1 action)
   - [ ] Priority system (heal > mute)
   - **Impact**: Game logic sai, players confused
   - **Effort**: 2-3 days

2. **State Persistence (Server Restart)**
   - [ ] Implement Redis hoặc file-based storage
   - [ ] Auto-save on every state change
   - [ ] Load rooms on server startup
   - **Impact**: Mất tất cả rooms khi deploy
   - **Effort**: 2-3 days

3. **Reconnect System**
   - [ ] Implement full state sync on reconnect
   - [ ] Preserve actions (vote, night action)
   - [ ] Handle reconnect during any phase
   - **Impact**: Players mất progress khi F5
   - **Effort**: 3-4 days

4. **Phase Transition Validation**
   - [ ] Server-side state machine
   - [ ] Validate required steps completed
   - [ ] Prevent skip/force skip
   - **Impact**: Game có thể stuck hoặc skip steps
   - **Effort**: 2 days

### **⚠️ HIGH (Ảnh hưởng trải nghiệm - Nên fix sớm)**

5. **Voting System Edge Cases**
   - [ ] Implement vote timeout
   - [ ] Handle incomplete votes
   - [ ] Allow change vote
   - [ ] Spam protection
   - **Impact**: Voting có thể stuck
   - **Effort**: 1-2 days

6. **Coin System Protection**
   - [ ] Rate limiting (1 coin/500ms)
   - [ ] Coin cap (999 max)
   - [ ] Self-gift prevention
   - [ ] Negative coin validation
   - **Impact**: Có thể spam/hack coins
   - **Effort**: 1 day

7. **Multi-tab Protection**
   - [ ] Detect multiple tabs same user
   - [ ] Kick old tab hoặc readonly mode
   - [ ] Prevent role leak
   - **Impact**: Có thể lộ vai trò
   - **Effort**: 1 day

8. **Error Handling & Recovery**
   - [ ] Try-catch wrappers cho tất cả handlers
   - [ ] Graceful error messages
   - [ ] Client retry logic
   - [ ] Error logging
   - **Impact**: Server có thể crash
   - **Effort**: 2 days

### **🟡 MEDIUM (Tối ưu - Có thể làm sau)**

9. **Timeout System**
   - [ ] Auto-advance phase sau timeout
   - [ ] Warning trước khi timeout
   - [ ] Configurable timeout per phase
   - **Impact**: Game có thể chờ mãi
   - **Effort**: 1-2 days

10. **Role Card Double Render**
    - [ ] Fix React strict mode issue
    - [ ] Idempotent role reveal
    - [ ] Timestamp-based deduplication
    - **Impact**: UI glitch, không critical
    - **Effort**: 0.5 day

11. **Animation & UI Polish**
    - [ ] Smooth transitions
    - [ ] Loading states
    - [ ] Better error messages
    - **Impact**: UX improvement
    - **Effort**: 2-3 days

12. **Monitoring & Logging**
    - [ ] Winston logger
    - [ ] Metrics (Prometheus)
    - [ ] Health checks
    - **Impact**: Easier debugging
    - **Effort**: 1-2 days

---

## 🚀 IMPLEMENTATION ROADMAP

### **Sprint 1 (Week 1): Critical Fixes**
**Goal**: Game không bị stuck, không mất data

- Day 1-2: State Persistence (Redis/File)
- Day 3-4: Reconnect System
- Day 5: Phase Transition Validation

**Deliverable**: Game có thể survive server restart và player reconnect

---

### **Sprint 2 (Week 2): Race Conditions & Edge Cases**
**Goal**: Game logic chính xác, không có bug

- Day 1-2: Night Phase Race Conditions
- Day 3: Voting System Edge Cases
- Day 4: Coin System Protection
- Day 5: Testing & Bug fixes

**Deliverable**: Tất cả critical edge cases được handle

---

### **Sprint 3 (Week 3): Security & Stability**
**Goal**: Game ổn định, không crash

- Day 1-2: Error Handling & Recovery
- Day 3: Multi-tab Protection
- Day 4: Rate Limiting & Validation
- Day 5: Load testing

**Deliverable**: Game có thể chạy production

---

### **Sprint 4 (Week 4): Polish & Optimization**
**Goal**: UX tốt, dễ debug

- Day 1-2: Timeout System
- Day 3: Animation & UI Polish
- Day 4-5: Monitoring & Logging

**Deliverable**: Production-ready game

---

## 📊 TESTING STRATEGY

### **Unit Tests (Backend)**
```typescript
// Example: Night Phase Action Queue
describe('NightPhaseManager', () => {
  it('should reject duplicate target', () => {
    const action1 = { actorId: 'player1', targetId: 'player3', type: 'mute' }
    const action2 = { actorId: 'player2', targetId: 'player3', type: 'heal' }
    
    manager.executeAction(room, action1) // Success
    const result = manager.executeAction(room, action2) // Should fail
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('TARGET_ALREADY_SELECTED')
  })
  
  it('should prioritize heal over mute', () => {
    const heal = { actorId: 'player1', targetId: 'player3', type: 'heal' }
    const mute = { actorId: 'player2', targetId: 'player4', type: 'mute' }
    
    manager.executeAction(room, mute)
    manager.executeAction(room, heal)
    
    const target = room.players.find(p => p.id === 'player3')
    expect(target.status.healed).toBe(true)
    expect(target.status.muted).toBe(false)
  })
})
```

### **Integration Tests (Socket Events)**
```typescript
// Example: Voting flow
describe('Voting Phase', () => {
  it('should handle complete voting flow', async () => {
    // Start voting
    moderatorSocket.emit('next_phase', { roomId })
    await waitFor(() => expect(phase).toBe('voting'))
    
    // Players vote
    player1Socket.emit('cast_vote', { roomId, targetId: 'player2' })
    player2Socket.emit('cast_vote', { roomId, targetId: 'player3' })
    
    // Wait for timeout
    await sleep(10000)
    
    // Check reveal
    expect(revealedRoles).toHaveLength(9)
  })
})
```

### **E2E Tests (Playwright)**
```typescript
// Example: Full game flow
test('complete game round', async ({ page }) => {
  // Join room
  await page.goto('http://localhost:5173')
  await page.fill('[name="roomId"]', 'TEST123')
  await page.click('button:has-text("Join")')
  
  // Start game
  await page.click('button:has-text("Bắt đầu game")')
  
  // Role reveal
  await expect(page.locator('.role-card')).toBeVisible()
  await page.click('.role-card')
  
  // ... test each phase
})
```

### **Load Tests (Artillery)**
```yaml
# artillery.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10 # 10 users/second
scenarios:
  - name: 'Join room and play'
    engine: socketio
    flow:
      - emit:
          channel: 'join_room'
          data:
            roomId: 'LOAD_TEST'
            name: 'Player {{ $randomString() }}'
      - think: 5
      - emit:
          channel: 'cast_vote'
          data:
            roomId: 'LOAD_TEST'
            targetId: 'player1'
```

---

## 🔍 DEBUGGING TOOLS

### **Server Logs**
```typescript
// Add structured logging
import winston from 'winston'

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

// Usage
logger.info('Night action executed', {
  roomId,
  actorId,
  targetId,
  actionType,
  timestamp: Date.now()
})
```

### **Client Debug Panel**
```typescript
// Add debug panel (dev only)
{process.env.NODE_ENV === 'development' && (
  <DebugPanel>
    <div>Room ID: {room.id}</div>
    <div>Phase: {room.currentPhase}</div>
    <div>Round: {room.currentRound}</div>
    <div>My Role: {myRole}</div>
    <div>Socket ID: {socket.id}</div>
    <button onClick={() => console.log(room)}>Log Room State</button>
  </DebugPanel>
)}
```

---

## 📚 BEST PRACTICES (Từ game lớn)

### **1. Server là Source of Truth**
- Client chỉ gửi intent (vote, action)
- Server validate và apply
- Broadcast result về tất cả clients

### **2. Idempotent Actions**
- Mỗi action có unique ID
- Server check duplicate trước khi apply
- Client có thể retry an toàn

### **3. Optimistic UI + Rollback**
- Update UI ngay (optimistic)
- Nếu server reject → Rollback
- Show error message

### **4. State Versioning**
- Mỗi state update có version number
- Client gửi version khi action
- Server reject nếu version cũ

### **5. Graceful Degradation**
- Network slow → Show loading
- Server error → Show retry button
- Disconnect → Auto-reconnect

---

**Tài liệu này giúp bạn test và fix tất cả edge cases một cách có hệ thống!** 🎉
