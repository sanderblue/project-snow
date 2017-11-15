import * as fs from 'fs';

export default class JsonFileCreator {
  constructor() {

  }

  public async writeToFile(
    path: string,
    data: any,
    encode: string = 'utf8',
    cb: () => void
  ): Promise<any> {
    const convertedData = JSON.stringify(data);

    return await fs.writeFile(path, convertedData, encode, cb);
  }
}
