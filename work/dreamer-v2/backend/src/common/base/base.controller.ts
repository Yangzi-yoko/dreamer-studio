import { Body, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { BaseService } from './base.service';
import { PageResult } from './page-result';

export abstract class BaseController<T extends { id: any }> {
  protected constructor(protected readonly service: BaseService<T>) {}

  @Get()
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10): Promise<PageResult<T>> {
    return this.service.page(Number(page), Number(pageSize));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<T> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: Partial<T>): Promise<T> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<T>): Promise<T> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    await this.service.remove(id);
    return { id };
  }
}
