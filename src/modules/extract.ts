import * as _ from 'lodash';
import * as moment from 'moment';

// console.log('JSON Data', jsonData);

// const dataItem = data[0];
// const timestamp = dataItem.timestamp;

// console.log('Date:', moment(timestamp).format('YYYYMMDD'));


interface SnowDepthObservation {
  snowDepth?: number;
}

let data: Array<SnowDepthObservation | undefined> = [];

let currentDate = null;
let currentSnowDepth = 0;

let newArray = _.filter(data, (obj) => {
  return obj.snowDepth >= 0;
});

export default class Extractor {
  constructor() {}

  filterOutNegativeValues(data: Array<SnowDepthObservation>) {
    return _.filter(data, (obj) => {
      return obj.snowDepth >= 0;
    });
  }
}

console.log('Original Data Length: ', data.length);
console.log('New Array Length:     ', newArray.length);
