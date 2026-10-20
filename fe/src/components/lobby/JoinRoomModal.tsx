import { useState } from 'react'
import { CartoonModal, CartoonInput, CartoonButton, CartoonCard } from '@/components/cartoon'
import { RoomCard, RoomListItem } from './RoomCard'
import { useConfirmedAction } from '@/features/game/controllers/useConfirmedAction'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface JoinRoomModalProps {
  open: boolean
  onClose: () => void
  availableRooms: RoomListItem[]
  onJoin: (roomId: string, userName: string) => Promise<boolean> | void
  onRefresh: () => void
}

export function JoinRoomModal({ open, onClose, availableRooms, onJoin }: Omit<JoinRoomModalProps, 'onRefresh'> & { onRefresh?: () => void }) {
  const kawaii=useControlTheme()==='candy-clouds'
  const [entryStep,setEntryStep]=useState(0),[roomPage,setRoomPage]=useState(0)
  const [userName, setUserName] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<RoomListItem | null>(null)
  const [manualRoomId, setManualRoomId] = useState('')
  const { pending, run, error } = useConfirmedAction('join', open)
  const [confirmationError, setConfirmationError] = useState<string | null>(null)

  const effectiveRoomId = selectedRoom?.id || manualRoomId.trim().toUpperCase()
  const canJoin = !!userName.trim() && !!effectiveRoomId

  const handleJoin = async () => {
    if (!canJoin) return
    if (await run(async isCurrent => {
      setConfirmationError(null)
      const result = onJoin(effectiveRoomId, userName.trim())
      const confirmed = result === undefined ? true : await result
      if (!confirmed && isCurrent()) setConfirmationError('Chưa xác nhận vào phòng. Tên và mã phòng của bạn vẫn được giữ.')
      return confirmed
    })) onClose()
  }

  return (
    <CartoonModal open={open} onClose={pending ? undefined : onClose} persistent={pending} hideClose={pending} title="Tìm phòng" className={kawaii?'kawaii-entry-join':undefined} data-testid="modal-join">
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3 border-0 p-0">
        {kawaii&&<nav className="kawaii-tabs"><button type="button" aria-pressed={entryStep===0} onClick={()=>setEntryStep(0)}>Chọn phòng</button><button type="button" aria-pressed={entryStep===1} onClick={()=>setEntryStep(1)}>Tên của bạn</button></nav>}
        {(!kawaii||entryStep===0)&&<>
        {availableRooms.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm">Phòng đang chờ</span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto scroll-cartoon" style={{ maxHeight: 184 }}>
              {(kawaii?availableRooms.slice(Math.min(roomPage,Math.max(0,availableRooms.length-1)),Math.min(roomPage,Math.max(0,availableRooms.length-1))+1):availableRooms).map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  selected={selectedRoom?.id === room.id}
                  onSelect={() => { setSelectedRoom(room); setManualRoomId('') }}
                />
              ))}
            </div>
            {kawaii&&availableRooms.length>1&&<nav className="kawaii-chat-pages" aria-label="Trang phòng"><button type="button" aria-label="Phòng trước" disabled={roomPage===0} onClick={()=>setRoomPage(roomPage-1)}><ArrowLeft/></button><small>{Math.min(roomPage+1,availableRooms.length)} / {availableRooms.length}</small><button type="button" aria-label="Phòng sau" disabled={roomPage>=availableRooms.length-1} onClick={()=>setRoomPage(roomPage+1)}><ArrowRight/></button></nav>}
          </div>
        ) : (
          <CartoonCard pastel="yellow" variant="sm" className="p-3 text-center">
            <p className="font-body text-sm">Chưa có phòng nào đang chờ</p>
          </CartoonCard>
        )}

        <CartoonInput
          label="Mã phòng"
          data-testid="input-room-id"
          value={selectedRoom ? selectedRoom.id : manualRoomId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setManualRoomId(e.target.value.toUpperCase())
            setSelectedRoom(null)
          }}
          placeholder="Nhập mã phòng"
        />
        </>}

        {(!kawaii||entryStep===1)&&
        <CartoonInput
          label="Tên của bạn"
          data-testid="input-username-join"
          value={userName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)}
          placeholder="Nhập tên"
        />}

        {kawaii&&entryStep===0?<CartoonButton disabled={!effectiveRoomId} onClick={()=>setEntryStep(1)}>Tiếp tục</CartoonButton>:<CartoonButton
          color="green"
          size="lg"
          disabled={!canJoin}
          pending={pending}
          onClick={handleJoin}
          data-testid="btn-confirm-join"
        >
          {kawaii?'Vào phòng':'Vào phòng 🎮'}
        </CartoonButton>}
      </fieldset>
      {(error || confirmationError) && <p role="alert" className="font-body text-sm">{error || confirmationError}</p>}
    </CartoonModal>
  )
}
