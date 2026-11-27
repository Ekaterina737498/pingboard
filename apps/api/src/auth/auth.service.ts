import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import type { GoogleProfile } from './google-oauth.service';
import { LoginInput } from './login.input';
import { REFRESH_TTL_SECONDS } from './refresh-cookie';
import { RegisterInput } from './register.input';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.user.create({
      data: { email: input.email, passwordHash },
    });
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    // У аккаунта, созданного через Google, пароля нет.
    const passwordOk = user?.passwordHash
      ? await bcrypt.compare(input.password, user.passwordHash)
      : false;

    if (!user || !passwordOk || user.isBlocked) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  async loginWithGoogle({ googleId, email, authoritative }: GoogleProfile) {
    const linked = await this.prisma.user.findUnique({ where: { googleId } });
    if (linked) {
      this.assertNotBlocked(linked);
      return this.issueTokens(linked);
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const created = await this.prisma.user.create({
        data: { email, googleId, emailVerifiedAt: new Date() },
      });
      return this.issueTokens(created);
    }

    this.assertNotBlocked(existing);
    if (!authoritative || existing.googleId) {
      throw new ConflictException('Cannot link this Google account');
    }
    // Если email не подтверждён, пароль мог задать посторонний.
    // Тогда удаляем его, а issueTokens заменяет прежнюю сессию новой.
    const updated = await this.prisma.user.update({
      where: { id: existing.id },
      data: existing.emailVerifiedAt
        ? { googleId }
        : { googleId, passwordHash: null, emailVerifiedAt: new Date() },
    });
    return this.issueTokens(updated);
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.isBlocked || !user.refreshTokenHash) {
      throw new UnauthorizedException();
    }

    if (user.refreshTokenHash !== sha256(refreshToken)) {
      // Старый токен предъявили повторно: считаем сессию скомпрометированной.
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException();
    }
    return this.issueTokens(user);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(
        refreshToken,
        { secret: this.refreshSecret() },
      );
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { refreshTokenHash: null },
      });
    } catch {
      return;
    }
  }

  private assertNotBlocked(user: { isBlocked: boolean }) {
    if (user.isBlocked) {
      throw new UnauthorizedException();
    }
  }

  private refreshSecret() {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private async issueTokens(user: { id: string; role: string }) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: randomUUID() },
      { secret: this.refreshSecret(), expiresIn: REFRESH_TTL_SECONDS },
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: sha256(refreshToken) },
    });
    return { accessToken, refreshToken };
  }
}
