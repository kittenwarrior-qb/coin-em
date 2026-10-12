import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { motion, AnimatePresence } from 'framer-motion';

import { Eye, EyeOff } from 'lucide-react';
import { RoomCatalogBoundary } from '@/features/game/catalog/RoomCatalog';
import { useRoomCatalog } from '@/features/game/catalog/roomCatalogClient';

import { CartoonCircleButton } from '@/components/cartoon';
import { TableBoard } from '@/components/game/TableBoard';
import { FlipCard } from '@/components/game/FlipCard';
import { CoinCarousel } from '@/components/game/CoinCarousel';
import { CardInventory } from '@/components/game/CardInventory';

import { PlayerLayout } from '@/components/game/PlayerLayout';
import { MiniPlayerToken } from '@/components/game/MiniPlayerToken';
import { CoinDisplay } from '@/components/game/CoinDisplay';
import { GameMenuModal } from '@/components/lobby/GameMenuModal';
import { NtgRewardPicker } from '@/components/game/NtgRewardPicker';

import { RoleRewardPicker } from '@/components/game/RoleRewardPicker';
import { RandomSituationFan } from '@/components/game/RandomSituationFan';
import { SituationFanSpectator } from '@/components/game/SituationFanSpectator';
import { GiveCoinPicker } from '@/components/game/GiveCoinPicker';

import { MutedNoticeModal, NightActionConfirmModal, PhaseNavConfirmModal, NtgRewardSuccessPopup } from '@/components/game/GameModals';
import { GuessSilencerOverlay, RevealSilencerOverlay, RewardOverlay, EndedOverlay } from '@/components/game/PhaseOverlays';
import { PhaseCelebration } from '@/components/game/PhaseCelebration';

import { FlyingActionIconEffect } from '@/features/game/components/FlyingActionIconEffect';
import { HistoryModal } from '@/features/game/components/HistoryModal';
import { BoardPreviewModal } from '@/features/game/components/BoardPreviewModal';
import { OwnRoleRevealModal } from '@/features/game/components/OwnRoleRevealModal';
import { SelectedCardPreview } from '@/features/game/components/SelectedCardPreview';

import { validPhaseView } from '@/features/game/phases/registry';
import { PhaseDiagnostic } from '@/features/game/phases/PhaseDiagnostic';
import { BoardPhaseActions } from '@/features/game/phases/BoardPhaseActions';

import { TurnCountdown } from '@/features/game/components/TurnCountdown';
import { useBoardController } from "@/features/game/controllers/useBoardController";
import type { GameBoardProps } from "@/features/game/controllers/boardTypes";
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { themeBackdrop, isBrandTheme } from '@/components/cartoon/controlThemes'
import { PHASE_LABELS } from '@/stores/types'

export default function GameBoard(props: GameBoardProps) {
  const phase = props.roomState.status === 'ended' ? 'ended' : props.roomState.phase
  if (!validPhaseView(props.roomState.phaseView, phase)) return <PhaseDiagnostic onLeave={props.onLeave} />
  return <RoomCatalogBoundary version={props.roomState.catalogVersion} onLeave={props.onLeave}><ConfirmedGameBoard {...props} /></RoomCatalogBoundary>
}

