import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { ItemRentalService } from './item-rental.service';
import { ItemRentalLifecycleService } from './item-rental-lifecycle.service';
import { CreateItemRentalDto } from './dto/create-item-rental.dto';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { ThrottleGuard } from '../../common/throttle/throttle.guard';
import { Throttle } from '../../common/throttle/throttle.decorator';

@Controller('rental/item-rentals')
export class ItemRentalController {
  constructor(
    private readonly itemRentalService: ItemRentalService,
    private readonly lifecycle: ItemRentalLifecycleService,
  ) {}

  @UseGuards(MemberAuthGuard, ThrottleGuard)
  @Throttle({ limit: 30, windowSeconds: 60 })
  @Post()
  create(@Body() dto: CreateItemRentalDto, @CurrentMember() member?: CurrentMemberPayload) {
    return this.itemRentalService.create(dto, member);
  }

  @UseGuards(MemberAuthGuard, ThrottleGuard)
  @Throttle({ limit: 20, windowSeconds: 60 })
  @Get('my')
  my(@CurrentMember() member?: CurrentMemberPayload) {
    return this.itemRentalService.pageMy(member);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @Permissions('rental:item-rental:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('status') status?: string) {
    return this.itemRentalService.page(Number(page), Number(pageSize), status);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/pay')
  @Permissions('rental:item-rental:check')
  pay(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.pay(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/pick')
  @Permissions('rental:item-rental:check')
  pick(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.pick(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/return')
  @Permissions('rental:item-rental:return')
  returnRental(@Param('id', ParseIntPipe) id: number, @Body() dto: { damageDeductYuan?: number }) {
    return this.lifecycle.returnRental(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/complete')
  @Permissions('rental:item-rental:check')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.complete(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/cancel')
  @Permissions('rental:item-rental:cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.cancel(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/refund')
  @Permissions('rental:item-rental:refund')
  refund(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.refund(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/extend')
  @Permissions('rental:item-rental:extend')
  extend(@Param('id', ParseIntPipe) id: number, @Body() dto: { extendDays: number; extendSlotCount: number }) {
    return this.lifecycle.extend(id, dto);
  }
}