import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, Observer } from 'rxjs';
import { AbstractAuthGuard } from '../../public-api';
import { TestAuthService } from './abstract-auth.service.spec';

@Injectable({ providedIn: 'root' })
class TestUserGuard<T extends { token: string; refreshToken: string; roles: string[] }> extends AbstractAuthGuard<T> {
  constructor(authService: TestAuthService<T>, r: Router) {
    super(authService, r, 'auth/login');
  }
}

let router: Router;
let routeSnapshot: ActivatedRouteSnapshot;
const routeState: RouterStateSnapshot = null;
let service: jasmine.SpyObj<TestAuthService<any>>;
let guard: TestUserGuard<any>;
let trueObservable: Observable<boolean>;
let falseObservable: Observable<boolean>;
let errorObservable: Observable<boolean>;

function sharedSetup() {
  beforeEach(() => {
    routeSnapshot = jasmine.createSpyObj('ActivatedRouteSnapshot', ['']);
    routeSnapshot.data = {};
    router = jasmine.createSpyObj('Router', ['navigate']);
    service = jasmine.createSpyObj('TestAuthService', ['isLoggedIn', 'renewToken', 'hasPermissions']);
    guard = new TestUserGuard(service, router);
    trueObservable = new Observable((observer: Observer<boolean>) => {
      observer.next(true);
      observer.complete();
    });
    falseObservable = new Observable((observer: Observer<boolean>) => {
      observer.next(false);
      observer.complete();
    });
    errorObservable = new Observable((observer: Observer<boolean>) => {
      observer.error('error');
      observer.complete();
    });

    service.isLoggedIn.and.returnValue(true);
    service.renewToken.and.returnValue(trueObservable);
    service.hasPermissions.and.returnValue(true);
  });
}

describe('AbstractUserGuard', () => {
  sharedSetup();

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow navigation if logged in', () => {
    expect(guard.canActivate(routeSnapshot, routeState)).toBe(true);
    expect(guard.canActivateChild(routeSnapshot, routeState)).toBe(true);
  });

  it('should allow navigation if logged in and proper permissions exists', () => {
    routeSnapshot.data = { roles: ['user'] };
    expect(guard.canActivate(routeSnapshot, routeState)).toBe(true);
  });

  it('should not allow navigation if logged in and permissions are missing', () => {
    service.hasPermissions.and.returnValue(false);
    routeSnapshot.data = { roles: ['user'] };
    expect(guard.canActivate(routeSnapshot, routeState)).toBe(false);
  });

  it('should renew token and return logged in state', () => {
    service.isLoggedIn.and.returnValue(false);
    (guard.canActivate(routeSnapshot, routeState) as Observable<boolean>).subscribe((res) => expect(res).toBe(false));
  });

  it('should renew token and return logged in state', () => {
    service.isLoggedIn.and.returnValue(false);
    service.renewToken.and.returnValue(falseObservable);
    (guard.canActivate(routeSnapshot, routeState) as Observable<boolean>).subscribe((res) => expect(res).toBe(false));
  });

  it('should renew token and return logged in state', () => {
    service.isLoggedIn.and.returnValue(false);
    service.renewToken.and.returnValue(errorObservable);
    (guard.canActivate(routeSnapshot, routeState) as Observable<boolean>).subscribe(
      () => {},
      (err) => {
        console.log(err);
        expect(err).toBe('error');
      },
    );
  });
});
