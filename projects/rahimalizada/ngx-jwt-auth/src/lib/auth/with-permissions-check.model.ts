import { AbstractAuthService } from './abstract-auth.service';

export class WithPermissionsCheck<T extends { token: string; refreshToken: string; roles: string[] }> {
  constructor(protected authService: AbstractAuthService<T>) {}

  hasPermissions(permissions: string) {
    return this.authService.hasPermissions(permissions);
  }
}
