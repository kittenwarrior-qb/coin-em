# Cartoon GUI Pack v2.0.4 — Web Implementation Reference

Tài liệu này tổng hợp toàn bộ logic từ Unity prefabs, C# scripts, và assets để implement
chính xác trên web với React + Tailwind CSS.

---

## 1. BUTTON SYSTEM

### 1.1 Pill Button (Large — text label)

**Unity prefab structure** (`Button.prefab`, `Button - Green.prefab`, ...):
```
Button (root, 260×100)
├── Shadow     — same shape PNG, anchoredPosition y:-10, color rgba(0,0,0,0.133)
├── Button     — colored PNG sprite (Green.png / Orange.png / etc.)
└── Text       — LilitaOne font, white, centered
```

**Press animation** (`Button.controller` → `Pressed` trigger):
- `Button` body translates `y: +10` → covers shadow → looks like button sinks
- Shadow stays fixed
- `AnimatedButton.cs`: fires click after 100ms delay (animation plays first)

**Web CSS equivalent** (`.btn-pill`):
```css
/* Shadow = ::before pseudo, offset translateY(+6px), brightness(0) opacity(0.22) */
/* Press = active:not(:disabled) > span { translateY(-6px) } */
/* Color = background-image: url('/cartoon/buttons/Green.png') */
```

**Available colors**: Red, Orange, Yellow, Green, Blue, Blue-Teal, Violet, Purple, Pink, Gray,
Teal, Brown, Dark, Light, Neutral, Bordeaux, Transparent, White, None

**Disabled state** (`LevelScene.cs`):
- Body alpha → `40/255 ≈ 0.157`
- Shadow alpha → `0`
- `AnimatedButton.interactable = false`

### 1.2 Circle Button (Icon only)

**Unity prefab** (`Button Circle.prefab`, 100×100):
```
Button Circle (root)
├── Shadow  — same circle PNG, y:-10, rgba(0,0,0,0.133)
├── Button  — colored circle PNG
├── Text    — disabled (IsActive: false)
└── Icon    — 50×50 centered, white icon SVG
```

**Web**: `.btn-circle-game` + `.btn-circle-{color}` + `<img class="btn-icon" />`

### 1.3 Square Button

Same structure as Circle but square shape. Available same colors.

---

## 2. TOGGLE

**Unity prefab** (`Toggle - Single Image.prefab`, `Toggle Group - Teal.prefab`):
- Uses Unity `Toggle` component (checkbox behavior)
- `SpriteSwapper.cs`: swaps between `enabledSprite` / `disabledSprite` on value change
- Visual: circle button that shows checkmark when checked

**Web**: `<input type="checkbox">` styled as circle button with checkmark SVG overlay.

**States**:
- Unchecked: gray circle, no checkmark
- Checked: colored circle (teal/blue) + `Checkmark Cartoon.svg` overlay

---

## 3. SWITCH (Toggle Slider)

**Unity prefab** (`Switch.prefab`, 200×160):
```
Switch (root, Unity Slider component, min:0 max:1 wholeNumbers:true)
├── Shadow      — y:-7.5, rgba(0,0,0,0.102)
├── Border      — colored border, ColorSwapper: enabled=#3C81A0 / disabled=#788088
├── Background  — gray fill rgba(0.808,0.831,0.855)
├── Fill Area   — green fill rgba(0.580,0.868,0.149) — the "on" color
├── Inner Glow  — rgba(0,0,0,0.102) inner shadow
└── Handle Slide Area
    └── Handle  — circle button PNG + SpriteSwapper (on/off icon)
        └── Icon — 50×50 icon (music note, bell, etc.)
```

**OnValueChanged** fires:
1. `SpriteSwapper.SwapSprite()` — swaps handle icon
2. `ColorSwapper.SwapColor()` — swaps border color

**Web**: CSS `<input type="range" min=0 max=1 step=1>` styled as pill track + circle handle.

**Colors available**: Green-Red, Blue, Pink, Purple, Yellow

---

## 4. INPUT FIELD

