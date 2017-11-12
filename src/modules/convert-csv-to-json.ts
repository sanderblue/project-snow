import * as moment from 'moment';
import * as csv from 'csvtojson';
import * as _ from 'lodash';
import * as path from 'path';
import DataManager from './data-manager';
import HourlySnowDepthObservationInterface from '../models/hourly-snow-depth-observation-interface';

const dataManager = new DataManager();

export default function convertCsvToJson(file: any, dest: string = 'data') {
  let observationsData: HourlySnowDepthObservationInterface[] = [];

  console.log(`Converting file ${file} to JSON with destination ${dest}.`);

  return new Promise((resolve, reject) => {
    csv()
      .fromFile(file)
      .on('json', (data: any) => {
        // {
        //   'Date/Time (PST)':                   '2015-06-01 22:00',
        //   '" - 5010 - Ski Bowl Summit\'':      '5.878',
        //   '" - 5380 - Mt Hood Meadows Base\'': '5.981',
        //   '" - 5880 - Timberline Lodge\'':     '0.682'
        // }

        let observationDateTime: Date;
        let observationTimestamp: number;

        _.forIn(data, (value, key) => {
          let elevation: string;
          let location: string;
          let snowDepth: string;

          if (dataManager.isDateTimeKey(key)) {
            observationDateTime = new Date(value);
            observationTimestamp = observationDateTime.getTime();
          } else {
            elevation = dataManager.extractElevationFromKey(key);
            location = dataManager.extractLocationNameFromKey(key);
            snowDepth = value;

            observationsData.push({
              timestamp: observationTimestamp,
              date: moment(observationDateTime).format('YYYY-MM-DD'),
              location: location,
              elevation: _.toNumber(elevation),
              snowDepth: _.toNumber(value),
            });
          }
        });
      })
      .on('done', (error: any) => {
        return resolve(observationsData);
      });
  });
}
