import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { RegisterInput } from './register.input';
import { UserModel } from './user.model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => UserModel)
  register(@Args('input') input: RegisterInput) {
    return this.authService.register(input);
  }
}