import { CartoonButton } from '@/components/cartoon'

export function PhaseDiagnostic({ onLeave }: { onLeave: () => void }) {
  return <div className="screen-cartoon">
    <div className="screen-panel p-6 flex flex-col gap-4 max-w-sm">
      <div role="alert" className="font-body text-[var(--c-gray-dark)]">
        Chưa có thông tin lượt chơi tương thích. Hãy kết nối lại hoặc cập nhật ứng dụng trước khi tiếp tục.
      </div>
      <CartoonButton color="purple" onClick={onLeave}>Rời phòng</CartoonButton>
    </div>
  </div>
}
