import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secret'),
    });
  }

  validate(payload: { sub: number; username: string; isSuper: boolean; type?: string }): {
    adminId: number;
    username?: string;
    isSuper?: boolean;
    type?: string;
    sub: number;
  } {
    return { adminId: payload.sub, username: payload.username, isSuper: payload.isSuper, type: payload.type, sub: payload.sub };
  }
}
