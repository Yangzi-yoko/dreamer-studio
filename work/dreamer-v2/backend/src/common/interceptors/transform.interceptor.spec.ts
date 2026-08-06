import { TransformInterceptor } from './transform.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  it('wraps data into { code: 0, message, data }', (done) => {
    const interceptor = new TransformInterceptor();
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ url: '/x' }) }) } as ExecutionContext;
    const handler: CallHandler = { handle: () => of({ id: 1 }) };
    interceptor.intercept(ctx, handler).subscribe((res) => {
      expect(res).toEqual({ code: 0, message: 'ok', data: { id: 1 } });
      done();
    });
  });
});
