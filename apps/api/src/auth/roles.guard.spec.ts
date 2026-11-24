import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflectorMock = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflectorMock as unknown as Reflector);

  const makeContext = (user?: { sub: string; role: string }) =>
    ({
      getType: () => 'graphql',
      getHandler: () => undefined,
      getClass: () => undefined,
      getArgs: () => [{}, {}, { req: { user } }, {}],
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.resetAllMocks());

  it('allows access when no roles are required', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows an admin to reach an admin-only handler', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(
      guard.canActivate(makeContext({ sub: '1', role: 'ADMIN' })),
    ).toBe(true);
  });

  it('forbids a regular user from an admin-only handler', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() =>
      guard.canActivate(makeContext({ sub: '2', role: 'USER' })),
    ).toThrow(ForbiddenException);
  });

  it('forbids a request without a user', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(makeContext())).toThrow(
      ForbiddenException,
    );
  });
});