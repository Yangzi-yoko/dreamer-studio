import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from '../system/entities/admin-user.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import { LoginThrottleService } from '../../common/security/login-throttle.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
    private readonly throttle: LoginThrottleService,
  ) {}

  async login(username: string, password: string, ip?: string): Promise<{ accessToken: string; admin: any }> {
    await this.throttle.assertAllowed(username, ip);
    const admin = await this.adminRepo.findOneBy({ username });
    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
      await this.throttle.onFailure(username, ip);
      throw new BusinessException('账号或密码错误', 40100);
    }
    if (admin.status !== 1) {
      throw new BusinessException('账号已禁用', 40101);
    }
    await this.throttle.onSuccess(username);
    const payload = { sub: admin.id, username: admin.username, isSuper: admin.isSuper, type: 'admin' };
    return {
      accessToken: this.jwtService.sign(payload),
      admin: { id: admin.id, username: admin.username, nickname: admin.nickname, isSuper: admin.isSuper },
    };
  }
}