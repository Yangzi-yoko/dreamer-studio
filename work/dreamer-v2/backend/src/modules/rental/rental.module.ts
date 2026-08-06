import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Studio } from './entities/studio.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { StudioService } from './studio.service';
import { StudioController } from './studio.controller';
import { TimeSlotService } from './time-slot.service';
import { TimeSlotController } from './time-slot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Studio, TimeSlot])],
  controllers: [StudioController, TimeSlotController],
  providers: [StudioService, TimeSlotService],
  exports: [StudioService],
})
export class RentalModule {}
