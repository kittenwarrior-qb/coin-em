import type { ReactNode } from 'react'
import { ArrowRight, BookOpen, CirclePlus, DoorOpen, Users } from 'lucide-react'
import { CartoonCircleButton } from '@/components/cartoon/CartoonButton'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'

interface Props {
  logo: ReactNode
  onJoin: () => void
  onCreate: () => void
  onMenu: () => void
  onGuide: () => void
  onResume: () => void
  resumeCount: number
}

/** Live controls over a separated decorative background, not screenshot hitboxes. */
export function BrandHome({ logo, onJoin, onCreate, onMenu, onGuide, onResume, resumeCount }: Props) {
  const theme = useControlTheme()
  const workshop = theme === 'kindness-workshop'
  return <div className="brand-home" data-testid="lobby-menu">
    <div className="brand-home-help"><CartoonCircleButton aria-label="Về dự án" iconSrc="/emcoin/icons/orbit/help.svg" iconSize="44%" onClick={() => window.open('/about', '_blank', 'noopener,noreferrer')} /></div>
    <div className="brand-home-settings"><CartoonCircleButton aria-label="Cài đặt" iconSrc="/emcoin/icons/orbit/settings.svg" iconSize="48%" onClick={onMenu} /></div>
    <div data-ui-chrome="home-logo" className="brand-home-logo">{logo}</div>
    <button type="button" className="brand-home-action brand-home-join" data-testid="btn-join-room" onClick={onJoin}>
      {workshop ? <DoorOpen aria-hidden="true" /> : <Users aria-hidden="true" />}<span>Tìm phòng</span><ArrowRight aria-hidden="true" />
    </button>
    <button type="button" className="brand-home-action brand-home-create" data-testid="btn-create-room" onClick={onCreate}>
      <CirclePlus aria-hidden="true" /><span>Tạo phòng</span><ArrowRight aria-hidden="true" />
    </button>
    <button type="button" className="brand-home-action brand-home-guide" onClick={onGuide}>
      <BookOpen aria-hidden="true" /><span>Hướng dẫn</span><ArrowRight aria-hidden="true" />
    </button>
    {resumeCount > 0 && <button type="button" className="brand-home-resume" onClick={onResume}>Tiếp tục phòng ({resumeCount})</button>}
  </div>
}
