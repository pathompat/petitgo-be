import { ExecutionContext } from '@nestjs/common'
import { AdminGuard } from './admin.guard'

const contextFor = (user: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as ExecutionContext

describe('AdminGuard', () => {
  const guard = new AdminGuard()

  it('allows admin roles', () => {
    expect(guard.canActivate(contextFor({ role: 'ADMIN' }))).toBe(true)
    expect(guard.canActivate(contextFor({ role: 'admin' }))).toBe(true)
  })

  it('rejects non-admin users and API key callers', () => {
    expect(guard.canActivate(contextFor({ role: 'USER' }))).toBe(false)
    expect(guard.canActivate(contextFor({ apiKey: 'key' }))).toBe(false)
    expect(guard.canActivate(contextFor(undefined))).toBe(false)
  })
})
