import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemModule } from '../system/system.module';
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
import { RentalItemService } from './rental-item.service';
import { RentalItemController } from './rental-item.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Studio, TimeSlot, Booking, BookingTimeSlot, RentalItem]), SystemModule],
  controllers: [StudioController, TimeSlotController, BookingController, CalendarController, RentalItemController],
  providers: [StudioService, TimeSlotService, BookingService, BookingLifecycleService, RentalItemService],
  exports: [StudioService],
})
export class RentalModule {}
