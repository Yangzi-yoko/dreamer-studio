import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemModule } from '../system/system.module';
import { Member } from './entities/member.entity';
import { MemberLevel } from './entities/member-level.entity';
import { MemberTag } from './entities/member-tag.entity';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { MemberLevelService } from './member-level.service';
import { MemberLevelController } from './member-level.controller';
import { MemberTagService } from './member-tag.service';
import { MemberTagController } from './member-tag.controller';
import { MemberPoints } from './entities/member-points.entity';
import { PointsLog } from './entities/points-log.entity';
import { MemberPointsService } from './member-points.service';
import { MemberPointsController } from './member-points.controller';
import { MemberWallet } from './entities/member-wallet.entity';
import { WalletLog } from './entities/wallet-log.entity';
import { MemberWalletService } from './member-wallet.service';
import { MemberWalletController } from './member-wallet.controller';
import { PackageCard } from './entities/package-card.entity';
import { UserPackage } from './entities/user-package.entity';
import { PackageUsage } from './entities/package-usage.entity';
import { MemberPackageService } from './member-package.service';
import { MemberPackageController } from './member-package.controller';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { MemberCouponService } from './member-coupon.service';
import { MemberCouponController } from './member-coupon.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Member, MemberLevel, MemberTag, MemberPoints, PointsLog, MemberWallet, WalletLog, PackageCard, UserPackage, PackageUsage, Coupon, UserCoupon, CouponUsage]), SystemModule],
  controllers: [MemberController, MemberLevelController, MemberTagController, MemberPointsController, MemberWalletController, MemberPackageController, MemberCouponController],
  providers: [MemberService, MemberLevelService, MemberTagService, MemberPointsService, MemberWalletService, MemberPackageService, MemberCouponService],
  exports: [MemberService],
})
export class MemberModule {}
