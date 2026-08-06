import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { BookingService } from './booking.service';
import { BookingLifecycleService } from './booking-lifecycle.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('rental/bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly lifecycle: BookingLifecycleService,
  ) {}

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingService.create(dto);
  }

  @Get('my')
  my(@Query('phone') phone: string) {
    return this.bookingService.pageByPhone(phone);
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
