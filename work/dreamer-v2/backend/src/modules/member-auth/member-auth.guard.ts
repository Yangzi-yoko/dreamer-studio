import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MemberAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      throw err || new Error('???');
    }
    if (user.type === 'member') {
      return { memberId: user.sub } as TUser;
    }
    if (user.username) {
      return { adminId: user.sub, username: user.username } as TUser;
    }
    throw new Error('???');
  }
}
