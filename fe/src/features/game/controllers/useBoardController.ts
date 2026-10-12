import { useState, useEffect, useCallback, useRef } from 'react';

import { useMemo } from 'react';

import { useProjectedGameState, useGameUI } from '@/hooks/useGameState';
import { useCoinRewardPreview } from '@/hooks/useCoinRewardPreview';
import type { CardData, SelectedCards } from '@/stores/types';
import { GAME_ROLES, type GamePhase } from '@/stores/types';

import { useRoomCatalog } from '@/features/game/catalog/roomCatalogClient';

import { coinCheckpointLocked } from '@/utils/coinSummary';

import { selectedCardsFromLogs } from '@/components/game/selectedCardsFromLogs';

import { useNightFeedback } from '@/features/game/controllers/useNightFeedback';
import { useConfirmedAction } from '@/features/game/controllers/useConfirmedAction';
import { useSituationPreview } from '@/features/game/controllers/useSituationPreview';
import { usePendingNavigationGuard } from '@/features/overlays/usePopupLifecycle';
import { PHASE_UI, availableCapabilities } from '@/features/game/phases/registry';

import { roundHistory } from '@/features/game/selectors/roundHistory';
import { turnCountdown } from '@/features/game/selectors/turnCountdown';

import type { GameBoardProps } from "./boardTypes";

const CELEBRATE_ON_ENTER: GamePhase[] | 'all' = ['role-reveal']

