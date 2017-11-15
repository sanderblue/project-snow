import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as yargs from 'yargs';
import * as moment from 'moment';
import * as _ from 'lodash';
import convertCsvToJson from '../modules/convert-csv-to-json';
import JsonFileCreator from '../modules/csv-to-json-file';
import DataManager from '../modules/data-manager';
import DataUploader from '../modules/data-uploader';
import HourlySnowDepthObservation from '../models/hourly-snow-depth-observation';
import DailySnowDepthObservation from '../models/daily-snow-depth-observation';
import downloadToFile from '../modules/download-to-file';
import config from '../../config/config';

const jsonFileCreator = new JsonFileCreator();
const dataManager = new DataManager();
const dataUploader = new DataUploader();

const todaysDate = moment();
const todaysFormattedDate = todaysDate.format('YYYY-MM-DD');
const startDate = yargs.argv.startDate || todaysFormattedDate;
const endDate = yargs.argv.endDate || todaysFormattedDate;

// NEW, but need to adjust the script to handle mountain/location names dynamically
const snowDepthUrls = [
  `http://www.nwac.us/data-portal/csv/location/mt-hood/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`,
  `http://www.nwac.us/data-portal/csv/location/mt-baker-ski-area/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`,
  `http://www.nwac.us/data-portal/csv/location/stevens-pass/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`,
  `http://www.nwac.us/data-portal/csv/location/snoqualmie-pass/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`,
  `http://www.nwac.us/data-portal/csv/location/crystal/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`,
  `http://www.nwac.us/data-portal/csv/location/mt-rainier/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`,
  `http://www.nwac.us/data-portal/csv/location/chinook-pass/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`,
  `http://www.nwac.us/data-portal/csv/location/white-pass-ski-area/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`,
];

function getFirstWordAfterString(testString: string, lookup: string) {
  let regex = new RegExp(lookup + /([\w\-]+)/);
  let result = testString.match(regex);

  return result ? result[1] : null;
}

const snowDepthUrl = `http://www.nwac.us/data-portal/csv/location/mt-hood/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`;
const temperatureUrl = `http://www.nwac.us/data-portal/csv/location/mt-hood/sensortype/temperature/start-date/${startDate}/end-date/${endDate}/`;
const jsonDest = `/Users/m28099/Sites/projects/project-snow/data/json/nwac/snow-depth`;
const fileDest = `/Users/m28099/Sites/projects/know-your-snow/static/data/all`;

downloadToFile(snowDepthUrl, `./data/csv/nwac/snow-depth/${todaysFormattedDate}.csv`)
  .then((file: fs.WriteStream) => {
    console.log('Download snow depth observations complete.');

    convertCsvToJson(file.path).then(aggregateData);
  })
  .catch((err: Error) => {
    console.error('Caught error:', err.message);
  }
);

function aggregateData(data: any) {
  const hourlyCollection = 'hourly_snow_depth_observations';
  const dailyCollection = 'daily_snow_depth_observations';
  const hourlyData = data;
  const dailyData = dataManager.aggregateDailySnowDepthData(data);

  Promise.all([
    jsonFileCreator.writeToFile(`${fileDest}/${dailyCollection}.json`, dailyData, 'utf8', () => {}),
    jsonFileCreator.writeToFile(`${fileDest}/${hourlyCollection}.json`, hourlyData, 'utf8', () => {})
  ]).then(() => {
    console.log('Done writing aggregated data to files.');

    dataUploader.uploadMultiple(config.db.connectionUrl, [
      {
        collection: 'hourly_snow_depth_observations',
        data: hourlyData
      },
      {
        collection: 'daily_snow_depth_observations',
        data: dailyData
      }
    ]).then((results) => {
      console.log('Successfully add data to database.');
    }).catch((err: Error) => {
      throw err;
    });
  }).catch((err: Error) => {
    throw err;
  });;
}

// let promises = [];

// for (let i = 0; i < snowDepthUrls.length; i++) {
//   let location = getFirstWordAfterString(snowDepthUrls[i], 'location');
//   let measurementType = getFirstWordAfterString(snowDepthUrls[i], 'sensortype');
//   let downloadDestination = `./data/csv/nwac/${measurementType}/${location}-${startDate}_${endDate}.csv`;

//   console.log('Download destination:', downloadDestination);

//   let dlPromise = download(snowDepthUrls[i], downloadDestination, (err: Error = null, file: any) => {
//     if (err) {
//       return console.error('ERROR', err.message);
//     }

//     console.log('Success:', file.path);
//   });

//   promises.push(dlPromise);
// }

// Promise.all(promises).then(() => {
//   console.log('ALL DONE DOWNLOADING.');
// });
