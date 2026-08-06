import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  studioId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^1\d{10}$/)
  customerPhone!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  bookingDate!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  timeSlotIds!: number[];

  @IsOptional()
  @IsString()
  remark?: string;
}
