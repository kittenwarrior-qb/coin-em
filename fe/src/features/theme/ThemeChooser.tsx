import { useId } from 'react'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { useThemePreference, type PublishedTheme } from './preferenceModel'

const choices: { id: PublishedTheme; label: string; detail: string; colors: string[] }[] = [
  { id: 'emotion-orbit', label: 'Vòng Cảm Xúc', detail: 'Tím dịu và hồng · đường nét mềm', colors: ['#26366d', '#dcdcf8', '#d87899'] },
  { id: 'kindness-workshop', label: 'Xưởng Tử Tế', detail: 'Xanh dương và san hô · chất liệu giấy', colors: ['#195676', '#ee8173', '#e6bf71'] },
  { id: 'candy-clouds', label: 'Mây Kẹo', detail: 'Hồng phấn và xanh trời · cảm hứng hộp thẻ EmCoin', colors: ['#F1B8D5', '#A8DCF1', '#F5C857', '#157D94'] },
]
export function ThemeChooser() {
  const preference = useThemePreference()
  const theme = useControlTheme()
  const id = useId()
  if (!preference) return null
  return <fieldset className="theme-chooser" aria-describedby={`${id}-note`}><legend>Giao diện</legend>
    <div className="theme-chooser-options">{choices.map(choice => <label key={choice.id}>
      <input type="radio" name={id} value={choice.id} checked={theme === choice.id} onChange={() => preference.choose(choice.id)} />
      <span><strong>{choice.label}</strong><small>{choice.detail}</small><span className="theme-swatches" aria-hidden="true">{choice.colors.map(color => <i key={color} style={{ background: color }} />)}</span></span>
    </label>)}</div>
    <p id={`${id}-note`}>Chỉ thay giao diện trên thiết bị này; không thay nội dung thẻ hoặc luật chơi.</p>
    {!preference.saved && <p role="status">Trình duyệt không cho lưu lựa chọn. Giao diện chỉ được giữ trong lần mở này.</p>}
  </fieldset>
}
