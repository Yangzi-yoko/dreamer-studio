import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MemberAuthService } from './member-auth.service';
import { MemberAuthGuard } from './member-auth.guard';
import { CurrentMember, CurrentMemberPayload } from './current-member.decorator';
import { ThrottleGuard } from '../../common/throttle/throttle.guard';
import { Throttle } from '../../common/throttle/throttle.decorator';

class RegisterDto {
  @Matches(/^1\d{10}$/)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: '密码至少 8 位，且需同时包含字母和数字' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  nickname!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  inviteCode?: string;
}

class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

@Controller('member-auth')
export class MemberAuthController {
  constructor(private readonly authService: MemberAuthService) {}

  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Headers('x-forwarded-for') forwarded: string,
    @Headers('x-device-fingerprint') fingerprint: string,
  ) {
    const ip = (forwarded || 'unknown').split(',')[0].trim();
    return this.authService.register(dto, ip, fingerprint || 'unknown');
  }

  @UseGuards(ThrottleGuard)
  @Throttle({ limit: 30, windowSeconds: 60 })
  @Post('login')
  login(@Body() dto: LoginDto, @Headers('x-forwarded-for') forwarded: string) {
    const ip = (forwarded || '').split(',')[0].trim() || undefined;
    return this.authService.login(dto.username, dto.password, ip);
  }

  @UseGuards(MemberAuthGuard)
  @Get('me')
  me(@CurrentMember() member: CurrentMemberPayload) {
    return member;
  }
}