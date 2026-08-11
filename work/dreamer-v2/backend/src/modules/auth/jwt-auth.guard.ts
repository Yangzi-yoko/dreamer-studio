import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user || user.type === 'member') {
      throw err || new UnauthorizedException('未登录或登录已过期');
    }
    return user;
  }
}