function ConfirmedGameBoard(props: GameBoardProps) {
  const { roleImages: ROLE_TO_IMAGE, roleBack } = useRoomCatalog()
  const theme = useControlTheme()
  const {
    roomState,
    myUserId,
    isConnected,
    leavePending,
    onLeave,
    onUpdateProfile,
    handleSituationFanState,
    handleSkipRoleRewards,
    handleConfirmPhaseNavigation,
    handleMenuQuit,
    situationPreviewCard,
    situationFanState,
    showMenu,
    setShowMenu,
    showHistory,
    setShowHistory,
    cardPreview,
    setCardPreview,
    selectedNightAction,
    setSelectedNightAction,
    situationChoices,
    selectedSituationChoice,
    setSelectedSituationChoice,
    hideOtherPlayerBadges,
    setHideOtherPlayerBadges,
    phaseNavigation,
    setPhaseNavigation,
    celebrationRun,
    showNtgRewardPicker,
    setShowNtgRewardPicker,
    showRoleRewardPicker,
    showGiveCoinPicker,
    setShowGiveCoinPicker,
    showNtgTargetedCoinPicker,
    setShowNtgTargetedCoinPicker,
    pendingNtgRewardIds,
    setPendingNtgRewardIds,
    ntgRewardSuccess,
    setNtgRewardSuccess,
    ntgVotedIds,
    hasVoted,
    players,
    myPlayer,
    isNarrator,
    selectedCards,
    expandedPlayer,
    showInventory,
    inventoryMode,
    setExpandedPlayer,
    setShowInventory,
    activePhase,
    actionScope,
    localActionError,
    phaseActionPending,
    setDismissedRoleRevealRound,
    flyingActionEffect,
    setFlyingActionEffect,
    mutedNotice,
    setMutedNotice,
    coinPreview,
    setCoinPreview,
    showRevealRewardPreview,
    hasConfirmedNtgRewards,
    handleConfirmSituationChoice,
    togglePendingNtgReward,
    confirmPendingNtgRewards,
    handleRoleRewards,
    handleBrowseSituationCard,
    handleVoteSilencer,
    handleGiveCoin,
    handleHealTarget,
    confirmHealTarget,
    handleSilenceTarget,
    confirmSilenceTarget,
    handleInventorySelect,
    openInventory,
    roomEmotionGroups,
    roomSituationGroups,
    currentRound,
    totalRounds,
    myCoinCount,
    healerActionDone,
    silencerActionDone,
    healerRole,
    silencerRole,
    phaseView,
    capabilities,
    handleAdvance,
    isMySilencerRole,
    isMySelfcareTurn,
    showRoleRevealOverlay,
    isSenderChoosingSituation,
    showTurnStatus,
    turnStatus,
    disconnectedPlayers,
    visibleRoundLogs,
    isNight,
    isMyHealerTurn,
    isMySilencerTurn,
    currentTurnCountdownKey,
    getCountdownKeyForPlayer,
    currentTurnCountdownDuration,
    previousPhase,
    isCoinCheckpointLocked,
    nextPhase,
    effectivePhaseTotal,
    isNarratorNextDisabled,
    boardSelectedCards
  } = useBoardController(props)

  return (
    <div className="screen-cartoon" style={{ overflow: 'hidden' }}>
      <div
        className="screen-panel game-shell relative p-4 flex flex-col gap-4"
        id="game-panel"
        data-ui-night={isNight ? 'true' : 'false'}
        style={{
          width: '100%',
          height: '100dvh',
          overflow: 'hidden',
          backgroundImage: themeBackdrop(theme, 'url(/ingame_background.webp)'),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {localActionError && <div role="alert" className="relative z-[100] rounded-2xl border-2 border-[var(--c-black)] bg-white p-3 font-body text-sm">{localActionError}</div>}
        {/* Phase progress bar — thin line at very top */}
        <motion.div
          className="absolute top-0 left-0 h-[3px] z-10 bg-[var(--c-pink)] pointer-events-none"
          animate={{ width: activePhase === 'ended' ? '100%' : phaseView.position ? `${Math.round((phaseView.position / effectivePhaseTotal) * 100)}%` : '0%' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />

        {/* Night background — slides up from bottom on night phases, slides back down on day */}
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: theme !== 'legacy' ? `linear-gradient(${theme === 'emotion-orbit' ? 'rgba(28,32,76,.78),rgba(35,38,77,.86)' : 'rgba(20,46,63,.78),rgba(24,50,66,.86)'}), ${themeBackdrop(theme, '')}` : 'url(/ingame_dark_background.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          animate={{ y: isNight ? '0%' : '100%' }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          initial={{ y: '100%' }}
        />

        {/* Coin display — top left */}
        {isSenderChoosingSituation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[9] pointer-events-none bg-black"
          />
        )}

        <div className="absolute top-2 left-2 z-20">
          <CoinDisplay coins={myCoinCount} onCoinClick={(_, __, coinType) => setCoinPreview({ coinType: coinType as 'red' | 'yellow' | 'green' })} />
        </div>

        {/* Menu button — top right */}
        <CartoonCircleButton
          color="purple"
          size="sm"
          iconSrc="/emcoin/icons/orbit/settings.svg"
          iconAlt="Menu"
          iconSize="40%"
          className="absolute top-2 right-2 z-30"
          style={{ height: 38, width: 38 }}
          onClick={() => setShowMenu(true)}
          aria-label="Menu"
        />

        <AnimatePresence>
          {currentTurnCountdownKey && (
            <TurnCountdown key={`${actionScope}:${currentTurnCountdownKey}`} duration={currentTurnCountdownDuration} />
          )}
        </AnimatePresence>

        {/* History log button */}
        <div className="absolute bottom-3 left-3 z-30 flex flex-col items-center gap-0.5">
          <CartoonCircleButton
            color="light"
            size="sm"
            iconSrc="/emcoin/icons/orbit/book.svg"
            iconAlt="Nhật ký"
            iconSize="52%"
            onClick={() => setShowHistory(true)}
            aria-label="Nhật ký lượt chơi"
            data-testid="btn-history-log"
          />
            <div data-ui-ink="primary" className="font-display text-[9px] text-[var(--c-pink)] leading-none drop-shadow-sm">Nhật ký</div>
        </div>

        <div className="absolute bottom-3 right-3 z-30">
          <CartoonCircleButton
            color={hideOtherPlayerBadges ? 'gray' : 'light'}
            size="sm"
            onClick={() => setHideOtherPlayerBadges((hidden) => !hidden)}
            aria-label={hideOtherPlayerBadges ? 'Hien badge nguoi choi' : 'An badge nguoi choi'}
            aria-pressed={hideOtherPlayerBadges}
            data-testid="btn-toggle-player-badges"
          >
            {hideOtherPlayerBadges ? (
              <Eye className="h-[45%] w-[45%] text-white drop-shadow-sm" strokeWidth={3} />
            ) : (
              <EyeOff data-ui-ink="primary" className="h-[45%] w-[45%] text-[#2f76ac] drop-shadow-sm" strokeWidth={3} />
            )}
          </CartoonCircleButton>
        </div>

        {/* Phase info */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
          <div
              data-ui-chrome="phase-status"
              className="px-3 py-1 text-center rounded-full"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }}
          >
            <div data-testid="game-phase" data-phase={activePhase} className="font-display text-[10px] text-white/70">
              Round {currentRound}/{totalRounds} · Phase {phaseView.position ?? '—'}/{effectivePhaseTotal}
            </div>
          </div>
        </div>

        {disconnectedPlayers.length > 0 && (
          <div className="absolute top-12 left-1/2 z-20 w-[min(92%,360px)] -translate-x-1/2 rounded-2xl bg-white/90 px-3 py-2 text-center shadow-[0_4px_0_rgba(0,0,0,0.16)]">
            <div className="font-display text-[11px] text-[var(--c-pink)]">
              {disconnectedPlayers.length} người chơi đã rời phòng
            </div>
            <div className="font-body text-[11px] leading-snug text-black/60">
              {disconnectedPlayers.map(p => p.name).join(', ')}
            </div>
          </div>
        )}

        {/* Player layout around center board */}
        <div data-testid="players-grid" className="game-board-scroll relative z-10 flex-1 min-h-0 mt-10">
          {isBrandTheme(theme) && <div className="brand-board-heading">
            {theme === 'kindness-workshop' ? <EmcoinImage className="brand-board-logo" src="/cartoon/ui/themes/kindness-workshop/logo-v2.webp" alt="EmCoin" /> : <div className="brand-board-wordmark">Vòng Cảm Xúc</div>}
            <p>Lượt {currentRound}/{totalRounds}</p>
            <h1>{activePhase === 'give-coins' ? 'Trao Coin' : PHASE_LABELS[activePhase]}</h1>
            {activePhase === 'give-coins' && <div className="brand-board-caption">Trao theo cảm nhận</div>}
          </div>}
          <PlayerLayout
            players={players}
            renderCenter={() => (
              <TableBoard
                selectedCards={boardSelectedCards}
                phase={activePhase}
                revealSituation={activePhase !== 'situation-card'}
                previewSituationCard={!myPlayer?.isSender ? situationPreviewCard : null}
                onCardClick={(card, revealed) => setCardPreview({ card, revealed })}
                status={
                  showTurnStatus ? (
                    <div data-ui-chrome="turn-status" className="rounded-2xl bg-white/70 px-3 py-2 text-center" data-testid="turn-status-panel">
                      <div className="font-display text-xs text-[var(--c-gray)] leading-snug">{turnStatus.title}</div>
                      {turnStatus.description && (
                        <div className="font-body text-[11px] text-black/55 mt-0.5 leading-snug">{turnStatus.description}</div>
                      )}
                    </div>
                  ) : null
                }
                actions={
                  <BoardPhaseActions scope={actionScope} phase={activePhase} capabilities={capabilities}
                    connected={isConnected} pending={phaseActionPending} isNarrator={isNarrator}
                    isSender={Boolean(myPlayer?.isSender)} isSelfcareTurn={isMySelfcareTurn}
                    finiteCoins={Boolean(roomState.coinCycle)} rewardsConfirmed={hasConfirmedNtgRewards}
                    emotionSelected={Boolean(selectedCards.emotion)} reflectionCount={selectedCards.reflections.length}
                    selfcareSelected={Boolean(selectedCards.selfcare)} previous={previousPhase} next={nextPhase}
                    nextDisabled={isNarratorNextDisabled} checkpointLocked={isCoinCheckpointLocked}
                    onNavigate={(direction, targetPhase) => setPhaseNavigation({ direction, targetPhase })}
                    onOpenInventory={openInventory} onAdvance={handleAdvance}
                    onOpenGiveCoin={() => setShowGiveCoinPicker(true)}
                    onOpenTargetedCoin={() => setShowNtgTargetedCoinPicker(true)}
                    onOpenLegacyRewards={() => setShowNtgRewardPicker(true)} />
                }
              />
            )}
            renderPlayer={({ player, position, index }) => {
              if (!player) return null
              const isHealerToken = isMyHealerTurn && player.id === myPlayer?.id
              const isSilencerToken = isMySilencerTurn && player.id === myPlayer?.id
              const isProtectedNightTarget = player.isNarrator || player.isSender
              // Healer CAN heal self, Silencer CANNOT silence self
              const canHealTarget = isMyHealerTurn && !isProtectedNightTarget
              const canSilenceTarget = isMySilencerTurn && !isProtectedNightTarget && player.id !== myPlayer?.id
              const canNightActionTarget = canHealTarget || canSilenceTarget
              const selectedNightActionTarget = selectedNightAction?.targetId === player.id
              const nightActionTone = selectedNightActionTarget
                ? selectedNightAction?.type
                : canSilenceTarget
                  ? 'silence'
                  : 'heal'
              const actionTone = nightActionTone
              const isActiveNightRole =
                (activePhase === 'healer-turn' && player.role === healerRole && !healerActionDone) ||
                (activePhase === 'silencer-turn' && player.role === silencerRole && !silencerActionDone)
              const canSeeActiveNightRole = isActiveNightRole && (isNarrator || player.isMe)
              const activeNightActionIcon = activePhase === 'silencer-turn'
                ? '/emcoin/icons/orbit/lock.svg'
                : '/emcoin/icons/orbit/heal.svg'
              const countdownKey = getCountdownKeyForPlayer(player)
              
              // Only disable click on self during SILENCER turn (healer can heal self)
              const isSilencerTurnAndSelf = isMySilencerTurn && player.id === myPlayer?.id
              
              return (
                <MiniPlayerToken
                  key={player.id}
                  player={player}
                  index={index}
                  isTop={position === 'top'}
                  isBottom={position === 'bottom'}
                  showActionIcon={isHealerToken || isSilencerToken || (isNarrator && isActiveNightRole)}
                  showRoleLabel={isNarrator || player.isMe}
                  hideRoleBadge={hideOtherPlayerBadges}
                  isNightDimmed={isNight && !canSeeActiveNightRole}
                  showSleepEffect={isNight && !canSeeActiveNightRole && !canNightActionTarget && !selectedNightActionTarget}
                  isRoleActive={canSeeActiveNightRole}
                  showCountdown={Boolean(countdownKey)}
                  countdownKey={countdownKey ?? undefined}
                  countdownDurationSec={currentTurnCountdownDuration}
                  actionIconSrc={isSilencerToken || (isNarrator && isActiveNightRole) ? activeNightActionIcon : '/emcoin/icons/orbit/heal.svg'}
                  actionIconSide={position === 'right' ? 'left' : 'right'}
                  isActionTarget={canNightActionTarget}
                  actionTargetTone={actionTone}
                  isSelectedActionTarget={selectedNightActionTarget}
                  showCheckmark={
                    (canNightActionTarget && !selectedNightAction?.confirmed) ||
                    (selectedNightActionTarget && selectedNightAction?.confirmed)
                  }
                  onClick={isSilencerTurnAndSelf ? undefined : () => setExpandedPlayer(player)}
                  onActionClick={
                    canHealTarget
                      ? () => handleHealTarget(player.id)
                      : canSilenceTarget
                        ? () => handleSilenceTarget(player.id)
                        : undefined
                  }
                  onUpdateProfile={onUpdateProfile}
                />
              )
            }}
          />
        </div>

        {/* Center celebration — plays handshake-confetti Rive when a phase completes */}
        <PhaseCelebration runId={celebrationRun} />
      </div>

      <AnimatePresence>
        {activePhase === 'situation-card' && capabilities.selectSituation && !selectedCards.situation && situationChoices.length > 0 && (
          <RandomSituationFan
            cards={situationChoices}
            selectedCard={selectedSituationChoice}
            onPick={(card) => { setSelectedSituationChoice(card); handleBrowseSituationCard(card) }}
            onBrowse={handleBrowseSituationCard}
            onStateChange={handleSituationFanState}
            onConfirm={handleConfirmSituationChoice}
            pending={phaseActionPending}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePhase === 'situation-card' && !myPlayer?.isSender && situationFanState && situationFanState.cards.length > 0 && (
          <SituationFanSpectator
            cards={situationFanState.cards}
            activePosition={situationFanState.activePosition}
          />
        )}
      </AnimatePresence>

      {/* ── Phase overlays ─────────────────────────────────────────────────── */}
      <AnimatePresence>
      </AnimatePresence>

      <AnimatePresence>
        {showGiveCoinPicker && (activePhase === 'give-coins' || (Boolean(roomState.coinCycle) && activePhase === 'group-response')) && (
          <GiveCoinPicker
            key={JSON.stringify([roomState.id, myUserId, currentRound, roomState.phaseInstance ?? activePhase])}
            players={players}
            myPlayer={myPlayer}
            onGiveCoin={handleGiveCoin}
            finiteCycle={Boolean(roomState.coinCycle)}
            received={roomState.coinCycle?.received[myUserId]}
            onClose={() => setShowGiveCoinPicker(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNtgTargetedCoinPicker && activePhase === 'group-response' && !myPlayer?.isSender && (
          <GiveCoinPicker
            players={roomState.coinCycle ? players : players.filter(p => p.isSender)}
            myPlayer={myPlayer}
            onGiveCoin={handleGiveCoin}
            finiteCycle={Boolean(roomState.coinCycle)}
            received={roomState.coinCycle?.received[myUserId]}
            onClose={() => setShowNtgTargetedCoinPicker(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNtgRewardPicker && !roomState.coinCycle && activePhase === 'group-response' && myPlayer?.isSender && (
          <NtgRewardPicker
            pending={phaseActionPending || !isConnected}
            players={players}
            rewardedIds={ntgVotedIds}
            pendingIds={pendingNtgRewardIds}
            onTogglePending={togglePendingNtgReward}
            onConfirm={confirmPendingNtgRewards}
            onClose={() => {
              setPendingNtgRewardIds(new Set())
              setShowNtgRewardPicker(false)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRoleRewardPicker && !roomState.coinCycle && activePhase === 'reflection-sharing' && isNarrator && (
          <RoleRewardPicker
            pending={phaseActionPending || !isConnected}
            players={players}
            ntgPlayer={players.find(p => p.isSender)}
            ntgVotedIds={ntgVotedIds}
            onConfirm={handleRoleRewards}
            onClose={handleSkipRoleRewards}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePhase === 'guess-silencer' && !isNarrator && !isMySilencerRole && (capabilities.guessSilencer || hasVoted || Boolean(roomState.votes?.[myUserId])) && (
          <GuessSilencerOverlay players={players} hasVoted={hasVoted || Boolean(roomState.votes?.[myUserId])}
            pending={phaseActionPending || !isConnected} onVote={handleVoteSilencer} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePhase === 'reveal-silencer' && (
          <RevealSilencerOverlay
            key={actionScope}
            players={players}
            votes={roomState.votes ?? {}}
            pending={phaseActionPending || !isConnected}
            onCloseComplete={showRevealRewardPreview}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePhase === 'reward' && (
          <RewardOverlay
            players={players}
            currentRound={currentRound}
            totalRounds={totalRounds}
            isNarrator={isNarrator}
            pending={phaseActionPending || !isConnected}
            canAdvance={capabilities.advance}
            onNext={handleAdvance}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePhase === 'ended' && <EndedOverlay players={players} pending={leavePending} canLeave={isConnected} onLeave={onLeave} />}
      </AnimatePresence>

      <AnimatePresence>
        {flyingActionEffect && (
          <FlyingActionIconEffect
            fromId={flyingActionEffect.fromId}
            toId={flyingActionEffect.toId}
            iconSrc={flyingActionEffect.iconSrc}
            nonce={flyingActionEffect.nonce}
            onDone={() => {
              setFlyingActionEffect(null)
              setSelectedNightAction(null)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <MutedNoticeModal notice={mutedNotice} onDismiss={() => setMutedNotice(null)} />
      </AnimatePresence>

      <AnimatePresence>
        {selectedNightAction && !selectedNightAction.confirmed && (
          <NightActionConfirmModal
            action={selectedNightAction}
            pending={phaseActionPending}
            myPlayerId={myPlayer?.id}
            onCancel={() => setSelectedNightAction(null)}
            onConfirmHeal={confirmHealTarget}
            onConfirmSilence={confirmSilenceTarget}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && <HistoryModal currentRound={currentRound} logs={visibleRoundLogs} pending={phaseActionPending}
          onClose={() => setShowHistory(false)}
          onPreview={card => { setShowHistory(false); setCardPreview({ card, revealed: true }) }} />}
      </AnimatePresence>

      {/* Role reveal overlay - blocks gameplay clicks while everyone inspects roles */}
      <AnimatePresence>
        {showRoleRevealOverlay && myPlayer && (
          <OwnRoleRevealModal key={actionScope} role={myPlayer.role}
            backImage={roleBack} roleImage={ROLE_TO_IMAGE[myPlayer.role] || roleBack}
            pending={phaseActionPending} onClose={() => setDismissedRoleRevealRound(currentRound)} />
        )}
      </AnimatePresence>

      {/* Coin card overlay */}
      <AnimatePresence>
        {coinPreview && (
          <CoinCarousel
            pending={phaseActionPending}
            initialCoinType={coinPreview.coinType}
            title={coinPreview.title}
            coins={myCoinCount}
            onClose={() => setCoinPreview(null)}
          />
        )}
      </AnimatePresence>

      {/* Selected card preview */}
      <AnimatePresence>
        {cardPreview && <SelectedCardPreview preview={cardPreview} selected={boardSelectedCards}
          phase={activePhase} scope={actionScope} pending={phaseActionPending}
          onChange={setCardPreview} onClose={() => setCardPreview(null)} />}
      </AnimatePresence>

      {/* Role card overlay */}
      <AnimatePresence>
        {expandedPlayer && (
          <BoardPreviewModal label="Xem thẻ vai trò" testId="role-card-overlay" pending={phaseActionPending} onClose={() => setExpandedPlayer(null)}>
            {locked =>
            <FlipCard
              frontImage={roleBack}
              backImage={ROLE_TO_IMAGE[expandedPlayer.role] || roleBack}
              altText={expandedPlayer.role}
              size="large"
              allowFlip={!locked}
              onClose={locked ? undefined : () => setExpandedPlayer(null)}
            />
            }
          </BoardPreviewModal>
        )}
      </AnimatePresence>

      {/* Card inventory */}
      <AnimatePresence>
        {showInventory && (
          <CardInventory
            onClose={() => setShowInventory(false)}
            onSelectCard={handleInventorySelect}
            allowedCategory={inventoryMode.category}
            allowedEmotionGroups={roomEmotionGroups}
            allowedSituationGroups={roomSituationGroups}
            showConfirmButton={inventoryMode.showConfirm}
          />
        )}
      </AnimatePresence>

      {/* Phase navigation confirmation popup */}
      <AnimatePresence>
        {phaseNavigation && (
          <PhaseNavConfirmModal
            navigation={phaseNavigation}
            activePhase={activePhase}
            pending={phaseActionPending}
            onCancel={() => setPhaseNavigation(null)}
            onConfirm={handleConfirmPhaseNavigation}
          />
        )}
      </AnimatePresence>

      <GameMenuModal
        catalogScope="room"
        open={showMenu}
        onClose={() => setShowMenu(false)}
        onQuit={handleMenuQuit}
      />

      {/* NTG Reward Success Popup */}
      <AnimatePresence>
        {ntgRewardSuccess && (
          <NtgRewardSuccessPopup
            names={ntgRewardSuccess.names}
            onClose={() => setNtgRewardSuccess(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )

}
