import { TestBed } from '@angular/core/testing';

import { NgxJwtAuthService } from './ngx-jwt-auth.service';

describe('NgxJwtAuthService', () => {
  let service: NgxJwtAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgxJwtAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
