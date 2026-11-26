import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { GqlAuthGuard } from './gql-auth.guard';

jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('GqlAuthGuard', () => {
  const jwt = { verifyAsync: jest.fn() };
  const prisma = { user: { findUnique: jest.fn() } };
  const guard = new GqlAuthGuard(
    jwt as unknown as JwtService,
    prisma as unknown as PrismaService,
  );

  const makeRequest = (authorization?: string) => ({
    headers: { authorization },
    user: undefined as unknown,
  });

  const makeContext = (req: ReturnType<typeof makeRequest>) =>
    ({
      getType: () => 'graphql',
      getHandler: () => undefined,
      getClass: () => undefined,
      getArgs: () => [{}, {}, { req }, {}],
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    jwt.verifyAsync.mockResolvedValue({ sub: '1', role: 'ADMIN' });
  });

  it('rejects a request without a token', async () => {
    await expect(guard.canActivate(makeContext(makeRequest()))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an invalid token', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('bad token'));

    await expect(
      guard.canActivate(makeContext(makeRequest('Bearer bad'))),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['blocked', { role: 'USER', isBlocked: true }],
    ['deleted', null],
  ])('rejects a %s user with a valid token', async (_title, user) => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      guard.canActivate(makeContext(makeRequest('Bearer good'))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('takes the role from the database, not from the token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: 'USER',
      isBlocked: false,
    });
    const req = makeRequest('Bearer good');

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.user).toEqual({ sub: '1', role: 'USER' });
  });
});