export function useBoardController({
  roomState,
  mySocketId,
  myUserId,
  isConnected = false,
  leavePending = false,
  onLeave,
  onUpdateProfile,
  nextTurn,
  prevTurn,
  nightAction,
  emitSelectCard,
  ntgVote,
  confirmRoleRewards,
  shareReflection,
  emitCardPreview,
  emitSituationFanState,
  situationPreviewCard,
  situationFanState,
  submitVote,
  giveCoin,
}: GameBoardProps) {
  const { data: CARD_DATA } = useRoomCatalog()
  const [showMenu, setShowMenu] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [cardPreview, setCardPreview] = useState<{ card: CardData; revealed: boolean } | null>(null)
  const [selectedNightAction, setSelectedNightAction] = useState<{
    type: 'heal' | 'silence'
    targetId: string
    targetName: string
    iconSrc: string
    confirmed: boolean
  } | null>(null)
  const [situationChoices, setSituationChoices] = useState<CardData[]>([])
  const [selectedSituationChoice, setSelectedSituationChoice] = useState<CardData | null>(null)
  const [hideOtherPlayerBadges, setHideOtherPlayerBadges] = useState(false)
  const [phaseNavigation, setPhaseNavigation] = useState<{ direction: 'next' | 'prev'; targetPhase: GamePhase } | null>(null)
  const [celebrationRun, setCelebrationRun] = useState(0)
  const celebrationSequenceRef = useRef(0)
  const celebrationSnapshotRef = useRef<{
    roomId: string; viewerId: string; round: number; phase: GamePhase; highestPosition: number
  } | null>(null)
  const [showNtgRewardPicker, setShowNtgRewardPicker] = useState(false)
  const [showRoleRewardPicker, setShowRoleRewardPicker] = useState(false)
  const [showGiveCoinPicker, setShowGiveCoinPicker] = useState(false)
  const [showNtgTargetedCoinPicker, setShowNtgTargetedCoinPicker] = useState(false)
  const [pendingNtgRewardIds, setPendingNtgRewardIds] = useState<Set<string>>(() => new Set())
  const [ntgRewardSuccess, setNtgRewardSuccess] = useState<{names: string[]} | null>(null)

  // Phase-local state
  const [ntgVotedIds, setNtgVotedIds] = useState<Set<string>>(() => new Set())
  const [hasVoted,           setHasVoted]           = useState(false)
  const [hasHealed,           setHasHealed]          = useState(false)
  const [hasSilenced,         setHasSilenced]        = useState(false)

  // Stores
  const { players, myPlayer, isNarrator, selectedCards } = useProjectedGameState(roomState, myUserId, mySocketId)
  const { expandedPlayer, showInventory, inventoryMode, setExpandedPlayer, setShowInventory, setInventoryMode } = useGameUI(players)
  const activePhase = roomState.status === 'ended' ? 'ended' : roomState.phase ?? 'role-reveal'
  const actionScope = JSON.stringify([roomState.id, myUserId, mySocketId, roomState.currentRound,
    roomState.phaseInstance ?? activePhase, activePhase])
  const { pending: commandPending, run: awaitPhaseAction, error: localActionError } = useConfirmedAction(actionScope, isConnected && !leavePending && roomState.status === 'playing')
  const phaseActionPending = commandPending || leavePending
  usePendingNavigationGuard(phaseActionPending)
  const [dismissedRoleRevealRound, setDismissedRoleRevealRound] = useState<number | null>(null)
  const { flyingActionEffect, setFlyingActionEffect, mutedNotice, setMutedNotice } = useNightFeedback(roomState, myUserId, isNarrator)

  const { coinPreview, setCoinPreview, showRevealRewardPreview, resetForNewRound } = useCoinRewardPreview({
    gameLog: roomState.gameLog ?? [],
    playerCount: roomState.players.length,
    myUserId,
    activePhase,
    roomId: roomState.id,
    currentRound: roomState.currentRound,
    rulesVersion: roomState.rulesVersion,
    isConnected,
  })

  // Fire the center handshake-confetti when a phase completes (a new phase begins).
  // See CELEBRATE_ON_ENTER above to control which phases trigger it.
  useEffect(() => {
    const position = roomState.phaseView?.position
    const round = roomState.currentRound
    if (!isConnected || roomState.status !== 'playing' || roomState.phaseView?.phase !== activePhase ||
        round == null || !Number.isInteger(round) || round < 1 || position == null ||
        !Number.isInteger(position) || position < 1 || position > roomState.phaseView.total) {
      celebrationSnapshotRef.current = null
      setCelebrationRun(0)
      return
    }
    const previous = celebrationSnapshotRef.current
    const sameViewer = previous?.roomId === roomState.id && previous.viewerId === myUserId
    const sameRound = sameViewer && previous.round === round
    const forward = sameRound && position > previous.highestPosition
    const nextRound = sameViewer && round === previous.round + 1
    celebrationSnapshotRef.current = { roomId: roomState.id, viewerId: myUserId,
      round, phase: activePhase,
      highestPosition: sameRound ? Math.max(previous.highestPosition, position) : position }
    if (!sameViewer) setCelebrationRun(0)
    // A fresh scope/resume is baseline only. Server positions, not a duplicate
    // frontend phase table, prevent rollback/reentry replay within this round.
    if (!previous || previous.phase === activePhase || (!forward && !nextRound)) return
    const shouldCelebrate = CELEBRATE_ON_ENTER === 'all' || CELEBRATE_ON_ENTER.includes(activePhase)
    if (shouldCelebrate) setCelebrationRun(++celebrationSequenceRef.current)
  }, [activePhase, isConnected, myUserId, roomState.id, roomState.currentRound,
    roomState.status, roomState.phaseView?.phase, roomState.phaseView?.position, roomState.phaseView?.total])

  // Reset phase state on step change
  useEffect(() => {
    setPhaseNavigation(null)
    setSituationChoices([])
    setSelectedSituationChoice(null)
    setNtgVotedIds(new Set())
    setHasVoted(false)
    setHasHealed(false)
    setHasSilenced(false)
    setSelectedNightAction(null)
    setShowRoleRewardPicker(false)
    setShowNtgRewardPicker(false)
    setShowNtgTargetedCoinPicker(false)
    setPendingNtgRewardIds(new Set())
    setNtgRewardSuccess(null)
  }, [actionScope])

  // Reset coin preview dedup refs on round change
  useEffect(() => {
    resetForNewRound()
  }, [roomState.currentRound, resetForNewRound])

  useEffect(() => {
    if (activePhase !== 'role-reveal') setDismissedRoleRevealRound(null)
  }, [activePhase])

  useEffect(() => {
    if (activePhase === 'give-coins') setShowGiveCoinPicker(true)
    else setShowGiveCoinPicker(false)
  }, [activePhase])

  useEffect(() => {
    if (activePhase === 'reflection-sharing' && isNarrator && !roomState.coinCycle) setShowRoleRewardPicker(true)
  }, [activePhase, isNarrator, roomState.coinCycle])

  useEffect(() => {
    if (activePhase !== 'situation-card') {
      setSituationChoices([])
      setSelectedSituationChoice(null)
    }
  }, [activePhase])

  // No auto-open for any card-selection phase — player needs to see board state first

  useEffect(() => {
    if (activePhase !== 'group-response') return
    const votedUserIds = new Set(roomState.ntgVotes?.[myUserId] ?? [])
    const votedSocketIds = roomState.players
      .filter((p) => p.userId && votedUserIds.has(p.userId))
      .map((p) => p.socketId)
    // Merge with existing instead of replacing to preserve optimistic updates
    setNtgVotedIds((prev) => {
      const merged = new Set([...prev, ...votedSocketIds])
      return merged
    })
  }, [activePhase, myUserId, roomState.ntgVotes, roomState.players])

  useEffect(() => {
    if (activePhase !== 'group-response') {
      setShowNtgRewardPicker(false)
      setPendingNtgRewardIds(new Set())
      setNtgRewardSuccess(null)
    }
  }, [activePhase])

  const hasConfirmedNtgRewards = activePhase === 'group-response' && (
    ntgVotedIds.size > 0 || Object.values(roomState.ntgVotes ?? {}).some(arr => arr.length > 0)
  )

  // ─── Handlers ──────────────────────────────────────────────────────────────

  // reserved stubs — will be wired up when give-coins / night phases are re-implemented
  // const sendCoin = ...
  // const handleNightAction = ...

  const getSituationChoices = useCallback(() => {
    const settings = roomState.settings
    const allowedGroups = settings?.situationGroups ?? ['light', 'medium', 'sensitive']
    const filtered = allowedGroups.flatMap(group => CARD_DATA.situationByType[group])
    return [...filtered].sort(() => Math.random() - 0.5)
  }, [roomState.settings, CARD_DATA])

  useEffect(() => {
    if (!isConnected || activePhase !== 'situation-card' || !roomState.phaseView?.capabilities.selectSituation || selectedCards.situation || situationChoices.length > 0) return
    setSituationChoices(getSituationChoices())
  }, [isConnected, activePhase, getSituationChoices, roomState.phaseView?.capabilities.selectSituation, selectedCards.situation, situationChoices.length])

  const handleConfirmSituationChoice = async () => {
    if (!isConnected || !selectedSituationChoice || !roomState.phaseView?.capabilities.selectSituation) return
    if (!await awaitPhaseAction(() => emitSelectCard(roomState.id, selectedSituationChoice))) return
    setSituationChoices([])
    setSelectedSituationChoice(null)
  }

  const togglePendingNtgReward = (id: string) => {
    if (ntgVotedIds.has(id)) return
    setPendingNtgRewardIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmPendingNtgRewards = async () => {
    if (!isConnected || roomState.coinCycle) return
    if (pendingNtgRewardIds.size === 0) {
      setShowNtgRewardPicker(false)
      return
    }

    // Get names of rewarded players
    const rewardedNames = players
      .filter(p => pendingNtgRewardIds.has(p.id))
      .map(p => p.name)

    // Send all votes in one request
    const ids = Array.from(pendingNtgRewardIds)
    if (!await awaitPhaseAction(() => ntgVote(roomState.id, ids))) return

    // Only confirmed batch targets are marked complete.
    setNtgVotedIds((prev) => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })

    setPendingNtgRewardIds(new Set())
    setShowNtgRewardPicker(false)

    // Show success popup
    setNtgRewardSuccess({ names: rewardedNames })
  }

  const handleRoleRewards = async (selectedPlayerIds: string[], rewardNtg: boolean) => {
    if (!isConnected || roomState.coinCycle || !isNarrator || activePhase !== 'reflection-sharing') return
    const confirmed = await awaitPhaseAction(async (isCurrent) => {
      if (rewardNtg && await shareReflection(roomState.id, 'Quản trò xác nhận NTG hoàn thành vai trò') !== true) return false
      if (!isCurrent()) return false
      if (await confirmRoleRewards(roomState.id, selectedPlayerIds) !== true) return false
      if (!isCurrent()) return false
      return await nextTurn(roomState.id) === true
    })
    if (confirmed) setShowRoleRewardPicker(false)
  }

  const handleBrowseSituationCard = useSituationPreview(actionScope,
    isConnected && !phaseActionPending && activePhase === 'situation-card' &&
      Boolean(roomState.phaseView?.capabilities.selectSituation) && !selectedCards.situation,
    (card) => emitCardPreview(roomState.id, card))

  const handleVoteSilencer = async (id: string) => {
    if (!isConnected || !roomState.phaseView?.capabilities.guessSilencer) return
    if (hasVoted || isNarrator || isMySilencerRole) return
    if (await awaitPhaseAction(() => submitVote(roomState.id, id))) setHasVoted(true)
  }

  const handleGiveCoin = async (targetId: string, coinType: 'red' | 'yellow' | 'green', amount = 1) => {
    if (!isConnected || !myPlayer || (activePhase !== 'give-coins' && activePhase !== 'group-response')) return false
    if (targetId === myPlayer.id || amount <= 0 || myPlayer.coins[coinType] < amount) return false
    return giveCoin(roomState.id, targetId, coinType, amount)
  }

  const handleHealTarget = (targetId: string) => {
    const target = players.find((p) => p.id === targetId)
    // Healer CAN heal self - remove self-check
    if (!myPlayer || hasHealed || !target || target.isNarrator || target.isSender) return
    setSelectedNightAction({
      type: 'heal',
      targetId,
      targetName: target.name,
      iconSrc: '/emcoin/icons/orbit/heal.svg',
      confirmed: false,
    })
  }

  const confirmHealTarget = async (targetId: string) => {
    if (!isConnected || !capabilities.heal || !myPlayer || hasHealed) return
    if (!await awaitPhaseAction(() => nightAction(roomState.id, 'heal', targetId))) return
    setHasHealed(true)
    setSelectedNightAction((action) => action?.targetId === targetId ? { ...action, confirmed: true } : action)
  }

  const handleSilenceTarget = (targetId: string) => {
    const target = players.find((p) => p.id === targetId)
    if (!myPlayer || hasSilenced || !target || targetId === myPlayer.id || target.isNarrator || target.isSender) return
    setSelectedNightAction({
      type: 'silence',
      targetId,
      targetName: target.name,
      iconSrc: '/emcoin/icons/orbit/lock.svg',
      confirmed: false,
    })
  }

  const confirmSilenceTarget = async (targetId: string) => {
    if (!isConnected || !capabilities.silence || !myPlayer || hasSilenced) return
    if (!await awaitPhaseAction(() => nightAction(roomState.id, 'silence', targetId))) return
    setHasSilenced(true)
    setSelectedNightAction((action) => action?.targetId === targetId ? { ...action, confirmed: true } : action)
  }

  const handleInventorySelect = async (card: CardData) => {
    if (!isConnected) return false
    if (activePhase === 'emotion-card' && roomState.phaseView?.capabilities.selectEmotion) {
      return awaitPhaseAction(() => emitSelectCard(roomState.id, card))
    } else if (activePhase === 'reflection-card' && roomState.phaseView?.capabilities.selectReflection) {
      return awaitPhaseAction(() => emitSelectCard(roomState.id, card))
    } else if (activePhase === 'selfcare-card' && roomState.phaseView?.capabilities.selectSelfcare) {
      return awaitPhaseAction(() => emitSelectCard(roomState.id, card, 'SELECT_SELFCARE_CARD'))
    }
    return false
  }

  const openInventory = (category?: CardData['category']) => {
    setInventoryMode({ category, showConfirm: !!category })
    setShowInventory(true)
  }

  const roomEmotionGroups = roomState.settings?.emotionGroups ?? ['basic', 'light', 'strong', 'advanced']
  const roomSituationGroups = roomState.settings?.situationGroups ?? ['light', 'medium', 'sensitive']

  // ─── Derived ───────────────────────────────────────────────────────────────
  const currentRound = roomState.currentRound || 1
  const totalRounds  = roomState.totalRounds || 1
  const myCoinCount  = myPlayer?.coins || { red: 0, yellow: 0, green: 0 }
  const healerActionDone = roomState.nightActions?.healed || hasHealed
  const silencerActionDone = roomState.nightActions?.silenced || hasSilenced
  const healerRole = GAME_ROLES.healer
  const silencerRole = GAME_ROLES.silencer
  const phaseView = roomState.phaseView!
  const capabilities = availableCapabilities(phaseView, isConnected)
  const handleAdvance = () => {
    if (!isConnected || !capabilities.advance) return
    void awaitPhaseAction(() => nextTurn(roomState.id))
  }
  const isMySilencerRole = capabilities.isSilencer
  const isMySelfcareTurn = capabilities.selectSelfcare
  const canShowMyRole =
    !!myPlayer?.role &&
    myPlayer.role !== 'Chưa chia vai trò' &&
    myPlayer.role !== 'Chưa chia vai trò'
  const showRoleRevealOverlay =
    activePhase === 'role-reveal' &&
    dismissedRoleRevealRound !== currentRound &&
    canShowMyRole
  const isSenderChoosingSituation = activePhase === 'situation-card' && !!myPlayer?.isSender && !selectedCards.situation
  const showTurnStatus =
    (activePhase !== 'role-reveal' || dismissedRoleRevealRound === currentRound) &&
    !isSenderChoosingSituation

  const turnStatus = PHASE_UI[activePhase]({
    isSender: Boolean(myPlayer?.isSender), isNarrator,
    isHealer: capabilities.isHealer, isSilencer: capabilities.isSilencer,
    healerDone: Boolean(healerActionDone), silencerDone: Boolean(silencerActionDone),
    emotionSelected: Boolean(selectedCards.emotion), selfcareTurn: isMySelfcareTurn,
    selfcareChooser: players.find(player => player.userId === roomState.selfcareActor)?.isSender ? 'Người Trao Gửi' : 'Người chọn thẻ',
    canGuess: capabilities.guessSilencer, rewardsConfirmed: hasConfirmedNtgRewards,
    finiteCoins: Boolean(roomState.coinCycle),
  })
  const disconnectedPlayers = roomState.players.filter(p => !p.isFake && p.isDisconnected)
  const { roundLogs, visibleRoundLogs } = useMemo(
    () => roundHistory(roomState.players, roomState.gameLog, currentRound),
    [roomState.players, roomState.gameLog, currentRound]
  )

  const tableSelectedCards = selectedCardsFromLogs(roundLogs)

  const isNight = ['night', 'healer-turn', 'silencer-turn'].includes(activePhase)
  const isMyHealerTurn = capabilities.heal && !hasHealed
  const isMySilencerTurn = capabilities.silence && !hasSilenced
  const { key: currentTurnCountdownKey, keyFor: getCountdownKeyForPlayer, duration: currentTurnCountdownDuration } = turnCountdown({
    players, currentRound, phase: activePhase, healerDone: healerActionDone, silencerDone: silencerActionDone,
    healerRole, silencerRole, isNarrator, selectedCards, selfcareActor: roomState.selfcareActor,
  })

  const previousPhase = phaseView.previous
  const isCoinCheckpointLocked = coinCheckpointLocked(roomState)
  const nextPhase = phaseView.next
  const effectivePhaseTotal = phaseView.total
  const isNarratorNextDisabled = !capabilities.advance || !nextPhase || (activePhase === 'emotion-card' && !selectedCards.emotion)
  const hasTableSelectedCards = Boolean(tableSelectedCards.situation ||
    tableSelectedCards.emotion ||
    tableSelectedCards.reflections.length > 0 ||
    tableSelectedCards.selfcare)
  const canUseLocalSelectedCards = ['situation-card', 'emotion-card', 'reflection-card', 'selfcare-card'].includes(activePhase)
  const boardSourceCards = hasTableSelectedCards
    ? tableSelectedCards
    : canUseLocalSelectedCards
      ? selectedCards
      : { reflections: [] }
  const boardSelectedCards: SelectedCards = activePhase === 'reflection-card'
    ? { ...boardSourceCards, situation: undefined, emotion: undefined, selfcare: undefined }
    : boardSourceCards.selfcare
      ? { ...boardSourceCards, situation: undefined, emotion: undefined }
      : boardSourceCards
  const handleSituationFanState = (fanCards: CardData[], position: number) =>
    emitSituationFanState(roomState.id, position, fanCards.length ? fanCards : undefined)
  const handleSkipRoleRewards = async () => {
    if (await awaitPhaseAction(() => nextTurn(roomState.id))) setShowRoleRewardPicker(false)
  }
  const handleConfirmPhaseNavigation = async (direction: 'next' | 'prev') => {
    if (!isConnected) return
    const send = direction === 'next' && capabilities.advance ? nextTurn
      : direction === 'prev' && capabilities.rollback && !isCoinCheckpointLocked ? prevTurn : null
    if (send && await awaitPhaseAction(() => send(roomState.id))) setPhaseNavigation(null)
  }
  const handleMenuQuit = async () => {
    if (await onLeave() === true) { setShowMenu(false); return true }
    return false
  }
  return {
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
  }
}
