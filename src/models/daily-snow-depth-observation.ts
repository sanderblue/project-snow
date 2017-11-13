import HourlySnowDepthObservation from './hourly-snow-depth-observation';

export default class DailySnowDepthObservation {

  timestamp: number;

  date: string;

  location: string;

  elevation: number;

  averageSnowDepthForDate: number;

  hourlyObservations: HourlySnowDepthObservation[];

  constructor(
    timestamp: number,
    date: string,
    location: string,
    elevation: number
  ) {

  }
}
