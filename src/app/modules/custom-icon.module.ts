import { NgModule } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@NgModule()
export class CustomIconModule {
  constructor(
    private readonly domSanitizer: DomSanitizer,
    private readonly matIconRegistry: MatIconRegistry
  ) {
    this.matIconRegistry.addSvgIcon(
      'dashArray',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        '../../assets/images/dasharray.svg'
      )
    );
  }
}
