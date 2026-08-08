import { ArrayNotEmpty, IsArray, IsInt, IsOptional, Matches } from 'class-validator';

export class PreviewBookingDto {
  @IsInt()
  studioId!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  bookingDate!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  timeSlotIds!: number[];

  @IsOptional()
  @IsInt()
  memberId?: number;

  @IsOptional()
  @IsInt()
  userCouponId?: number;
}
