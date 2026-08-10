import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Member } from '../member/entities/member.entity';
import { MemberReferralService } from '../member/member-referral.service';
import * as bcrypt from 'bcryptjs';

const IP_LIMIT = 5;
const FINGERPRINT_LIMIT = 3;

@Injectable()
export class MemberAuthService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly referralService: MemberReferralService,
  ) {}

  private sign(member: Member): string {
    return this.jwtService.sign({ sub: member.id, type: 'member' });
  }

  async register(dto: { phone: string; username: string; password: string; nickname: string; inviteCode?: string }, ip: string, fingerprint: string): Promise<{ accessToken: string; member: any }> {
    const ipCount = Number((await this.redis.get(`reg:ip:${ip}`)) || 0);
    if (ipCount >= IP_LIMIT) throw new BusinessException('注册太频繁，请稍后再试', 40060);
    const fpCount = Number((await this.redis.get(`reg:finger:${fingerprint}`)) || 0);
    if (fpCount >= FINGERPRINT_LIMIT) throw new BusinessException('注册太频繁，请稍后再试', 40060);

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

    await this.redis.set(`reg:ip:${ip}`, ipCount + 1, 3600);
    await this.redis.set(`reg:finger:${fingerprint}`, fpCount + 1, 86400);
    return { accessToken: this.sign(member), member: { id: member.id, phone: dto.phone, username: dto.username, nickname: dto.nickname } };
  }

  async login(username: string, password: string): Promise<{ accessToken: string; member: any }> {
    const member = await this.memberRepo.findOneBy({ username });
    if (!member || !bcrypt.compareSync(password, member.passwordHash)) {
      throw new BusinessException('账号或密码错误', 40100);
    }
    if (member.status !== 1) {
      throw new BusinessException('账号已禁用', 40101);
    }
    return { accessToken: this.sign(member), member: { id: member.id, phone: member.phone, username: member.username, nickname: member.nickname } };
  }
}