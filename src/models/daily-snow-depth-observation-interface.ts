import HourlySnowDepthObservationInterface from './hourly-snow-depth-observation-interface';

export default interface DailySnowDepthObservationInterface {

  timestamp: number;

  date: string;

  location: string;

  elevation: number;

  averageSnowDepthForDate: number;

  hourlyObservations: HourlySnowDepthObservationInterface[];
}
