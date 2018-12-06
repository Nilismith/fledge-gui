import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { assign, cloneDeep, reduce } from 'lodash';
import { NgProgress } from 'ngx-progressbar';

import { AlertService, PluginsService } from '../../../../services';
import { ViewFilterConfigComponent } from '../view-filter-config/view-filter-config.component';

@Component({
  selector: 'app-add-filter-wizard',
  templateUrl: './add-filter-wizard.component.html',
  styleUrls: ['./add-filter-wizard.component.css']
})
export class AddFilterWizardComponent implements OnInit {

  public plugins = [];
  public configurationData;
  public useProxy;
  public isValidPlugin = true;
  public isSinglePlugin = true;
  public isValidName = true;
  public payload: any;

  serviceForm = new FormGroup({
    name: new FormControl(),
    plugin: new FormControl()
  });

  @Output() notify: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild(ViewFilterConfigComponent) viewFilterConfig: ViewFilterConfigComponent;

  constructor(private formBuilder: FormBuilder,
    private pluginService: PluginsService,
    private alertService: AlertService,
    private ngProgress: NgProgress) { }

  ngOnInit() {
    this.serviceForm = this.formBuilder.group({
      name: ['', Validators.required],
      plugin: ['', Validators.required]
    });
    this.getInstalledFilterPlugins();
  }

  movePrevious() {
    const last = <HTMLElement>document.getElementsByClassName('step-item is-active')[0];
    const id = last.getAttribute('id');
    if (+id === 1) {
      this.notify.emit();
      return;
    }
    last.classList.remove('is-active');
    const sId = +id - 1;
    const previous = <HTMLElement>document.getElementById('' + sId);
    previous.setAttribute('class', 'step-item is-active');

    const stepContent = <HTMLElement>document.getElementById('c-' + id);
    if (stepContent != null) {
      stepContent.classList.remove('is-active');
    }

    const nextContent = <HTMLElement>document.getElementById('c-' + sId);
    if (nextContent != null) {
      nextContent.setAttribute('class', 'box step-content is-active');
    }

    const nxtButton = <HTMLButtonElement>document.getElementById('next');
    switch (+id) {
      case 2:
        nxtButton.textContent = 'Next';
        nxtButton.disabled = false;
        break;
      default:
        break;
    }
  }

  moveNext() {
    this.isValidPlugin = true;
    this.isValidName = true;
    const formValues = this.serviceForm.value;
    const first = <HTMLElement>document.getElementsByClassName('step-item is-active')[0];
    const id = first.getAttribute('id');
    const nxtButton = <HTMLButtonElement>document.getElementById('next');
    const previousButton = <HTMLButtonElement>document.getElementById('previous');
    switch (+id) {
      case 1:
        if (formValues['plugin'] === '') {
          this.isValidPlugin = false;
          return;
        }

        if (formValues['plugin'].length > 1) {
          this.isSinglePlugin = false;
          return;
        }

        if (formValues['name'].trim() === '') {
          this.isValidName = false;
          return;
        }
        nxtButton.textContent = 'Next';
        previousButton.textContent = 'Previous';

        // create payload
        if (formValues['name'].trim() !== '' && formValues['plugin'].length > 0) {
          this.payload = {
            name: formValues['name'],
            plugin: formValues['plugin'][0]
          };
        }
        this.getConfiguration();
        nxtButton.textContent = 'Done';
        previousButton.textContent = 'Previous';
        break;
      case 2:
        this.viewFilterConfig.callFromWizard();
        document.getElementById('vci-proxy').click();
        if (this.viewFilterConfig !== undefined && !this.viewFilterConfig.isValidForm) {
          return false;
        }
        this.addFilter(this.payload);
        break;
      default:
        break;
    }

    if (+id >= 2) {
      return false;
    }

    first.classList.remove('is-active');
    first.classList.add('is-completed');
    const sId = +id + 1;
    const next = <HTMLElement>document.getElementById('' + sId);
    if (next != null) {
      next.setAttribute('class', 'step-item is-active');
    }

    const stepContent = <HTMLElement>document.getElementById('c-' + id);
    if (stepContent != null) {
      stepContent.classList.remove('is-active');
    }

    const nextContent = <HTMLElement>document.getElementById('c-' + sId);
    if (nextContent != null) {
      nextContent.setAttribute('class', 'box step-content is-active');
    }
  }

  /**
   *  Get default configuration of a selected plugin
   */
  private getConfiguration(): void {
    const config = this.plugins.map(p => {
      if (p.name === this.payload.plugin) {
        return p.config;
      }
    }).filter(value => value !== undefined);

    // array to hold data to display on configuration page
    this.configurationData = config[0];
    this.useProxy = 'true';
  }

  /**
   * Get edited configuration from view filter config child page
   * @param changedConfig changed configuration of a selected plugin
   */
  getChangedConfig(changedConfig) {
    // make a copy of matched config items having changed values
    const matchedConfig = this.configurationData.value.filter(e1 => {
      return changedConfig.some(e2 => {
        return e1.key === e2.key;
      });
    });

    // make a deep clone copy of matchedConfig array to remove extra keys(not required in payload)
    const matchedConfigCopy = cloneDeep(matchedConfig);
    /**
     * merge new configuration with old configuration,
     * where value key hold changed data in config object
    */
    matchedConfigCopy.forEach(e => {
      changedConfig.forEach(c => {
        if (e.key === c.key) {
          e.value = c.value.toString();
        }
      });
    });

    // final array to hold changed configuration
    let finalConfig = [];
    matchedConfigCopy.forEach(item => {
      finalConfig.push({
        [item.key]: item.type === 'JSON' ? { value: JSON.parse(item.value) } : { value: item.value }
      });
    });

    // convert finalConfig array in object of objects to pass in add service
    finalConfig = reduce(finalConfig, function (memo, current) { return assign(memo, current); }, {});
    this.payload.config = finalConfig;
  }

  /**
   * Method to add service
   * @param payload  to pass in request
   * @param nxtButton button to go next
   * @param previousButton button to go previous
   */
  public addFilter(payload) {
    this.pluginService.saveFilter(payload)
      .subscribe(
        (data: any) => {
          this.alertService.success(data.filter + ' filter added successfully.', true);
          this.notify.emit(data);
        },
        (error) => {
          if (error.status === 0) {
            console.log('service down ', error);
          } else {
            this.alertService.error(error.statusText);
          }
        });
  }

  validateServiceName(event) {
    if (event.target.value.trim().length > 0) {
      this.isValidName = true;
    }
  }

  public getInstalledFilterPlugins() {
    /** request started */
    // this.ngProgress.start();
    this.pluginService.getInstalledFilterPlugins().subscribe(
      (data: any) => {
        /** request completed */
        // this.ngProgress.done();
        this.plugins = data.plugins;
      },
      (error) => {
        /** request completed */
        // this.ngProgress.done();
        if (error.status === 0) {
          console.log('service down ', error);
        } else {
          this.alertService.error(error.statusText);
        }
      });
  }
}
