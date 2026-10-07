import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

/** Allows only user JWTs whose role is admin; service API keys are rejected */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const role = context.switchToHttp().getRequest().user?.role
    return role === 'ADMIN' || role === 'admin'
  }
}