**Unity prefab** (`InputField (TMP).prefab`, 600×90):
```
InputField (root)
├── Inner Glow  — rgba(0.702,0.910,0.965) teal tint, rounded rect sprite
└── Text Area
    ├── Placeholder — LilitaOne, color #2F76AC (blue-mid)
    └── Text        — LilitaOne, color #2F76AC
```

**Key values**:
- Background: `rgba(0.915, 0.985, 1.0)` = `#E9FBFF` (very light teal)
- Inner glow: `rgba(0.702, 0.910, 0.965)` = `#B3E8F6` (teal highlight)
- Text/placeholder color: `#2F76AC`
- Shape: rounded rectangle (pill-like), no hard border

**Web CSS** (`.input-cartoon`):
```css
background: #E9FBFF;
border-radius: 9999px;
box-shadow: inset 0 3px 6px rgba(0,0,0,0.08);
color: #2F76AC;
```

---

## 5. PROGRESS BAR

**Unity prefab** (`Progress Bar.prefab`, 300×60):
```
Progress Bar (root)
├── Background
│   ├── Shadow      — y:-5, rgba(0,0,0,0.102)
│   └── Background  — white rounded rect
├── Mask (clips the bar fill)
│   └── Bar (Animator: horizontal fill animation)
│       ├── Border (Dark Color) — dark blue border rgba(0.101,0.456,0.775)
│       ├── Background (Color)  — fill color rgba(0,0.608,0.830) = #009BD4
│       ├── Light               — white rgba(1,1,1,0.039) inner glow
│       └── Circle × 2         — decorative white dots at ends
└── Text — "100%" label
```

**Fill colors** (from color variants):
- Blue: `#009BD4` border `#1A74C6`
- Green: `#94DD26` border `#3C8109`
- Pink: `#FF6993` border `#BF2250`
- Purple: `#7B4FD4` border `#4A2090`
- Red: `#EB3C54` border `#A61932`
- Yellow: `#FFD93D` border `#B57523`

**Web**: pill-shaped track + fill div with `width: {value}%` transition.

---

## 6. SLIDER

**Unity prefab** (`Slider.prefab`, 450×80):
```
Slider (root, Unity Slider min:0 max:1 value:0.5)
├── Shadow      — y:-5, rgba(0,0,0,0.102)
├── White Border — white rounded rect
├── Fill Area   — gray track rgba(0.914,0.925,0.937)
│   └── Fill
│       ├── Border (Dark Color) — dark color border
│       ├── Background (Color)  — fill color
│       ├── Light               — white glow mask
│       └── Circle              — decorative dot
└── Handle Slide Area
    └── Handle (80px wide)
        ├── Border  — y:-5, rgba(0,0,0,0.102) shadow
        └── Button  — circle PNG (colored) + Center white circle
```

**Handle**: circle button PNG (same as Button Circle), with white center circle.
**Track fill**: same color as handle.

---

## 7. DROPDOWN

**Unity prefab** (`Dropdown.prefab`, `Dropdown - Images.prefab`):
- Background: white rounded rect with subtle shadow
- Arrow: `Arrow - Down.svg` (white, right side)
- Options list: white panel, each item has checkmark on selected
- With images: icon (32×32) + label per option

---

## 8. RADIAL PROGRESS BAR

**Unity prefab** (`Progress Bar - Radial.prefab`):
- Uses Unity `Image` with `FillMethod: Radial360`, `FillClockwise: true`
- Layers: outer ring (dark border) → colored fill → inner circle (white/dark bg) → text label
- Animation: fill amount 0→1

**Web**: SVG `<circle>` with `stroke-dasharray` / `stroke-dashoffset` animation.

---

## 9. LOADING SPINNER

**Unity prefab** (`Loading Spinner.prefab`, 50×50):
- Single `Image` component with `Loading Spinner.svg` sprite
- `Animator` with `Rotate 360` controller → continuous rotation
- No children, just the SVG rotating

**Web**: `<img src="/cartoon/icons/Loading-Spinner.svg" class="spin-cartoon" />`

---

## 10. POPUP / MODAL

