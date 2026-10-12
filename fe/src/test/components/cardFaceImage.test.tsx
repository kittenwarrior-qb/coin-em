import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CardFaceImage } from '@/components/game/CardFaceImage'

afterEach(cleanup)
it('reports an unavailable face and retries the identical URL without flipping the parent', () => {
  const flip = vi.fn()
  render(<div onClick={flip}><CardFaceImage retry src="/owned-front.png" alt="Mặt thẻ" /></div>)
  const image = screen.getByAltText('Mặt thẻ')
  fireEvent.error(image)
  expect(screen.getByRole('status')).toHaveTextContent('Ảnh thẻ chưa tải được')
  expect(image).toHaveAttribute('src', '/owned-front.png')
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(flip).not.toHaveBeenCalled()
  const retried = screen.getByAltText('Mặt thẻ')
  expect(retried).not.toBe(image)
  expect(retried).toHaveAttribute('src', '/owned-front.png')
  fireEvent.load(retried)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
it('keeps inventory previews actionable without nesting a retry button', () => {
  const open = vi.fn()
  const { rerender } = render(<button onClick={open}><CardFaceImage src="/owned-front.png" alt="Thẻ" /></button>)
  fireEvent.error(screen.getByAltText('Thẻ'))
  expect(screen.getAllByRole('button')).toHaveLength(1)
  fireEvent.click(screen.getByText('Mở thẻ để thử lại'))
  expect(open).toHaveBeenCalledOnce()
  rerender(<button onClick={open}><CardFaceImage src="/next-owned.png" alt="Thẻ" /></button>)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByAltText('Thẻ')).toHaveAttribute('src', '/next-owned.png')
})
