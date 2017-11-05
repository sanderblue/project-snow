import * as path from 'path';
import * as csv from 'csvtojson';
import * as prettyjson from 'prettyjson';
import * as moment from 'moment';
import * as _ from 'lodash';

import JsonFileCreator from './modules/csv-to-json-file';
import DataManager from './modules/data-manager';
import HourlySnowDepthObservationInterface from './models/hourly-snow-depth-observation-interface';

const dataManager = new DataManager();
const jsonFileCreator = new JsonFileCreator();

const snowDepth_2014_2015:object = {
  year: '2014_2015',
  file: './data/csv/mt-hood_snow_depth.2014-2015.csv'
};

const snowDepth_2015_2016:object = {
  year: '2015_2016',
  file: './data/csv/mt-hood_snow_depth.2015-2016.csv'
}

const snowDepth_2016_2017:object = {
  year: '2016_2017',
  file: './data/csv/mt-hood_snow_depth.2016-2017.csv'
}

const snowDepth_2017_2018:object = {
  year: '2017_2018',
  file: './data/csv/mt-hood_snow_depth.2017-2018.csv'
}

Promise.all([
  convertCsvToJson(snowDepth_2014_2015),
  convertCsvToJson(snowDepth_2015_2016),
  convertCsvToJson(snowDepth_2016_2017),
  convertCsvToJson(snowDepth_2017_2018),
])
.then(data => {
  console.log('Promises Complete - data:', data);

  data.forEach((dataItem) => {
    _.forIn(dataItem, (item, key) => {
      jsonFileCreator.writeToFile(item.file, item.data, 'utf8', () => {
        console.log('Successfully wrote data to file with name: ', path.basename(item.file));
      });
    });
  });

});

let totalObservationCount = 0;
let adjustedTotalObervationCount = 0;

let count = 0;

function isDateTimeKey(key: string): boolean {
  return key.indexOf('Date/Time') !== -1;
}

function extractElevationFromKey(key: string): string {
  return key.replace(/\D+/g, '');
}

function extractLocationNameFromKey(key: string): string {
  return key.replace(/[^a-z]/gi, '');
}

function convertCsvToJson(fileObj: any) {
  let observationsData: HourlySnowDepthObservationInterface[] = [];

  // let meadowsObservationsData: HourlySnowDepthObservationInterface[] = [];
  // let timberlineObservationsData: HourlySnowDepthObservationInterface[] = [];
  // let skibowlObservationsData: HourlySnowDepthObservationInterface[] = [];

  return new Promise((resolve, reject) => {
    csv()
      .fromFile(fileObj.file)
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

          if (isDateTimeKey(key)) {
            observationDateTime = new Date(value);
            observationTimestamp = observationDateTime.getTime();
          } else {
            elevation = extractElevationFromKey(key);
            location = extractLocationNameFromKey(key);
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
        // console.log('Finished:', observationsData);

        let meadowsData = _.filter(observationsData, (o: HourlySnowDepthObservationInterface) => {
          return o.location === 'MtHoodMeadowsBase';
        });

        let timberlineData = _.filter(observationsData, (o: HourlySnowDepthObservationInterface) => {
          return o.location === 'TimberlineLodge';
        });

        let skibowlData = _.filter(observationsData, (o: HourlySnowDepthObservationInterface) => {
          return o.location === 'SkiBowlSummit';
        });

        let meadowsDailyObservationData = dataManager.normalizeData(meadowsData, 'MtHoodMeadowsBase');
        let timberlineDailyObservationData = dataManager.normalizeData(timberlineData, 'TimberlineLodge');
        let skiBowlDailyObservationData = dataManager.normalizeData(skibowlData, 'SkiBowlSummit');

        let meadowsFileName = path.resolve(`/Users/m28099/Sites/projects/know-your-snow/static/data/mt-hood/meadows/${fileObj.year}.json`);
        let timberlineFileName = path.resolve(`/Users/m28099/Sites/projects/know-your-snow/static/data/mt-hood/timberline/${fileObj.year}.json`);
        let skiBowlFileName = path.resolve(`/Users/m28099/Sites/projects/know-your-snow/static/data/mt-hood/skibowl/${fileObj.year}.json`);

        return resolve({
          meadows: {
            data: meadowsDailyObservationData,
            file: meadowsFileName,
          },
          timberline: {
            data: timberlineDailyObservationData,
            file: timberlineFileName,
          },
          skiBowl: {
            data: skiBowlDailyObservationData,
            file: skiBowlFileName,
          },
        });
      })
    ;
  });
}
