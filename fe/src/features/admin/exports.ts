import type { CatalogDraft } from './catalogClient'
import type { TrafficReport } from './insightsClient'

/** Browser-side file exports of data already shown to the signed-in admin; nothing new is requested here. */
function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  URL.revokeObjectURL(url)
}

export function downloadTrafficCsv(report: TrafficReport) {
  const lines = ['Ngày,Khách truy cập,Lượt xem trang,Phòng được tạo,Ván đã bắt đầu',
    ...report.daily.map(day => [day.day, day.visitors, day.views, day.rooms, day.games].join(','))]
  // The byte-order mark lets Excel read Vietnamese headers.
  download(`emcoin-truy-cap-${report.from}_${report.to}.csv`, 'text/csv;charset=utf-8', `${String.fromCharCode(0xfeff)}${lines.join('\r\n')}\r\n`)
}

export function downloadCatalogJson(draft: CatalogDraft) {
  download(`emcoin-bo-the-ban-nhap-${draft.revision}.json`, 'application/json', JSON.stringify({ revision: draft.revision, cards: draft.cards }, null, 2))
}
