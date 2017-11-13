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

const jsonFileCreator = new JsonFileCreator();
const dataManager = new DataManager();
const dataUploader = new DataUploader();

const todaysDate = moment();
const todaysFormattedDate = todaysDate.format('YYYY-MM-DD');
const startDate = yargs.argv.startDate || todaysFormattedDate;
const endDate = yargs.argv.endDate || todaysFormattedDate;
const snowDepthUrl = `http://www.nwac.us/data-portal/csv/location/mt-hood/sensortype/snow_depth/start-date/${startDate}/end-date/${endDate}/`;
const temperatureUrl = `http://www.nwac.us/data-portal/csv/location/mt-hood/sensortype/temperature/start-date/${startDate}/end-date/${endDate}/`;
const jsonDest = `/Users/m28099/Sites/projects/project-snow/data/json/nwac/snow-depth`;
const fileDest = `/Users/m28099/Sites/projects/know-your-snow/static/data/all`;

export default function download(url: string, dest: string, cb: any): void {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);

    file.on('finish', () => {
      file.close();  // close() is async, call cb after close completes.

      cb.call(this, null, file);
    });
  }).on('error', (err: Error) => { // Handle errors
    fs.unlink(dest, () => {
      console.error(err);
      console.log('Error occurred. Deleted and unlinked file.');
    }); // Delete the file async. (But we don't check the result)

    if (cb) {
      cb.call(this, err, file);
    }
  });
};

const jsonOutputDirectory = `/Users/m28099/Sites/projects/project-snow/data/json/nwac/snow-depth`;

download(snowDepthUrl, `./data/csv/nwac/snow-depth/${todaysFormattedDate}.csv`, (err: Error = null, file: any) => {
  console.log('Download snow depth observations complete.');
  console.log('Converting CSV to JSON...', file.path);

  convertCsvToJson(file.path).then((data) => {
    // console.log('Done converting to JSON.', data);

    // let dailyData = dataManager.aggregateDailySnowDepthData(data);

    let meadowsData = _.filter(data, (o: HourlySnowDepthObservation) => {
      return o.location === 'MtHoodMeadowsBase';
    });

    let timberlineData = _.filter(data, (o: HourlySnowDepthObservation) => {
      return o.location === 'TimberlineLodge';
    });

    let skibowlData = _.filter(data, (o: HourlySnowDepthObservation) => {
      return o.location === 'SkiBowlSummit';
    });

    let meadowsDailyObservationData = dataManager.normalizeData(meadowsData, 'MtHoodMeadowsBase');
    let timberlineDailyObservationData = dataManager.normalizeData(timberlineData, 'TimberlineLodge');
    let skiBowlDailyObservationData = dataManager.normalizeData(skibowlData, 'SkiBowlSummit');

    // console.log('Done aggregating date - DAILY:', dailyData);

    const mongoConnectionUrl = 'mongodb://sblue:ibmchinccd@sanderblue.com:27017,sanderblue.com:27017/snow';
    const hourlyCollection = 'hourly_snow_depth_observations';
    const dailyCollection = 'daily_snow_depth_observations';

    // dataUploader.upload(mongoConnectionUrl, hourlyCollection, data).then(() => {
    //   console.log('Successfully uploaded HOURLY data to the database.');
    // });

    const dailyDataArray = _.concat(
      meadowsDailyObservationData,
      timberlineDailyObservationData,
      skiBowlDailyObservationData
    );

    // console.log('meadowsDailyObservationData', meadowsDailyObservationData.length);
    // console.log('timberlineDailyObservationData', timberlineDailyObservationData.length);
    // console.log('skiBowlDailyObservationData', skiBowlDailyObservationData.length);
    // console.log('dailyDataArray', dailyDataArray[0], dailyDataArray.length);

    dataUploader.uploadMultiple(mongoConnectionUrl, [
      {
        collection: 'hourly_snow_depth_observations',
        data: data
      },
      {
        collection: 'daily_snow_depth_observations',
        data: dailyDataArray
      }
    ]).then((results) => {
      console.log('SUCCESS!', results);

      for (let i = 0; i < results.length; i++) {
         jsonFileCreator.writeToFile(`${fileDest}/${results[i].collection}.json`, results[i].data, 'utf8', () => {});
      }
    });

    // dataUploader.upload(mongoConnectionUrl, dailyCollection, dailyDataArray).then(() => {
    //   console.log('Successfully uploaded DAILY data to the database.', dailyDataArray.length);

    //   jsonFileCreator.writeToFile(`${fileDest}/daily_snow_depth_observations.json`, dailyDataArray, 'utf8', () => {});
    // });

    console.log('');
  });
});
