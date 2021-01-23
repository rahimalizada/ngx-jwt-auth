import { Location } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Component, Injectable } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router, Routes } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TestAuthService } from './abstract-auth.service.spec';
import { AbstractJwtInterceptor } from './abstract-jwt.interceptor';
@Component({ template: '<router-outlet></router-outlet>' })
class AppComponent {}

@Component({ template: 'Login' })
class LoginComponent {}

const routes: Routes = [{ path: 'test/auth/login', component: LoginComponent }];

@Injectable({ providedIn: 'root' })
class DataService {
  constructor(private http: HttpClient) {}

  run() {
    return this.http.get<string>('http://localhost/path');
  }
}

@Injectable()
class TestJWTInterceptor<T extends { token: string; refreshToken: string; roles: string[] }> extends AbstractJwtInterceptor<T> {
  constructor(authService: TestAuthService<T>, r: Router) {
    super('Test client ver. 1.2.3', authService, r, '/test/auth/login');
  }
}

let dataService: DataService;
let httpTestingController: HttpTestingController;
let location: Location;

function sharedSetup() {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LoginComponent, AppComponent],
      imports: [RouterTestingModule.withRoutes(routes), HttpClientTestingModule],
      providers: [{ provide: HTTP_INTERCEPTORS, useClass: TestJWTInterceptor, multi: true }],
    });
    dataService = TestBed.inject(DataService);
    httpTestingController = TestBed.inject(HttpTestingController);
    location = TestBed.inject(Location);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem(TestAuthService.storageItemId);
  });
}

describe('AbstractJwtInterceptor without existing token', () => {
  sharedSetup();

  it('should not add an Authorization header', () => {
    dataService.run().subscribe((res) => {});
    const req = httpTestingController.expectOne('http://localhost/path');

    expect(req.request.method).toEqual('GET');
    expect(req.request.headers.has('Authorization')).toEqual(false);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');

    req.flush('ok');
  });
});

describe('AbstractJwtInterceptor with existing expired token', () => {
  beforeEach(() => {
    localStorage.setItem(TestAuthService.storageItemId, JSON.stringify(TestAuthService.expiredAuthResult));
  });
  sharedSetup();

  it('should renew and add an Authorization header', () => {
    dataService.run().subscribe(
      () => {},
      (err) => expect(err.status).toBe(401),
    );

    const req = httpTestingController.expectOne('/api/auth/renew-token');
    expect(req.request.method).toEqual('POST');
    expect(req.request.headers.has('Authorization')).toEqual(false);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req.flush(TestAuthService.validAuthResult);

    const req2 = httpTestingController.expectOne('http://localhost/path');
    expect(req2.request.method).toEqual('GET');
    expect(req2.request.headers.has('Authorization')).toEqual(true);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req2.flush('ok');
  });

  it('should fail renew and stay on home page', fakeAsync(() => {
    dataService.run().subscribe(
      () => {},
      (err) => expect(err.status).toBe(404),
    );

    const req = httpTestingController.expectOne('/api/auth/renew-token');
    expect(req.request.method).toEqual('POST');
    expect(req.request.headers.has('Authorization')).toEqual(false);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req.flush('Error message', { status: 404, statusText: 'Not Found' });

    tick();
    expect(location.path()).toBe('');
  }));

  it('should fail renew and go to login page', fakeAsync(() => {
    dataService.run().subscribe(
      () => {},
      (err) => expect(err.status).toBe(401),
    );

    const req = httpTestingController.expectOne('/api/auth/renew-token');
    expect(req.request.method).toEqual('POST');
    expect(req.request.headers.has('Authorization')).toEqual(false);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req.flush('Error message', { status: 401, statusText: 'Unauthorized' });

    tick();
    expect(location.path()).toBe('/test/auth/login');
  }));

  it('should renew and fail the result with 404', fakeAsync(() => {
    dataService.run().subscribe(
      () => {},
      (err) => expect(err.status).toBe(404),
    );

    const req = httpTestingController.expectOne('/api/auth/renew-token');
    expect(req.request.method).toEqual('POST');
    expect(req.request.headers.has('Authorization')).toEqual(false);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req.flush(TestAuthService.validAuthResult);

    const req2 = httpTestingController.expectOne('http://localhost/path');
    expect(req2.request.method).toEqual('GET');
    expect(req2.request.headers.has('Authorization')).toEqual(true);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req2.flush('Error message', { status: 404, statusText: 'Not Found' });

    tick();
    expect(location.path()).toBe('');
  }));

  it('should renew and fail the result with 401', fakeAsync(() => {
    dataService.run().subscribe(
      () => {},
      (err) => expect(err.status).toBe(401),
    );

    const req = httpTestingController.expectOne('/api/auth/renew-token');
    expect(req.request.method).toEqual('POST');
    expect(req.request.headers.has('Authorization')).toEqual(false);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req.flush(TestAuthService.validAuthResult);

    const req2 = httpTestingController.expectOne('http://localhost/path');
    expect(req2.request.method).toEqual('GET');
    expect(req2.request.headers.has('Authorization')).toEqual(true);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req2.flush('Error message', { status: 401, statusText: 'Unauthorized' });

    tick();
    expect(location.path()).toBe('/test/auth/login');
  }));
});

describe('AbstractJwtInterceptor with existing valid token', () => {
  beforeEach(() => {
    localStorage.setItem(TestAuthService.storageItemId, JSON.stringify(TestAuthService.validAuthResult));
  });
  sharedSetup();

  it('should add an Authorization header without renewal', () => {
    dataService.run().subscribe(() => {});

    httpTestingController.expectNone('/api/auth/renew-token');

    const req = httpTestingController.expectOne('http://localhost/path');
    expect(req.request.method).toEqual('GET');
    expect(req.request.headers.has('Authorization')).toEqual(true);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req.flush('ok');
  });

  it('should not add an Authorization header on 404', () => {
    dataService.run().subscribe(
      () => {},
      (err) => expect(err.status).toBe(404),
    );

    const req = httpTestingController.expectOne('http://localhost/path');
    expect(req.request.method).toEqual('GET');
    expect(req.request.headers.has('Authorization')).toEqual(true);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req.flush('Error message', { status: 404, statusText: 'Not Found' });

    httpTestingController.expectNone('/api/auth/renew-token');
  });

  it('should not add an Authorization header on 401', () => {
    dataService.run().subscribe(
      () => {},
      (err) => expect(err.status).toBe(401),
    );

    const req = httpTestingController.expectOne('http://localhost/path');
    expect(req.request.method).toEqual('GET');
    expect(req.request.headers.has('Authorization')).toEqual(true);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req.flush('Error message', { status: 401, statusText: 'Unauthorized' });

    const req2 = httpTestingController.expectOne('/api/auth/renew-token');
    expect(req2.request.method).toEqual('POST');
    expect(req2.request.headers.has('Authorization')).toEqual(false);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req2.flush(TestAuthService.validAuthResult);

    const req3 = httpTestingController.expectOne('http://localhost/path');
    expect(req3.request.method).toEqual('GET');
    expect(req3.request.headers.has('Authorization')).toEqual(true);
    expect(req.request.headers.has('X-Timestamp')).toEqual(true);
    expect(req.request.headers.get('X-Client-Id')).toEqual('Test client ver. 1.2.3');
    req3.flush('ok');
  });
});
