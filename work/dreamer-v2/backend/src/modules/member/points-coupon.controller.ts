import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { PointsCouponService } from './points-coupon.service';
import { RedeemPointsCouponDto } from './dto/redeem-points-coupon.dto';
import { SavePointsCouponDto } from './dto/save-points-coupon.dto';

@Controller('member/point-coupons')
export class PointsCouponController {
  constructor(private readonly couponService: PointsCouponService) {}

  @Get('mall')
  mall() {
    return this.couponService.mall();
  }

  @UseGuards(MemberAuthGuard)
  @Post('redeem')
  redeem(@CurrentMember() member: CurrentMemberPayload, @Body() dto: RedeemPointsCouponDto) {
    return this.couponService.redeem(member.memberId, dto.id);
  }

  @UseGuards(MemberAuthGuard)
  @Get('mine')
  mine(@CurrentMember() member: CurrentMemberPayload, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.couponService.pageMine(member.memberId, Number(page), Number(pageSize));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('admin')
  @Permissions('member:point-coupon:list')
  pageAdmin(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.couponService.pageAdmin(Number(page), Number(pageSize));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('logs')
  @Permissions('member:point-coupon:list')
  pageLogs(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.couponService.pageLogs(Number(page), Number(pageSize));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @Permissions('member:point-coupon:create')
  create(@Body() dto: SavePointsCouponDto) {
    return this.couponService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put(':id')
  @Permissions('member:point-coupon:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SavePointsCouponDto) {
    return this.couponService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  @Permissions('member:point-coupon:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.couponService.remove(id);
    return { id };
  }
}