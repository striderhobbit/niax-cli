import { Directive } from '@angular/core';
import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from '@angular/forms';

@Directive({
  selector: '[validRegExp]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: RegExpValidatorDirective,
      multi: true,
    },
  ],
})
export class RegExpValidatorDirective implements Validator {
  validate(control: AbstractControl<any, any>): ValidationErrors | null {
    try {
      new RegExp(control.value?.toString());
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          [error.name]: error.message,
        };
      }

      throw error;
    }

    return null;
  }
}
