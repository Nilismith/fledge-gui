import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormGroupDirective } from '@angular/forms';
import { filter } from 'lodash';
import { CustomValidator } from '../../../../directives/custom-validator';

@Component({
  selector: 'app-list-type-configuration',
  templateUrl: './list-type-configuration.component.html',
  styleUrls: ['./list-type-configuration.component.css']
})
export class ListTypeConfigurationComponent implements OnInit {
  @Input() configuration;
  @Output() formState = new EventEmitter<boolean>();
  form: FormGroup;
  listItemsForm: FormGroup;

  constructor(
    public cdRef: ChangeDetectorRef,
    private rootFormGroup: FormGroupDirective,
    private fb: FormBuilder) {
    this.listItemsForm = this.fb.group({
      listItems: this.fb.array([])
    })
  }

  ngOnInit() {
    this.form = this.rootFormGroup.control;
    let val = this.configuration?.value ? this.configuration.value : this.configuration.default;
    val = JSON.parse(val) as [];
    for (let i = 0; i < val.length; i++) {
      const element = val[i];
      this.initListItem(element);
    }
    this.onValChanges();
  }

  ngAfterViewInit() { }

  get listItems() {
    return this.listItemsForm.get('listItems') as FormArray;
  }

  initListItem(v = '') {
    const listItem = new FormControl(v, [CustomValidator.nospaceValidator]);
    this.listItems.push(listItem);
  }

  addListItem() {
    const controlsLength = this.listItems.length;
    const listSize = +this.configuration?.listSize;
    if (controlsLength > listSize) {
      return;
    }
    this.initListItem();
  }


  removeListItem(index: number) {
    this.listItems.removeAt(index);
  }

  onValChanges(): void {
    this.listItems.valueChanges.subscribe((val) => {
      val = filter(val)
      console.log('main form value', this.listItemsForm);
      this.form.get(this.configuration.key)?.patchValue(JSON.stringify(val))
      this.formState.emit(this.listItems.valid);
    })
  }
}
