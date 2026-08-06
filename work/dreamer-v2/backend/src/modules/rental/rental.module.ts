import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [TypeOrmModule.forFeature([Studio, TimeSlot, Booking, BookingTimeSlot])],
  controllers: [StudioController, TimeSlotController, BookingController],
  providers: [StudioService, TimeSlotService, BookingService, BookingLifecycleService],
  exports: [StudioService],
})
export class RentalModule {}
