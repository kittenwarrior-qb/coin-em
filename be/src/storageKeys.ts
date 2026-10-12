// Empty namespace preserves existing production keys. Test workers supply a unique prefix.
const namespace = process.env.ROOM_REDIS_NAMESPACE || ''
export const ROOM_PREFIX = `${namespace}room:`
export const ROOM_INDEX = `${namespace}rooms:index`
export const ROOM_TOMBSTONE_PREFIX = `${namespace}rooms:deleted:`
