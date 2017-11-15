import * as _ from 'lodash';
import HourlySnowDepthObservation from '../models/hourly-snow-depth-observation';
import DailySnowDepthObservation from '../models/daily-snow-depth-observation';

let count = 0;

export default class DataManager {
  constructor() {}

  public extractLocationsFromData(data: Array<object>) {
    return [...new Set(data.map((item: any) => item.location))];
  }

  public aggregateDailyValuesForLocation(data: any, location: string) {
    let groupedByDate = _.groupBy(data, 'date');

    // console.log('groupedByDate', groupedByDate);

    return _.map(groupedByDate, (groupedData: Array<HourlySnowDepthObservation>, date: string) => {
      let hourlyObservations = this.mapHourlyObservations(groupedData);
      let hourlyObservationValues: Array<number> = _.map(hourlyObservations, 'snowDepth');
      let accurateHourlyValues = this.getAccurateHourlyObservationData(hourlyObservationValues);
      let average: any = _.mean(accurateHourlyValues);

      // console.log('_.head(hourlyObservations).location', _.head(hourlyObservations).location);

      return {
        timestamp: new Date(date).getTime(),
        date: date,
        location: location,
        elevation: _.head(groupedData).elevation,
        averageSnowDepthForDate: _.toNumber(average.toFixed(2)),
        hourlyObservations: accurateHourlyValues,
      };
    });
  }

  public aggregateDailySnowDepthData(data: Array<object>) {
    const locations = this.extractLocationsFromData(data);

    let arraysOfData: any[] = [];
    let aggregatedData: DailySnowDepthObservation[];
    let groupedByLocation = _.groupBy(data, 'location');

    _.forIn(groupedByLocation, (locationData: Array<object>, location: string) => {
      let dailyDataResult = this.aggregateDailyValuesForLocation(locationData, location);

      // console.log('dailyDataResult', dailyDataResult);

      arraysOfData.push(dailyDataResult);
    });

    return _.flatten(arraysOfData);
  }

  public normalizeData(
    data: Array<HourlySnowDepthObservation>,
    location: string
  ): any {

    let dailyObservationData: DailySnowDepthObservation[];

    // {
    //   timestamp
    //   location
    //   elevation
    //   averageSnowDepthForDate
    //   hourlyObservations: [],
    // }

    let groupedByDate = _.groupBy(data, 'date');

    return _.map(groupedByDate, (groupedData: Array<HourlySnowDepthObservation>, date: string) => {
      let hourlyObservations = this.mapHourlyObservations(groupedData);
      let hourlyObservationValues: Array<number> = _.map(hourlyObservations, 'snowDepth');
      let accurateHourlyValues = this.getAccurateHourlyObservationData(hourlyObservationValues);
      let average: any = _.mean(accurateHourlyValues);

      return {
        timestamp: new Date(date).getTime(),
        date: date,
        location: location,
        elevation: _.head(groupedData).elevation,
        averageSnowDepthForDate: _.toNumber(average.toFixed(2)),
        hourlyObservations: accurateHourlyValues,
      };
    });
  }

  public getAccurateHourlyObservationData(values: Array<number>): Array<number> {
    let potentiallyInaccurateMeanValue = _.mean(values);
    let stdDvtn = this.calculateStandardDeviation(values);

    let allowedMinVal = potentiallyInaccurateMeanValue - stdDvtn;
    let allowedMaxVal = potentiallyInaccurateMeanValue + stdDvtn;

    return _.filter(values, (value: any) => {
      if (value < 0) {
        return false;
      }

      if (value === allowedMinVal) {
        return true;
      }

      if (value === allowedMaxVal) {
        return true;
      }

      return value > allowedMinVal && value < allowedMaxVal;
    });
  }

  public mapHourlyObservations(data: any): Array<object> {
    return _.map(data, (obj: any) => {
      let snowDepth = parseFloat(obj.snowDepth);

      return {
        timestamp: obj.timestamp,
        snowDepth: snowDepth > 0 ? _.toNumber(snowDepth.toFixed(3)) : 0,
        location: obj.location,
      }
    });
  }

  public calculateStandardDeviation(values: Array<number>): number {
    let mean = _.mean(values);
    let varianceValues = _.map(values, (n: number) => {
      let diff = mean - n;
      let variance = (diff * diff);

      return variance;
    });

    let avgVariance = _.mean(varianceValues);

    return Math.sqrt(avgVariance);
  }

  public isDateTimeKey(key: string): boolean {
    return key.indexOf('Date/Time') !== -1;
  }

  public extractElevationFromKey(key: string): string {
    return key.replace(/\D+/g, '');
  }

  public extractLocationNameFromKey(key: string): string {
    return key.replace(/[^a-z]/gi, '');
  }
};
