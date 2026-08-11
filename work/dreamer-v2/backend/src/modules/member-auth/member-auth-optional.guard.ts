import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class MemberAuthOptionalGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header: string = request.headers?.authorization || '';
    if (!header.startsWith('Bearer ')) return true;
    try {
      const payload = this.jwtService.verify(header.slice(7)) as { sub: number; type?: string };
      if (payload.type === 'member' && payload.sub) {
        request.user = { memberId: payload.sub };
      }
    } catch {
      /* invalid or expired member token -> treat as guest */
    }
    return true;
  }
}