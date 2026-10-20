import { useId } from 'react'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { useThemePreference, type PublishedTheme } from './preferenceModel'
import { chooseBoardLayout, useBoardLayout } from './boardLayout'

const choices: { id: PublishedTheme; label: string; detail: string; colors: string[] }[] = [
  { id: 'emotion-orbit', label: 'Vòng Cảm Xúc', detail: 'Tím dịu và hồng · đường nét mềm', colors: ['#26366d', '#dcdcf8', '#d87899'] },
  { id: 'kindness-workshop', label: 'Xưởng Tử Tế', detail: 'Xanh dương và san hô · chất liệu giấy', colors: ['#195676', '#ee8173', '#e6bf71'] },
  { id: 'candy-clouds', label: 'Mây Kẹo', detail: 'Hồng phấn và xanh trời · cảm hứng hộp thẻ EmCoin', colors: ['#F3C2D8', '#BCE6F4', '#F5CF75', '#214E63'] },
]
export function ThemeChooser({section='all'}:{section?:'all'|'theme'|'layout'}) {
  const preference = useThemePreference()
  const theme = useControlTheme()
  const layout = useBoardLayout()
  const id = useId()
  if (!preference) return null
  return <fieldset className="theme-chooser" aria-describedby={`${id}-note`}><legend className={section==='all'?undefined:'sr-only'}>Giao diện</legend>
    {section!=='layout'&&<div className="theme-chooser-options">{choices.map(choice => <label key={choice.id}>
      <input type="radio" name={id} value={choice.id} checked={theme === choice.id} onChange={() => preference.choose(choice.id)} />
      <span><strong>{choice.label}</strong><small>{choice.detail}</small><span className="theme-swatches" aria-hidden="true">{choice.colors.map(color => <i key={color} style={{ background: color }} />)}</span></span>
    </label>)}</div>}
    {theme==='candy-clouds'&&section!=='theme'&&<div className="kawaii-layout-choices" role="group" aria-label="Bố cục bàn chơi">
      {section==='all'&&<p>Bố cục bàn chơi</p>}{(['A','B'] as const).map(value=><button type="button" key={value} aria-pressed={layout===value} onClick={()=>chooseBoardLayout(value)}><b>{value==='A'?'A · Quây quần':'B · Tập trung'}</b><small>{value==='A'?'Ngồi quanh bàn tròn':'Thẻ lớn, danh sách riêng'}</small></button>)}
    </div>}
    <p id={`${id}-note`}>Chỉ thay giao diện trên thiết bị này; không thay nội dung thẻ hoặc luật chơi.</p>
    {!preference.saved && <p role="status">Trình duyệt không cho lưu lựa chọn. Giao diện chỉ được giữ trong lần mở này.</p>}
  </fieldset>
}
