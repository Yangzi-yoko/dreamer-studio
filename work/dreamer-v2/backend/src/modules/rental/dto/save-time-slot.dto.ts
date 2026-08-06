import { IsArray, IsBoolean, IsOptional, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeSlotItemDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class SaveTimeSlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotItemDto)
  slots!: TimeSlotItemDto[];
}
