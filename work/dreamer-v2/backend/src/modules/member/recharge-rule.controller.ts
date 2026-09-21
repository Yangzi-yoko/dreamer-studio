import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RechargeRule } from './entities/recharge-rule.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member/recharge-rules')
export class RechargeRuleController {
  constructor(
    @InjectRepository(RechargeRule) private readonly ruleRepo: Repository<RechargeRule>,
  ) {}

  @Get()
  @Permissions('member:wallet:list')
  async page(@Query('page') page = 1, @Query('pageSize') pageSize = 50) {
    const [list, total] = await this.ruleRepo.findAndCount({
      order: { sort: 'ASC', amountCents: 'ASC' },
      take: Number(pageSize),
      skip: (Number(page) - 1) * Number(pageSize),
    });
    return { list: list.map(r => ({ ...r, amountYuan: r.amountCents / 100, bonusYuan: r.bonusCents / 100 })), total };
  }

  @Post()
  @Permissions('member:wallet:list')
  async create(@Body() dto: { amountYuan: number; bonusYuan: number; label?: string; recommended?: boolean; sort?: number }) {
    if (!dto.amountYuan || dto.amountYuan <= 0) throw new BusinessException('充值金额必须大于0', 40040);
    if (dto.bonusYuan == null || dto.bonusYuan < 0) throw new BusinessException('赠送金额不能为负', 40043);
    const exists = await this.ruleRepo.findOneBy({ amountCents: Math.round(dto.amountYuan * 100) });
    if (exists) throw new BusinessException('该充值金额规则已存在', 40044);
    return this.ruleRepo.save(this.ruleRepo.create({
      amountCents: Math.round(dto.amountYuan * 100),
      bonusCents: Math.round(dto.bonusYuan * 100),
      label: dto.label,
      recommended: dto.recommended ?? false,
      sort: dto.sort ?? 0,
    }));
  }

  @Put(':id')
  @Permissions('member:wallet:list')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: { amountYuan?: number; bonusYuan?: number; label?: string; recommended?: boolean; enabled?: boolean; sort?: number }) {
    const rule = await this.ruleRepo.findOneBy({ id });
    if (!rule) throw new BusinessException('规则不存在', 40400);
    if (dto.amountYuan !== undefined) rule.amountCents = Math.round(dto.amountYuan * 100);
    if (dto.bonusYuan !== undefined) rule.bonusCents = Math.round(dto.bonusYuan * 100);
    if (dto.label !== undefined) rule.label = dto.label;
    if (dto.recommended !== undefined) rule.recommended = dto.recommended;
    if (dto.enabled !== undefined) rule.enabled = dto.enabled;
    if (dto.sort !== undefined) rule.sort = dto.sort;
    return this.ruleRepo.save(rule);
  }

  @Delete(':id')
  @Permissions('member:wallet:list')
  async delete(@Param('id', ParseIntPipe) id: number) {
    const rule = await this.ruleRepo.findOneBy({ id });
    if (!rule) throw new BusinessException('规则不存在', 40400);
    await this.ruleRepo.remove(rule);
    return { ok: true };
  }
}
