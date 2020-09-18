import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AbstractAuthService } from './abstract-auth.service';

export abstract class AbstractJwtInterceptor<T extends { token: string; refreshToken: string; roles: string[] }>
  implements HttpInterceptor {
  constructor(
    private clientId: string,
    private authService: AbstractAuthService<T>,
    private router: Router,
    private tokenRenewalfailRedirect: string,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.authDataSubject.value ? this.authService.authDataSubject.value.token : null;
    const tokenExpired = token ? this.authService.isTokenExpired(token) : true;
    const isAuthPath = req.url.search(this.authService.apiPath) === 0; // starts with /auth/...

    const withHeaders = this.addHeaders(req);

    if (isAuthPath) {
      return next.handle(withHeaders);
    } else if (token && tokenExpired) {
      //
      console.log('Token has expired, renewing the token and trying again');
      return this.tryWithRenewedToken(withHeaders, next);
    } else if (token) {
      //
      return next.handle(this.addToken(withHeaders)).pipe(
        catchError((error: any) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            console.log('Request failed with 401 status code, renewing the token and trying again');
            return this.tryWithRenewedToken(withHeaders, next);
          } else {
            return throwError(error);
          }
        }),
      );
    }

    return next.handle(withHeaders);
  }

  tryWithRenewedToken(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.authService.renewToken().pipe(
      switchMap((authData) => {
        console.log('Retrying request with renewed token');
        return next.handle(this.addToken(req)).pipe(
          catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
              console.log('Request retry with renewed token failed with 401 status code, logging out');
            }
            return throwError(error);
          }),
        );
      }),
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          console.log('Token renewal failed with 401 status code, logging out');
          // If there is an exception calling 'renewToken', No need to logout though, renewToken pipe did that already
          // this.authService.logout();
          this.router.navigate([this.tokenRenewalfailRedirect]);
        }
        return throwError(error);
      }),
    );
  }

  private addToken(req: HttpRequest<any>): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${this.authService.authDataSubject.value.token}`,
      },
    });
  }

  addHeaders(req: HttpRequest<any>): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        'X-Client-Id': this.clientId,
        'X-Timestamp': new Date().toISOString(),
      },
    });
  }
}
