import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { CurrentMember, CurrentMemberPayload } from '../member-auth/current-member.decorator';
import { MemberPackageService } from './member-package.service';

@UseGuards(MemberAuthGuard)
@Controller('member/packages')
export class MemberPackageMemberController {
  constructor(private readonly packageService: MemberPackageService) {}

  @Get('mall')
  mall() {
    return this.packageService.mall();
  }

  @Get('mine')
  mine(@CurrentMember() member: CurrentMemberPayload) {
    return this.packageService.pageUserPackages(member.memberId);
  }

  @Post('mall/:packageId/buy')
  buy(@CurrentMember() member: CurrentMemberPayload, @Param('packageId', ParseIntPipe) packageId: number) {
    return this.packageService.buyWithWallet(member.memberId, packageId);
  }
}
