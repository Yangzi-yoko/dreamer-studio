import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { LoginThrottleService } from '../../common/security/login-throttle.service';
import { Member } from '../member/entities/member.entity';
import { MemberReferralService } from '../member/member-referral.service';
import * as bcrypt from 'bcryptjs';

const IP_WINDOW = 900;
const IP_LIMIT = 10;
const FP_REAL_WINDOW = 3600;
const FP_REAL_LIMIT = 5;
const FP_UNKNOWN_WINDOW = 3600;
const FP_UNKNOWN_LIMIT = 30;

@Injectable()
export class MemberAuthService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly referralService: MemberReferralService,
    private readonly throttle: LoginThrottleService,
  ) {}

  private sign(member: Member): string {
    return this.jwtService.sign({ sub: member.id, type: 'member' });
  }

  private async assertRegisterAllowed(ip: string, fingerprint: string): Promise<void> {
    const ipCount = await this.redis.incr(`reg:ip:${ip}`, IP_WINDOW);
    if (ipCount > IP_LIMIT) {
      const ipTtl = Math.max(await this.redis.ttl(`reg:ip:${ip}`), 0);
      throw new BusinessException(`注册太频繁，请${Math.ceil(ipTtl / 60)}分钟后再试`, 40060);
    }
    if (fingerprint && fingerprint !== 'unknown') {
      const fpCount = await this.redis.incr(`reg:finger:${fingerprint}`, FP_REAL_WINDOW);
      if (fpCount > FP_REAL_LIMIT) {
        const fpTtl = Math.max(await this.redis.ttl(`reg:finger:${fingerprint}`), 0);
        throw new BusinessException(`注册太频繁，请${Math.ceil(fpTtl / 60)}分钟后再试`, 40060);
      }
    } else {
      const fpCount = await this.redis.incr('reg:fp:unknown', FP_UNKNOWN_WINDOW);
      if (fpCount > FP_UNKNOWN_LIMIT) {
        const fpTtl = Math.max(await this.redis.ttl('reg:fp:unknown'), 0);
        throw new BusinessException(`注册太频繁，请${Math.ceil(fpTtl / 60)}分钟后再试`, 40060);
      }
    }
  }

  async register(dto: { phone: string; username: string; password: string; nickname: string; inviteCode?: string }, ip: string, fingerprint: string): Promise<{ accessToken: string; member: any }> {
    await this.assertRegisterAllowed(ip, fingerprint);

    const existsPhone = await this.memberRepo.findOneBy({ phone: dto.phone });
    if (existsPhone) throw new BusinessException('手机号已注册', 40030);
    const existsUser = await this.memberRepo.findOneBy({ username: dto.username });
    if (existsUser) throw new BusinessException('账号已存在', 40031);
    const member = await this.memberRepo.save(this.memberRepo.create({
      phone: dto.phone,
      username: dto.username,
      passwordHash: bcrypt.hashSync(dto.password, 10),
      nickname: dto.nickname,
    }));

    if (dto.inviteCode) {
      try {
        await this.referralService.bind(member.id, dto.inviteCode);
      } catch {
        // ignore invalid invite code on registration
      }
    }

    return { accessToken: this.sign(member), member: { id: member.id, phone: dto.phone, username: dto.username, nickname: dto.nickname } };
  }

  async login(username: string, password: string, ip?: string): Promise<{ accessToken: string; member: any }> {
    await this.throttle.assertAllowed(username, ip);
    const member = await this.memberRepo.findOneBy({ username });
    if (!member || !bcrypt.compareSync(password, member.passwordHash)) {
      await this.throttle.onFailure(username, ip);
      throw new BusinessException('账号或密码错误', 40100);
    }
    if (member.status !== 1) {
      throw new BusinessException('账号已禁用', 40101);
    }
    await this.throttle.onSuccess(username);
    return { accessToken: this.sign(member), member: { id: member.id, phone: member.phone, username: member.username, nickname: member.nickname } };
  }
}