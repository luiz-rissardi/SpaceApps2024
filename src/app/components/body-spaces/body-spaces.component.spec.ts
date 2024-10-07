import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodySpacesComponent } from './body-spaces.component';

describe('BodySpacesComponent', () => {
  let component: BodySpacesComponent;
  let fixture: ComponentFixture<BodySpacesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BodySpacesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BodySpacesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
