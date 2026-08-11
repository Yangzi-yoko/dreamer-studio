import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { BookingService } from './booking.service';
import { BookingLifecycleService } from './booking-lifecycle.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PreviewBookingDto } from './dto/preview-booking.dto';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { MemberAuthOptionalGuard } from '../member-auth/member-auth-optional.guard';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { ThrottleGuard } from '../../common/throttle/throttle.guard';
import { Throttle } from '../../common/throttle/throttle.decorator';

@Controller('rental/bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly lifecycle: BookingLifecycleService,
  ) {}

  @UseGuards(MemberAuthGuard, ThrottleGuard)
  @Throttle({ limit: 30, windowSeconds: 60 })
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentMember() member: CurrentMemberPayload) {
    return this.bookingService.create(dto, member);
  }

  @UseGuards(MemberAuthOptionalGuard, ThrottleGuard)
  @Throttle({ limit: 60, windowSeconds: 60 })
  @Post('preview')
  preview(@Body() dto: PreviewBookingDto, @CurrentMember() member?: CurrentMemberPayload) {
    return this.bookingService.preview(dto, member);
  }

  @UseGuards(MemberAuthGuard, ThrottleGuard)
  @Throttle({ limit: 30, windowSeconds: 60 })
  @Get('my')
  my(@CurrentMember() member: CurrentMemberPayload) {
    return this.bookingService.pageMy(member);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @Permissions('rental:booking:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('status') status?: string) {
    return this.bookingService.page(Number(page), Number(pageSize), status);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/pay')
  @Permissions('rental:booking:check')
  pay(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.pay(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/check-in')
  @Permissions('rental:booking:check')
  checkIn(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.checkIn(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/complete')
  @Permissions('rental:booking:check')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.complete(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/cancel')
  @Permissions('rental:booking:cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.cancel(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/refund')
  @Permissions('rental:booking:refund')
  refund(@Param('id', ParseIntPipe) id: number) {
    return this.lifecycle.refund(id);
  }
}