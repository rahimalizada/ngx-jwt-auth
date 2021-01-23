import { HttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject, Observable, Observer } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as shiro from 'shiro-trie';

export abstract class AbstractAuthService<T extends { token: string; refreshToken: string; roles: string[] }> {
  loggedInSubject = new BehaviorSubject<boolean>(false);
  authResultSubject = new BehaviorSubject<T | null>(null);
  shiroTrie = shiro.newTrie();

  protected jwtHelper = new JwtHelperService();

  constructor(private storageItemId: string, private http: HttpClient, public apiPath: string) {
    this.authResultSubject.subscribe((authResult) => {
      if (authResult) {
        this.shiroTrie.reset();
        this.shiroTrie.add(...authResult.roles);
      }
    });

    this.loadStorage();
  }

  isTokenExpired(token: string) {
    try {
      const expired = this.jwtHelper.isTokenExpired(token);
      if (expired) {
        // console.log('Token expired: ' + this.jwtHelper.getTokenExpirationDate(token));
        return true;
      }
    } catch (error) {
      // console.log(error);
      return true;
    }
    return false;
  }
  saveStorage(authResult: T) {
    localStorage.setItem(this.storageItemId, JSON.stringify(authResult));
    this.loggedInSubject.next(this.isValid(authResult));
    this.authResultSubject.next(authResult);
  }

  isLoggedIn() {
    this.loggedInSubject.next(this.isValid(this.authResultSubject.value));
    return this.loggedInSubject.value;
  }

  renewToken() {
    if (!this.authResultSubject.value || !this.authResultSubject.value.refreshToken) {
      this.logout();
      return new Observable((observer: Observer<T | null>) => {
        observer.next(null);
        observer.complete();
      });
    }
    return this.http
      .post<T>(this.apiPath + '/renew-token', { refreshToken: this.authResultSubject.value.refreshToken })
      .pipe(
        tap(
          (authResult) => {
            console.log('Token renewed, expiration date: ' + this.jwtHelper.getTokenExpirationDate(authResult.token));
            this.saveStorage(authResult);
          },
          (error) => {
            console.log('Token renewal failed');
            this.logout();
          },
        ),
      );
  }

  logout() {
    this.deleteStorage();
    this.loggedInSubject.next(false);
    this.authResultSubject.next(null);
  }

  register(data: any) {
    return this.http.post<T>(this.apiPath + '/register', data).pipe(
      tap(
        (result) => this.saveStorage(result),
        (error) => this.logout(),
      ),
    );
  }

  login(data: any) {
    return this.http.post<T>(this.apiPath + '/login', data).pipe(
      tap(
        (result) => this.saveStorage(result),
        (error) => this.logout(),
      ),
    );
  }

  resetPasswordRequest(data: any) {
    return this.http.post<void>(this.apiPath + '/reset-password/request', data);
  }

  resetPasswordConfirmation(data: any) {
    return this.http.post<void>(this.apiPath + '/reset-password/confirmation', data);
  }

  // Comma separated
  hasPermissions(requiredPermissions: string) {
    return this.shiroTrie.check(requiredPermissions);
  }

  private isValid(authResult: T | null): boolean {
    if (!authResult || !authResult.token) {
      return false;
    }

    const isTokenExpired = this.isTokenExpired(authResult.token);
    const isRefreshTokenExpired = this.isTokenExpired(authResult.refreshToken);
    if (isTokenExpired && isRefreshTokenExpired) {
      return false;
    }
    return true;
  }

  private deleteStorage() {
    localStorage.removeItem(this.storageItemId);
  }

  private loadStorage() {
    const storageItem = localStorage.getItem(this.storageItemId);
    if (storageItem === null) {
      return;
    }
    const authResult = JSON.parse(storageItem);
    if (authResult) {
      this.loggedInSubject.next(this.isValid(authResult));
      this.authResultSubject.next(authResult);
    }
  }
}