**Unity script** (`Popup.cs`):
- `Open()`: creates full-screen background `rgba(10,10,10,0.6)`, fades in alpha 0→1 over 0.4s
- `Close()`: plays "Close" animation, fades background 1→0 over 0.2s, destroys after 0.5s
- `PopupOpener.cs`: instantiates prefab at scale 0, adds to canvas, calls `Open()`

**Animation**: scale 0→1 (spring/bounce) on open, scale 1→0 on close.

**Web**: framer-motion `scale: 0.85→1` + `opacity: 0→1`, backdrop `rgba(10,10,10,0.6)`.

---

## 11. SCENE TRANSITION / FADER

**`Transition.cs`**:
- Creates overlay canvas (DontDestroyOnLoad)
- Fade out current scene (0→1 over `duration/2`)
- Load new scene
- Fade in new scene (1→0 over `duration/2`)
- Default color: black

**`Fader.cs`**:
- `FadeIn()`: CanvasGroup alpha 0→1 over `duration` (default 0.5s), enables interaction
- `FadeOut()`: alpha 1→0, disables interaction

**Web**: CSS `opacity` transition on route change, or framer-motion `AnimatePresence`.

---

## 12. SOUND SYSTEM

**WAV files**:
| File | Usage |
|------|-------|
| `Button.wav` | Default button click |
| `Button - High.wav` | High-pitched button (small buttons) |
| `Button - Low.wav` | Low-pitched button (large/important) |
| `Close.wav` | Modal/popup close |
| `Coins.wav` | Coin collect/reward |
| `Win.wav` | Victory/success |
| `Lose - Thunder.wav` | Defeat/failure |
| `Magical.wav` | Special action/unlock |
| `Spin Wheel.wav` | Spin wheel rotation |
| `Background Music.wav` | Looping background music |

**`SoundManager.cs`** / **`MusicManager.cs`**:
- Persisted via `PlayerPrefs` keys: `"sound_on"` (0/1), `"music_on"` (0/1)
- `AudioListener.volume` controls all SFX
- Background music has separate `AudioSource.volume`
- `BackgroundMusic.cs`: singleton, `DontDestroyOnLoad`, `FadeIn()`/`FadeOut()` over 1s

**`SoundButton.cs`** / **`MusicButton.cs`**:
- Toggle on/off, persist to PlayerPrefs
- `SpriteSwapper` swaps icon between Sound On / Sound Off SVGs

**Web equivalent**: `<audio>` elements + localStorage for persistence.

---

## 13. SPIN WHEEL

**`SpinWheel.cs`**:
- `Spin()`: rotates `maxAngle: 270°` over `time: 3s`
- Uses `AnimationCurve` for easing (ease-out feel)
- Prevents double-spin while spinning

**Web**: framer-motion `rotate` animation with custom easing.

---

## 14. COLOR SWAPPER / SPRITE SWAPPER

**`ColorSwapper.cs`**: toggles Image color between `enabledColor` / `disabledColor`
**`SpriteSwapper.cs`**: toggles Image sprite between `enabledSprite` / `disabledSprite`

Used by: Switch border (enabled/disabled state), Sound/Music buttons (on/off icon).

**Web**: CSS class toggle or React state controlling `src` / `className`.

---

## 15. ASSETS INVENTORY

### Button PNGs (`/cartoon/buttons/`)
Pill buttons: Red, Orange, Yellow, Green, Blue, Blue-Teal, Violet, Purple, Pink, Gray, Teal,
Brown, Dark, Light, Neutral, Bordeaux, Transparent, White, None

### Icons SVGs (`/cartoon/icons/`)
296 total SVGs. Key categories:

**Navigation**: Arrow-Down, Arrow-Up, Arrow-Left, Arrow-Right, Arrow-Simple-*, Arrow-Thin-*,
Forward, Backward

**Actions**: Plus, Cancel, X-Icon-Rounded, Checkmark-Cartoon, Repeat, Share, Sharing

**Game UI**: Star, Crown, Coin, Heart-Red, Heart-Gray, Heart-Broken, Lock, Lock-Gold,
Key-Gold, Key-Sliver, Shield, Sword, Bomb, Skull, Ghost-Head

