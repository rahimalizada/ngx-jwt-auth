import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxJwtAuthComponent } from './ngx-jwt-auth.component';

describe('NgxJwtAuthComponent', () => {
  let component: NgxJwtAuthComponent;
  let fixture: ComponentFixture<NgxJwtAuthComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxJwtAuthComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxJwtAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
