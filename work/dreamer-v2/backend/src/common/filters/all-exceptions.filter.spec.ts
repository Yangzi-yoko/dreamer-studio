import { AllExceptionsFilter } from './all-exceptions.filter';
import { BusinessException } from '../exceptions/business.exception';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
  function buildHost(status: number, body: any): ArgumentsHost {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/api/test' }),
      }),
      getType: () => 'http',
    } as unknown as ArgumentsHost;
  }

  it('formats BusinessException with its code', () => {
    const filter = new AllExceptionsFilter();
    const host = buildHost(200, {});
    filter.catch(new BusinessException('库存不足', 50001), host);
    const json = host.switchToHttp().getResponse().json as jest.Mock;
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 50001, message: '库存不足' }));
  });

  it('formats HttpException with http status', () => {
    const filter = new AllExceptionsFilter();
    const host = buildHost(200, {});
    filter.catch(new HttpException('未授权', HttpStatus.UNAUTHORIZED), host);
    const json = host.switchToHttp().getResponse().json as jest.Mock;
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 401, message: '未授权' }));
  });
});