**Social**: User, Users, User-Plus, Friends, Facebook, Instagram, Twitter, Discord, Youtube

**Media**: Sound-On, Sound-Off, Music, Music-Note, Pause, Forward, Backward

**Status**: Alert, Alert-Bell, Info, Help, Question-Mark, Loading-Spinner, Settings,
Settings-Tool, Home, Shop, Ranking, Rate, Calendar, Clock-Yellow, Clock-Indigo

**Rewards**: Badge-Yellow, Badge-Pink, Badge-Blue, Gem-Blue, Gem-Green, Gem-Pink,
Gem-Purple, Gem-Yellow, Gift, Coin, Crown, Cup, Star

**Emojis/Faces**: Emoji-Happy, Emoji-Sad, Emoji-Crying, Emoji-Love, Emoji-Fear,
Emoji-Shocked, Emoji-Smile, Big-Smile-Cartoon, Heavy-Smile-Cartoon, Cool-Cartoon,
Sad-Cartoon, Shy-Cartoon, Shocked-Cartoon, Fear-Cartoon, Love-Cartoon

**Animals**: Bear, Bunny, Cat, Cat-Head, Bird-Blue, Fish, Fish-2, Rabbit-Head

**Characters**: Boy-1..4, Girl-1..4, Girl (base)

**Nature**: Cloud, Clouds, Palm-Tree, Mountains, Island, Leaf, Mushroom, Sea-Star, Shell

**Items**: Bag, Book, Book-Opened, Notebook, Pen, Pencil, Photo, Paper, Package,
Toaster, Glass, Dice, Magnet, Hammer, Sword, Bone

### Fonts (`/fonts/`)
- `LilitaOne-Regular.ttf` — display/headings, inherently bold, rounded
- `BPreplayExtendedBold.otf` — body/UI text, extended bold

### Audio (`/cartoon/audio/` — copy manually if needed)
Button.wav, Button-High.wav, Button-Low.wav, Close.wav, Coins.wav, Win.wav,
Lose-Thunder.wav, Magical.wav, Spin-Wheel.wav, Background-Music.wav

---

## 16. PSD CUSTOMIZATION NOTES

The `.psd` files allow:
- **Button colors**: Each color variant is a separate layer group. Change fill color of
  the gradient layer to create new colors.
- **Background**: `background.png` / `Home Scene - Background.psd` — sky gradient with
  clouds. Customize by changing sky color and cloud positions.
- **Popup panels**: `Popup - Basic.prefab` uses `Rounded Rectangle - 256px.png` as
  9-slice background. Change fill color in PSD.
- **Progress bar fill**: Change `Background (Color)` layer color in PSD.

---

## 17. WEB COMPONENT MAPPING

| Pack Component | Web Component | File |
|---|---|---|
| Button (pill) | `CartoonButton` | `CartoonButton.tsx` |
| Button Circle | `CartoonCircleButton` | `CartoonButton.tsx` |
| Toggle | `CartoonToggle` | `CartoonToggle.tsx` |
| Switch | `CartoonSwitch` | `CartoonSwitch.tsx` |
| InputField | `CartoonInput` | `CartoonInput.tsx` |
| Progress Bar | `CartoonProgress` | `CartoonProgress.tsx` |
| Slider | `CartoonSlider` | `CartoonSlider.tsx` |
| Radial Progress | `CartoonRadial` | `CartoonRadial.tsx` |
| Loading Spinner | `CartoonSpinner` | `CartoonSpinner.tsx` |
| Popup/Modal | `CartoonModal` | `CartoonModal.tsx` |
| Dropdown | `CartoonDropdown` | `CartoonDropdown.tsx` |
| Badge/Amount | `CartoonBadge` | `CartoonBadge.tsx` |
| Coin circle | `CartoonCoin` | `CartoonCoin.tsx` |
| Avatar | `CartoonAvatar` | `CartoonAvatar.tsx` |
| Sound button | `CartoonSoundButton` | `CartoonSoundButton.tsx` |
