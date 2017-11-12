import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as yargs from 'yargs';
import * as moment from 'moment';
import * as _ from 'lodash';
import convertCsvToJson from '../modules/convert-csv-to-json';
import JsonFileCreator from '../modules/csv-to-json-file';
import DataManager from '../modules/data-manager';
import HourlySnowDepthObservationInterface from '../models/hourly-snow-depth-observation-interface';


const dataManager = new DataManager();
const jsonFileCreator = new JsonFileCreator();

const todaysDate = moment();
const todaysFormattedDate = todaysDate.format('YYYY-MM-DD');
const snowDepthUrl = `http://www.nwac.us/data-portal/csv/location/mt-hood/sensortype/snow_depth/start-date/${todaysFormattedDate}/end-date/${todaysFormattedDate}/`;
const temperatureUrl = `http://www.nwac.us/data-portal/csv/location/mt-hood/sensortype/temperature/start-date/${todaysFormattedDate}/end-date/${todaysFormattedDate}/`;
const jsonDest = `/Users/m28099/Sites/projects/project-snow/data/json/nwac/snow-depth`;

export default function download(url: string, dest: string, cb: any): void {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);

    file.on('finish', () => {
      file.close(cb.bind(this, null, file));  // close() is async, call cb after close completes.
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

// download(temperatureUrl, `./data/csv/nwac/temperature/${todaysFormattedDate}.csv`, function () {
//   console.log('Download temperature observations complete.');
// });

const jsonOutputDirectory = `/Users/m28099/Sites/projects/project-snow/data/json/nwac/snow-depth`;

download(snowDepthUrl, `./data/csv/nwac/snow-depth/${todaysFormattedDate}.csv`, (err: Error = null, file: any) => {
  console.log('Download snow depth observations complete.');
  console.log('Converting CSV to JSON...', file.path);

  convertCsvToJson(file.path).then((observationsData) => {
    console.log('Done converting to JSON.', observationsData[0]);

    let meadowsData = _.filter(observationsData, (o: HourlySnowDepthObservationInterface) => {
      return o.location === 'MtHoodMeadowsBase';
    });

    let timberlineData = _.filter(observationsData, (o: HourlySnowDepthObservationInterface) => {
      return o.location === 'TimberlineLodge';
    });

    let skibowlData = _.filter(observationsData, (o: HourlySnowDepthObservationInterface) => {
      return o.location === 'SkiBowlSummit';
    });

    // console.log('meadowsData:', meadowsData);
    console.log('observationsData', observationsData);

    let meadowsDailyObservationData = dataManager.normalizeData(meadowsData, 'MtHoodMeadowsBase');
    let timberlineDailyObservationData = dataManager.normalizeData(timberlineData, 'TimberlineLodge');
    let skiBowlDailyObservationData = dataManager.normalizeData(skibowlData, 'SkiBowlSummit');

    let meadowsFileName = path.resolve(`${jsonDest}/${todaysFormattedDate}-MtHoodMeadowsBase.json`);
    let timberlineFileName = path.resolve(`${jsonDest}/${todaysFormattedDate}-TimberlineLodge.json`);
    let skiBowlFileName = path.resolve(`${jsonDest}/${todaysFormattedDate}-SkiBowlSummit.json`);

    const readyData = {
      meadows: {
        hourlyData: meadowsData,
        dailyData: meadowsDailyObservationData,
        file: meadowsFileName,
      },
      timberline: {
        hourlyData: timberlineData,
        dailyData: timberlineDailyObservationData,
        file: timberlineFileName,
      },
      skiBowl: {
        hourlyData: skibowlData,
        dailyData: skiBowlDailyObservationData,
        file: skiBowlFileName,
      },
    };

    _.forIn(readyData, (item, key) => {
      jsonFileCreator.writeToFile(item.file, item.dailyData, 'utf8', () => {});
    });
  });
});
