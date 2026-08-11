import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../member/entities/member.entity';
import { MemberModule } from '../member/member.module';
import { MemberAuthService } from './member-auth.service';
import { MemberAuthController } from './member-auth.controller';
import { MemberAuthGuard } from './member-auth.guard';
import { MemberAuthOptionalGuard } from './member-auth-optional.guard';
import { SecurityModule } from '../../common/security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member]),
    MemberModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
    SecurityModule,
  ],
  controllers: [MemberAuthController],
  providers: [MemberAuthService, MemberAuthGuard, MemberAuthOptionalGuard],
  exports: [MemberAuthService, MemberAuthOptionalGuard, JwtModule],
})
export class MemberAuthModule {}