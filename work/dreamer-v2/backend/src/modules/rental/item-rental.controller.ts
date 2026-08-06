import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../system/permissions.guard';
import { Permissions } from '../system/permissions.decorator';
import { ItemRentalService } from './item-rental.service';
import { CreateItemRentalDto } from './dto/create-item-rental.dto';

@Controller('rental/item-rentals')
export class ItemRentalController {
  constructor(private readonly itemRentalService: ItemRentalService) {}

  @Post()
  create(@Body() dto: CreateItemRentalDto) {
    return this.itemRentalService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @Permissions('rental:item-rental:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('status') status?: string) {
    return this.itemRentalService.page(Number(page), Number(pageSize), status);
  }
}
