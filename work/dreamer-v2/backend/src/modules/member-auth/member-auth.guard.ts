import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MemberAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user || user.type !== 'member') {
      throw err || new Error('未登录');
    }
    return { memberId: user.sub } as TUser;
  }
}
