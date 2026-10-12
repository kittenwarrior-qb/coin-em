const pending = new Map<string, Promise<unknown>>()

/** Serialize one room without blocking independent rooms; failures cannot poison the queue. */
export async function inRoomQueue<T>(roomId: string, operation: () => T | Promise<T>): Promise<T> {
  const previous = pending.get(roomId) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(operation)
  pending.set(roomId, current)
  try { return await current }
  finally { if (pending.get(roomId) === current) pending.delete(roomId) }
}
