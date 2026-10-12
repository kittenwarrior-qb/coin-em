import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'

it('keeps every game-handler exception ACK/event fixed and free of raw errors', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'src/socket/handlers/gameHandlers.ts'), 'utf8')
  expect(source.match(/message: INTERNAL_ERROR_MESSAGE/g)).toHaveLength(12)
  expect(source).toContain("const INTERNAL_ERROR_MESSAGE = 'Chưa thể xác nhận thao tác. Vui lòng kiểm tra lại trạng thái phòng.'")
  expect(source).not.toMatch(/message:\s*(error|err)\??\.message/)
})
