import * as fs from 'fs';

export default class JsonFileCreator {
  constructor() {

  }

  writeToFile(
    path: string,
    data: any,
    encode: string = 'utf8',
    cb: () => void
  ): void {
    const convertedData = JSON.stringify(data);

    fs.writeFile(path, convertedData, encode, cb);
  }
}
