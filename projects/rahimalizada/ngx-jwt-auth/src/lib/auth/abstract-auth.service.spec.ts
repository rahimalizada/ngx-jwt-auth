import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbstractAuthService } from '../../public-api';

export class Constants {}

@Injectable({ providedIn: 'root' })
export class TestAuthService<T extends { token: string; refreshToken: string; roles: string[] }> extends AbstractAuthService<T> {
  public static readonly storageItemId = 'test-storage';
  public static readonly apiPath = '/api/auth';

  public static readonly validToken =
    // eslint-disable-next-line max-len
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjJ9.dMD3MLuHTiO-Qy9PvOoMchNM4CzFIgI7jKVrRtlqlM0';
  public static readonly expiredToken =
    // eslint-disable-next-line max-len
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';

  public static readonly validAuthResult = { token: TestAuthService.validToken, refreshToken: TestAuthService.validToken, roles: ['*'] };
  public static readonly expiredAuthResult = {
    token: TestAuthService.expiredToken,
    refreshToken: TestAuthService.expiredToken,
    roles: ['read', 'write'],
  };
  public static readonly invalidAuthResult = { token: 'invalid', refreshToken: null, roles: ['-'] };

  constructor(httpClient: HttpClient) {
    super(TestAuthService.storageItemId, httpClient, TestAuthService.apiPath);
  }
}

let service: TestAuthService<any>;
let httpTestingController: HttpTestingController;

function sharedSetup() {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(TestAuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem(TestAuthService.storageItemId);
  });
}

describe('AbstractAuthService', () => {
  sharedSetup();

  it('should be created when state is missing from local storage', () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  it('should submit valid reset password request', () => {
    service.resetPasswordRequest({}).subscribe((res) => {});

    const req = httpTestingController.expectOne('/api/auth/reset-password/request');
    expect(req.request.method).toEqual('POST');
    req.flush(TestAuthService.validAuthResult);
  });

  it('should submit valid reset password confirmation', () => {
    service.resetPasswordConfirmation({}).subscribe((res) => {});

    const req = httpTestingController.expectOne('/api/auth/reset-password/confirmation');
    expect(req.request.method).toEqual('POST');
    req.flush(TestAuthService.validAuthResult);
  });
});

describe('AbstractAuthService with invalid state in local storage', () => {
  beforeEach(() => {
    localStorage.setItem(TestAuthService.storageItemId, JSON.stringify(TestAuthService.invalidAuthResult));
  });
  sharedSetup();

  it('should load invalid state', () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  it('should test roles properly', () => {
    expect(service.hasPermissions('*')).toBe(false);
    expect(service.hasPermissions('read')).toBe(false);
    expect(service.hasPermissions('write')).toBe(false);
    expect(service.hasPermissions('read,write')).toBe(false);
    expect(service.hasPermissions('read, write')).toBe(false);
    expect(service.hasPermissions('read,write,update')).toBe(false);
    expect(service.hasPermissions('read, write, update')).toBe(false);
    expect(service.hasPermissions('-')).toBe(true);
  });
});

describe('AbstractAuthService with expired state in local storage', () => {
  beforeEach(() => {
    localStorage.setItem(TestAuthService.storageItemId, JSON.stringify(TestAuthService.expiredAuthResult));
  });
  sharedSetup();

  it('should load expired state', () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  it('should test roles properly', () => {
    expect(service.hasPermissions('*')).toBe(false);
    expect(service.hasPermissions('read')).toBe(true);
    expect(service.hasPermissions('write')).toBe(true);
    expect(service.hasPermissions('read,write')).toBe(true);
    expect(service.hasPermissions('read, write')).toBe(false);
    expect(service.hasPermissions('read,write,update')).toBe(false);
    expect(service.hasPermissions('read, write, update')).toBe(false);
    expect(service.hasPermissions('-')).toBe(false);
  });
});

describe('AbstractAuthService with valid state in local storage', () => {
  beforeEach(() => {
    localStorage.setItem(TestAuthService.storageItemId, JSON.stringify(TestAuthService.validAuthResult));
  });
  sharedSetup();

  it('should load valid state', () => {
    expect(service.isLoggedIn()).toBe(true);
  });

  it('should delete the state on logout', () => {
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(TestAuthService.storageItemId)).toBeNull();
  });

  it('should test roles properly', () => {
    expect(service.hasPermissions('*')).toBe(true);
    expect(service.hasPermissions('read')).toBe(true);
    expect(service.hasPermissions('write')).toBe(true);
    expect(service.hasPermissions('read,write')).toBe(true);
    expect(service.hasPermissions('read, write')).toBe(true);
    expect(service.hasPermissions('read,write,update')).toBe(true);
    expect(service.hasPermissions('read, write, update')).toBe(true);
    expect(service.hasPermissions('-')).toBe(true);
  });
});

describe('AbstractAuthService login', () => {
  sharedSetup();

  it('should save expired state to local storage', () => {
    service.login({}).subscribe((res) => {
      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(TestAuthService.storageItemId)).not.toBeNull();
    });

    const req = httpTestingController.expectOne('/api/auth/login');
    expect(req.request.method).toEqual('POST');
    req.flush(TestAuthService.expiredAuthResult);
  });

  it('should save invalid state to local storage', () => {
    service.login({}).subscribe((res) => {
      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(TestAuthService.storageItemId)).not.toBeNull();
    });

    const req = httpTestingController.expectOne('/api/auth/login');
    expect(req.request.method).toEqual('POST');
    req.flush(TestAuthService.invalidAuthResult);
  });

  it('should save valid state to local storage', () => {
    service.login({}).subscribe((res) => {
      expect(service.isLoggedIn()).toBe(true);
      expect(localStorage.getItem(TestAuthService.storageItemId)).not.toBeNull();
    });

    const req = httpTestingController.expectOne('/api/auth/login');
    expect(req.request.method).toEqual('POST');
    req.flush(TestAuthService.validAuthResult);
  });

  it('should logout on invalid result', () => {
    service.login({}).subscribe(
      (res) => {},
      (err) => {
        expect(service.isLoggedIn()).toBe(false);
        expect(localStorage.getItem(TestAuthService.storageItemId)).toBeNull();
        expect(err.status).toBe(404);
      },
    );

    const req = httpTestingController.expectOne('/api/auth/login');
    expect(req.request.method).toEqual('POST');
    req.flush('Error message', { status: 404, statusText: 'Not Found' });
  });
});

