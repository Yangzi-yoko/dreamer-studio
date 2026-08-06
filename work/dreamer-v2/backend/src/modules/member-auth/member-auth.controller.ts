import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MemberAuthService } from './member-auth.service';
import { MemberAuthGuard } from './member-auth.guard';
import { CurrentMember, CurrentMemberPayload } from './current-member.decorator';

class RegisterDto {
  @Matches(/^1\d{10}$/)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  nickname!: string;
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

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @UseGuards(MemberAuthGuard)
  @Get('me')
  me(@CurrentMember() member: CurrentMemberPayload) {
    return member;
  }
}
