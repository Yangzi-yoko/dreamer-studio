import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../../common/base/base.service';
import { PageResult } from '../../common/base/page-result';
import { toYuan } from '../../common/utils/money.utils';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Member } from './entities/member.entity';
import { MemberLevel } from './entities/member-level.entity';
import { MemberTag } from './entities/member-tag.entity';
import { SaveMemberDto } from './dto/save-member.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class MemberService extends BaseService<Member> {
  constructor(
    @InjectRepository(Member) repo: Repository<Member>,
    @InjectRepository(MemberLevel) private readonly levelRepo: Repository<MemberLevel>,
    @InjectRepository(MemberTag) private readonly tagRepo: Repository<MemberTag>,
  ) {
    super(repo);
  }

  async page(page = 1, pageSize = 10): Promise<PageResult<any>> {
    const [list, total] = await this.repo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' } as any,
      relations: { tags: true },
    });
    return { list: list.map((m) => this.toPublic(m)), total, page, pageSize };
  }

  async findOne(id: number): Promise<any> {
    const member = await this.repo.findOne({ where: { id }, relations: { tags: true } });
    if (!member) throw new BusinessException('会员不存在', 40400);
    return this.toPublic(member);
  }

  async create(dto: SaveMemberDto): Promise<any> {
    const exists = await this.repo.findOneBy({ phone: dto.phone });
    if (exists) throw new BusinessException('手机号已注册', 40030);
    const username = dto.username?.trim() || dto.phone;
    const existsUser = await this.repo.findOneBy({ username });
    if (existsUser) throw new BusinessException('账号已存在', 40031);
    const member = this.repo.create({
      phone: dto.phone,
      username,
      passwordHash: bcrypt.hashSync(dto.password || '123456', 10),
      nickname: dto.nickname,
      avatar: dto.avatar,
      birthday: dto.birthday,
      levelId: dto.levelId,
      tags: dto.tagIds?.length ? await this.tagRepo.findBy({ id: In(dto.tagIds) }) : [],
    });
    return this.toPublic(await this.repo.save(member));
  }

  async update(id: number, dto: SaveMemberDto): Promise<any> {
    const member = await super.findOne(id);
    Object.assign(member, {
      nickname: dto.nickname,
      avatar: dto.avatar,
      birthday: dto.birthday,
      levelId: dto.levelId,
    });
    if (dto.username !== undefined && dto.username !== member.username) {
      const username = dto.username.trim() || member.phone;
      const existsUser = await this.repo.findOneBy({ username });
      if (existsUser && existsUser.id !== member.id) throw new BusinessException('账号已存在', 40031);
      member.username = username;
    }
    if (dto.password) member.passwordHash = bcrypt.hashSync(dto.password, 10);
    if (dto.status !== undefined) member.status = dto.status;
    if (dto.tagIds) member.tags = await this.tagRepo.findBy({ id: In(dto.tagIds) });
    return this.toPublic(await this.repo.save(member));
  }

  async addConsumption(phone: string, amountCents: number): Promise<any> {
    const member = await this.repo.findOneBy({ phone });
    if (!member) throw new BusinessException('会员不存在', 40400);
    member.totalSpendCents += amountCents;
    member.totalOrders += 1;
    const levels = await this.levelRepo.find({ where: { enabled: true }, order: { sort: 'ASC' } });
    if (levels.length) {
      const target = [...levels]
        .filter((l) => member.totalSpendCents >= l.minSpendCents && member.totalOrders >= l.minOrders)
        .sort((a, b) => b.sort - a.sort)[0];
      if (target && (!member.levelId || (target.sort > (levels.find((l) => l.id === member.levelId)?.sort ?? 0)))) {
        member.levelId = target.id;
      }
    }
    return this.toPublic(await this.repo.save(member));
  }

  private toPublic(m: Member): any {
    return {
      id: m.id,
      phone: m.phone,
      username: m.username,
      nickname: m.nickname,
      avatar: m.avatar,
      birthday: m.birthday,
      levelId: m.levelId,
      totalSpend: toYuan(m.totalSpendCents),
      totalOrders: m.totalOrders,
      status: m.status,
      tags: m.tags?.map((t) => ({ id: t.id, name: t.name, color: t.color })) ?? [],
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
