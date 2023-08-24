import { cloneDeep } from 'lodash';

export abstract class ChangeDetector<T> {
  private readonly dataBackup: T;

  public readonly data: T;

  constructor(data: T) {
    this.dataBackup = cloneDeep((this.data = cloneDeep(data)));
  }

  protected abstract isEqual(dataA: T, dataB: T): boolean;

  public hasChanges(): boolean {
    return !this.isEqual(this.dataBackup, this.data);
  }
}
