import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Member } from '../member/entities/member.entity';

const IP_LIMIT = 5;
const FINGERPRINT_LIMIT = 3;

@Injectable()
export class MemberAuthService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  private sign(member: Member): string {
    return this.jwtService.sign({ sub: member.id, type: 'member' });
  }

  async register(phone: string, nickname: string, ip: string, fingerprint: string): Promise<{ accessToken: string; member: any }> {
    const ipCount = Number((await this.redis.get(`reg:ip:${ip}`)) || 0);
    if (ipCount >= IP_LIMIT) throw new BusinessException('注册太频繁，请稍后再试', 40060);
    const fpCount = Number((await this.redis.get(`reg:finger:${fingerprint}`)) || 0);
    if (fpCount >= FINGERPRINT_LIMIT) throw new BusinessException('注册太频繁，请稍后再试', 40060);

    const exists = await this.memberRepo.findOneBy({ phone });
    if (exists) throw new BusinessException('手机号已注册', 40030);
    const member = await this.memberRepo.save(this.memberRepo.create({ phone, nickname }));

    await this.redis.set(`reg:ip:${ip}`, ipCount + 1, 3600);
    await this.redis.set(`reg:finger:${fingerprint}`, fpCount + 1, 86400);
    return { accessToken: this.sign(member), member: { id: member.id, phone, nickname } };
  }

  async login(phone: string): Promise<{ accessToken: string; member: any }> {
    const member = await this.memberRepo.findOneBy({ phone });
    if (!member) throw new BusinessException('会员不存在', 40400);
    return { accessToken: this.sign(member), member: { id: member.id, phone, nickname: member.nickname } };
  }
}
