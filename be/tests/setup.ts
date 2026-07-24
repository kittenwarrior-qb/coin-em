import { vi } from 'vitest'

// Mock Redis so all tests run without a real Redis connection.
// Path must match exactly how source files import it.
vi.mock('../src/redis')