describe('AbstractAuthService registration', () => {
  sharedSetup();

  it('should save expired state to local storage', () => {
    service.register({}).subscribe((res) => {
      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(TestAuthService.storageItemId)).not.toBeNull();
    });

    const req = httpTestingController.expectOne('/api/auth/register');
    expect(req.request.method).toEqual('POST');
    req.flush(TestAuthService.expiredAuthResult);
  });

  it('should save invalid state to local storage', () => {
    service.register({}).subscribe((res) => {
      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(TestAuthService.storageItemId)).not.toBeNull();
    });

    const req = httpTestingController.expectOne('/api/auth/register');
    expect(req.request.method).toEqual('POST');
    req.flush(TestAuthService.invalidAuthResult);
  });

  it('should save valid state to local storage', () => {
    service.register({}).subscribe((res) => {
      expect(service.isLoggedIn()).toBe(true);
      expect(localStorage.getItem(TestAuthService.storageItemId)).not.toBeNull();
    });

    const req = httpTestingController.expectOne('/api/auth/register');
    expect(req.request.method).toEqual('POST');
    req.flush(TestAuthService.validAuthResult);
  });

  it('should logot on invalid result', () => {
    service.register({}).subscribe(
      () => {},
      (err) => {
        expect(service.isLoggedIn()).toBe(false);
        expect(localStorage.getItem(TestAuthService.storageItemId)).toBeNull();
        expect(err.status).toBe(404);
      },
    );

    const req = httpTestingController.expectOne('/api/auth/register');
    expect(req.request.method).toEqual('POST');
    req.flush('Error message', { status: 404, statusText: 'Not Found' });
  });
});

describe('AbstractAuthService token renewal without state', () => {
  sharedSetup();

  it('should logout', () => {
    service.renewToken().subscribe((res) => {
      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(TestAuthService.storageItemId)).toBeNull();
    });
  });
});

describe('AbstractAuthService token renewal with invalid state', () => {
  beforeEach(() => {
    localStorage.setItem(TestAuthService.storageItemId, JSON.stringify(TestAuthService.invalidAuthResult));
  });
  sharedSetup();

  it('should logout', () => {
    service.renewToken().subscribe((res) => {
      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem(TestAuthService.storageItemId)).toBeNull();
    });
  });
});

describe('AbstractAuthService token renewal with valid state', () => {
  beforeEach(() => {
    localStorage.setItem(TestAuthService.storageItemId, JSON.stringify(TestAuthService.validAuthResult));
  });
  sharedSetup();

  it('should login on valid result', () => {
    service.renewToken().subscribe((res) => {
      expect(service.isLoggedIn()).toBe(true);
      expect(localStorage.getItem(TestAuthService.storageItemId)).not.toBeNull();
    });

    const req = httpTestingController.expectOne('/api/auth/renew-token');
    expect(req.request.method).toEqual('POST');
    req.flush(TestAuthService.validAuthResult);
  });

  it('should logout on http error', () => {
    service.renewToken().subscribe(
      () => {},
      (err) => {
        expect(service.isLoggedIn()).toBe(false);
        expect(localStorage.getItem(TestAuthService.storageItemId)).toBeNull();
        expect(err.status).toBe(404);
      },
    );

    const req = httpTestingController.expectOne('/api/auth/renew-token');
    expect(req.request.method).toEqual('POST');
    req.flush('Error message', { status: 404, statusText: 'Not Found' });
  });
});
