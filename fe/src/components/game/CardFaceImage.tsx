import { useState, type ImgHTMLAttributes } from 'react'
import { RefreshCw } from 'lucide-react'

type Props = ImgHTMLAttributes<HTMLImageElement> & { retry?: boolean }

/** Error chrome only: retry the exact owned face URL, never substitute card artwork. */
export function CardFaceImage(props: Props) {
  return <Face key={props.src} {...props} />
}

function Face({ retry = false, style, onError, onLoad, ...props }: Props) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  return <>
    <img {...props} key={attempt} style={{ ...style, opacity: failed ? 0 : style?.opacity }}
      onError={event => { setFailed(true); onError?.(event) }}
      onLoad={event => { setFailed(false); onLoad?.(event) }} />
    {failed && <span className="card-face-error absolute inset-0 flex flex-col items-center justify-center gap-2 px-2 text-center">
      <span role="status" className="font-body text-xs">Ảnh thẻ chưa tải được.</span>
      {retry ? <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 font-body text-sm font-bold"
        onClick={event => { event.stopPropagation(); setFailed(false); setAttempt(value => value + 1) }}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />Thử lại
      </button> : <span className="font-body text-[10px]">Mở thẻ để thử lại</span>}
    </span>}
  </>
}
