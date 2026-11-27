import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { GqlAuthGuard } from './gql-auth.guard';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleOAuthService } from './google-oauth.service';
import { EmailVerificationModule } from '../email-verification/email-verification.module';

@Module({
  imports: [
    EmailVerificationModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: 900 },
      }),
    }),
  ],
  controllers: [GoogleAuthController],
  providers: [AuthService, AuthResolver, GqlAuthGuard, GoogleOAuthService],
  exports: [GqlAuthGuard],
})
export class AuthModule {}
