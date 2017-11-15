import * as fs from 'fs';
import * as http from 'http';

export default function downloadToFile(url: string, dest: string = './'): Promise<any> {
  var file = fs.createWriteStream(dest);

  return new Promise((resolve: any, reject: any) => {
    http.get(url, (res: http.IncomingMessage) => {
      res.pipe(file);

      file.on('finish', () => {
        file.close();

        resolve(file);
      });
    }).on('error', (err: Error) => {
      console.error('ERROR:', err.message);

      // Delete the file async
      fs.unlink(dest, () => {
        console.log('Error occurred. Deleted and unlinking file.');

        reject(err);
      });
    });
  });
}
