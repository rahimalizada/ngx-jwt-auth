import { HttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject, Observable, Observer } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as shiro from 'shiro-trie';

export abstract class AbstractAuthService<T extends { token: string; refreshToken: string; roles: string[] }> {
  loggedInSubject = new BehaviorSubject<boolean>(false);
  authDataSubject = new BehaviorSubject<T>(null);
  shiroTrie = shiro.newTrie();

  protected jwtHelper = new JwtHelperService();

  constructor(private storageItemId: string, private http: HttpClient, public apiPath: string) {
    this.authDataSubject.subscribe((authData) => {
      if (authData) {
        this.shiroTrie.reset();
        this.shiroTrie.add(...authData.roles);
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
  saveStorage(authData: T) {
    localStorage.setItem(this.storageItemId, JSON.stringify(authData));
    this.loggedInSubject.next(this.isValid(authData));
    this.authDataSubject.next(authData);
  }

  isLoggedIn() {
    this.loggedInSubject.next(this.isValid(this.authDataSubject.value));
    return this.loggedInSubject.value;
  }

  renewToken() {
    if (!this.authDataSubject.value || !this.authDataSubject.value.refreshToken) {
      this.logout();
      return new Observable((observer: Observer<T>) => {
        observer.next(null);
        observer.complete();
      });
    }
    return this.http
      .post<T>(this.apiPath + '/renew-token', { refreshToken: this.authDataSubject.value.refreshToken })
      .pipe(
        tap(
          (authData) => {
            console.log('Token renewed, expiration date: ' + this.jwtHelper.getTokenExpirationDate(authData.token));
            this.saveStorage(authData);
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
    this.authDataSubject.next(null);
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

  private isValid(authData: T): boolean {
    if (!authData || !authData.token) {
      return false;
    }

    const isTokenExpired = this.isTokenExpired(authData.token);
    const isRefreshTokenExpired = this.isTokenExpired(authData.refreshToken);
    if (isTokenExpired && isRefreshTokenExpired) {
      return false;
    }
    return true;
  }

  private deleteStorage() {
    localStorage.removeItem(this.storageItemId);
  }

  private loadStorage() {
    const authData = JSON.parse(localStorage.getItem(this.storageItemId));
    if (authData) {
      this.loggedInSubject.next(this.isValid(authData));
      this.authDataSubject.next(authData);
    }
  }
}
