import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BookOpen, Layers, Box, LogOut } from 'lucide-react'
import { CartoonModal, CartoonButton } from '@/components/cartoon'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { GameMenuModal } from '@/components/lobby/GameMenuModal'
import '@/index.css'
import './menuStudies.css'

const variants = {
  a1: { name: 'A1 · Mint, Blush & Cream', description: 'Cân bằng • nút mọng • màu theo chức năng' },
  a2: { name: 'A2 · Garden Pop', description: 'Ấm áp • bảng tên nổi • viền mềm có cá tính' },
  a3: { name: 'A3 · Soft Tiles', description: 'Gọn • icon rõ • độ nổi vừa phải' },
} as const
type Variant = keyof typeof variants

export function Study({ variant }: { variant: Variant }) {
  const harmonized = variant === 'a1' && new URLSearchParams(location.search).get('direction') === 'sky-pink'
  const [open, setOpen] = useState(true)
  const [notice, setNotice] = useState('Bản mẫu giao diện — không kết nối phòng chơi')
  const icons = variant === 'a3'
  return <ControlThemeProvider root theme="mint-blush">
    <main id="screen-panel" className={`menu-study-screen${harmonized ? ' menu-study-sky-pink' : ''}`}>
      <header className="menu-study-caption">
        <h1>{harmonized ? 'A1 · Xanh dương & hồng' : variants[variant].name}</h1>
        <p>{harmonized ? 'Bản phối menu mới — chưa áp dụng toàn ứng dụng' : variants[variant].description}</p>
      </header>
      {variant === 'a1' ? <GameMenuModal open={open} onClose={() => setOpen(false)} visualStyle={harmonized ? 'sky-pink-study' : 'current'} onQuit={new URLSearchParams(location.search).get('context') === 'home' ? undefined : async () => false} /> : <CartoonModal open={open} onClose={() => setOpen(false)} title="Menu" appearance="menu" container={document.getElementById('screen-panel') ?? undefined} className={`menu-study menu-study--${variant}`}>
        <div className="theme-a-menu-actions">
          <CartoonButton color="green" size="lg" className="w-full study-deck" onClick={() => setNotice('Bạn vừa thử nút Bộ thẻ')}>
            <span className="study-label">{icons && <Layers size={21} aria-hidden="true" />}<span>Bộ thẻ</span></span>
          </CartoonButton>
          <CartoonButton color="pink" size="lg" className="w-full study-3d" badge="MỚI" onClick={() => setNotice('Bạn vừa thử nút Bộ thẻ 3D')}>
            <span className="study-label">{icons && <Box size={21} aria-hidden="true" />}<span>Bộ thẻ 3D</span></span>
          </CartoonButton>
          <CartoonButton color="teal" size="lg" className="w-full study-guide" onClick={() => setNotice('Bạn vừa thử nút Hướng dẫn')}>
            <span className="study-label">{icons && <BookOpen size={21} aria-hidden="true" />}<span>Hướng dẫn</span></span>
          </CartoonButton>
          <div className="theme-a-menu-exit">
            <button type="button" className="theme-a-menu-quit" onClick={() => setNotice('Bản mẫu: không rời phòng hay gửi lệnh thoát')}>
              <LogOut size={18} aria-hidden="true" /><span>Thoát game</span>
            </button>
          </div>
        </div>
      </CartoonModal>}
      {!open && <button className="study-reopen" onClick={() => setOpen(true)}>Mở lại menu</button>}
      <p className="menu-study-notice" role="status">{notice}</p>
    </main>
  </ControlThemeProvider>
}

export function Gallery() {
  return <main className="study-gallery">
    <header><h1>Ba hướng menu cho reskin A</h1><p>Cùng nội dung, khác phối màu và chất liệu. Chọn A1, A2 hoặc A3; có thể kết hợp chi tiết bạn thích.</p></header>
    <div className="study-gallery-grid">{Object.keys(variants).map(key => <iframe key={key} title={variants[key as Variant].name} src={`?variant=${key}`} />)}</div>
  </main>
}

const requested = new URLSearchParams(location.search).get('variant')
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(
  requested && requested in variants ? <Study variant={requested as Variant} /> : <Gallery />,
)
