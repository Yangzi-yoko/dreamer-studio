import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { PointsExchangeService } from './points-exchange.service';
import { ExchangePointsDto } from './dto/exchange-points.dto';

@UseGuards(MemberAuthGuard)
@Controller('member/point-exchanges')
export class PointsExchangeMemberController {
  constructor(private readonly exchangeService: PointsExchangeService) {}

  @Get('mine')
  mine(@CurrentMember() member: CurrentMemberPayload, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.exchangeService.pageMine(member.memberId, Number(page), Number(pageSize));
  }

  @Post()
  exchange(@CurrentMember() member: CurrentMemberPayload, @Body() dto: ExchangePointsDto) {
    return this.exchangeService.exchange(member.memberId, dto);
  }
}