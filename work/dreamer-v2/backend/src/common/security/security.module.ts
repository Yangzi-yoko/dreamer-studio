import { Module } from '@nestjs/common';
import { ThrottleGuard } from '../throttle/throttle.guard';
import { LoginThrottleService } from './login-throttle.service';

@Module({
  providers: [LoginThrottleService, ThrottleGuard],
  exports: [LoginThrottleService, ThrottleGuard],
})
export class SecurityModule {}