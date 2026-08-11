import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemModule } from '../system/system.module';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { SecurityModule } from '../../common/security/security.module';
import { Studio } from './entities/studio.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { Booking } from './entities/booking.entity';
import { BookingTimeSlot } from './entities/booking-time-slot.entity';
import { StudioService } from './studio.service';
import { StudioController } from './studio.controller';
import { TimeSlotService } from './time-slot.service';
import { TimeSlotController } from './time-slot.controller';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingLifecycleService } from './booking-lifecycle.service';
import { CalendarController } from './calendar.controller';
import { RentalItem } from './entities/rental-item.entity';
import { ItemRental } from './entities/item-rental.entity';
import { RentalItemService } from './rental-item.service';
import { RentalItemController } from './rental-item.controller';
import { ItemRentalService } from './item-rental.service';
import { ItemRentalController } from './item-rental.controller';
import { ItemRentalLifecycleService } from './item-rental-lifecycle.service';
import { MemberWallet } from '../member/entities/member-wallet.entity';
import { WalletLog } from '../member/entities/wallet-log.entity';
import { UserPackage } from '../member/entities/user-package.entity';
import { PackageUsage } from '../member/entities/package-usage.entity';
import { Coupon } from '../member/entities/coupon.entity';
import { UserCoupon } from '../member/entities/user-coupon.entity';
import { CouponUsage } from '../member/entities/coupon-usage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Studio, TimeSlot, Booking, BookingTimeSlot, RentalItem, ItemRental, MemberWallet, WalletLog, UserPackage, PackageUsage, Coupon, UserCoupon, CouponUsage]), SystemModule, MemberAuthModule, SecurityModule],
  controllers: [StudioController, TimeSlotController, BookingController, CalendarController, RentalItemController, ItemRentalController],
  providers: [StudioService, TimeSlotService, BookingService, BookingLifecycleService, RentalItemService, ItemRentalService, ItemRentalLifecycleService],
  exports: [StudioService],
})
export class RentalModule {}