import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { useLayoutEffect, useRef } from 'react'
import { PHASE_LABELS } from '@/stores/types'
import { CartoonCircleButton } from '@/components/cartoon'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { isBrandTheme } from '@/components/cartoon/controlThemes'
import { PHASE_ACTION_RENDERERS, type BoardPhaseActionsProps } from './phaseActionRenderers'
import { CandyIcon } from '@/components/cartoon/CandyIcon'

export function BoardPhaseActions(props: BoardPhaseActionsProps) {
  const theme = useControlTheme()
  const branded = isBrandTheme(theme)
  const NavButton = branded ? CartoonCircleButton : 'button'
  const locked = !props.connected || props.pending
  const committed = useRef<{ scope: string; locked: boolean } | null>(null)
  useLayoutEffect(() => {
    committed.current = { scope: props.scope, locked }
    return () => { committed.current = null }
  }, [props.scope, locked])
  const guard = <T extends unknown[]>(callback: (...args: T) => void) => (...args: T) => {
    if (committed.current?.scope === props.scope && !committed.current.locked) callback(...args)
  }
  const context: BoardPhaseActionsProps = { ...props,
    onNavigate: guard(props.onNavigate), onOpenInventory: guard(props.onOpenInventory),
    onAdvance: guard(props.onAdvance), onOpenGiveCoin: guard(props.onOpenGiveCoin),
    onOpenTargetedCoin: guard(props.onOpenTargetedCoin), onOpenLegacyRewards: guard(props.onOpenLegacyRewards),
  }
  return (
    <fieldset disabled={locked} className="contents">
      {props.isNarrator && (
        <div data-ui-chrome="phase-nav" className="flex items-center gap-2 w-full" data-testid="narrator-phase-nav">
          <NavButton type="button" {...(branded ? { iconSrc: '/emcoin/icons/orbit/arrowLeft.svg', size: 'sm' as const } : {})} disabled={!props.previous || !props.capabilities.rollback || props.checkpointLocked}
            className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[#96b886] border-2 border-[var(--c-black)] shadow-[0_3px_0_rgba(0,0,0,0.18)] transition-all active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.18)] disabled:opacity-30 disabled:pointer-events-none"
            onClick={() => { if (props.previous && props.capabilities.rollback && !props.checkpointLocked) context.onNavigate('prev', props.previous) }}
            data-testid="btn-prev-phase" aria-label="Quay lại bước trước"
            aria-describedby={props.checkpointLocked ? 'coin-checkpoint-note' : undefined}>
            {!branded && <EmcoinImage src="/emcoin/icons/orbit/arrowRight.svg" alt="" className="h-5 w-5 object-contain rotate-180" draggable={false} />}
          </NavButton>
          <div className="flex-1 min-w-0 text-center">
            <div className="font-display text-[11px] text-[var(--c-gray)] leading-none">{theme === 'candy-clouds' ? <span className="candy-facilitator-label"><CandyIcon name="crown" />Quản trò</span> : '👑 Quản trò'}</div>
            <div className="font-body text-[10px] text-black/55 truncate mt-0.5">{PHASE_LABELS[props.phase] ?? props.phase}</div>
          </div>
          <NavButton type="button" {...(branded ? { iconSrc: '/emcoin/icons/orbit/arrowRight.svg', size: 'sm' as const } : {})} disabled={props.nextDisabled}
            className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[var(--c-green)] border-2 border-[var(--c-black)] shadow-[0_3px_0_rgba(0,0,0,0.18)] transition-all active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.18)] disabled:opacity-30 disabled:pointer-events-none"
            onClick={() => { if (!props.nextDisabled && props.next) context.onNavigate('next', props.next) }}
            data-testid="btn-next-phase" aria-label="Chuyển sang phase tiếp theo">
            {!branded && <EmcoinImage src="/emcoin/icons/orbit/arrowRight.svg" alt="" className="h-5 w-5 object-contain" draggable={false} />}
          </NavButton>
        </div>
      )}
      {props.isNarrator && props.checkpointLocked && (
        <p id="coin-checkpoint-note" className="w-full font-body text-[11px] leading-relaxed text-[var(--c-gray-dark)]">
          Không thể lùi bước sau khi đã trao hoặc thu Coin, để giữ đúng số Coin đã ghi nhận.
        </p>
      )}
      {PHASE_ACTION_RENDERERS[props.phase](context)}
    </fieldset>
  )
}
