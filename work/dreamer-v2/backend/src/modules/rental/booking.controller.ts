import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('rental/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @Permissions('rental:booking:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('status') status?: string) {
    return this.bookingService.page(Number(page), Number(pageSize), status);
  }
}
