import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Studio } from './entities/studio.entity';
import { StudioService } from './studio.service';
import { StudioController } from './studio.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Studio])],
  controllers: [StudioController],
  providers: [StudioService],
  exports: [StudioService],
})
export class RentalModule {}
