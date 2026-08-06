import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../member/entities/member.entity';
import { MemberAuthService } from './member-auth.service';
import { MemberAuthController } from './member-auth.controller';
import { MemberAuthGuard } from './member-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [MemberAuthController],
  providers: [MemberAuthService, MemberAuthGuard],
  exports: [MemberAuthService],
})
export class MemberAuthModule {}
