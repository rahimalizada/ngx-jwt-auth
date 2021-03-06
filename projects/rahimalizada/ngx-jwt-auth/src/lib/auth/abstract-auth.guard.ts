import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AbstractAuthService } from './abstract-auth.service';

export abstract class AbstractAuthGuard<T extends { token: string; refreshToken: string; roles: string[] }>
  implements CanActivate, CanActivateChild {
  constructor(protected authService: AbstractAuthService<T>, protected router: Router, private tokenRenewalfailRedirect: string) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | boolean | UrlTree {
    if (!this.authService.isLoggedIn()) {
      return this.authService.renewToken().pipe(
        map(
          (res) => this.authService.isLoggedIn(),
          () => {
            this.router.navigate([this.tokenRenewalfailRedirect]);
            return false;
          },
        ),
      );
    }

    if (route.data.roles && !this.authService.hasPermissions(route.data.roles)) {
      console.log(`This account does not have required roles '${route.data.roles}' to perform this operation`);
      return false;
    }

    return true;
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | boolean | UrlTree {
    return this.canActivate(childRoute, state);
  }
}
