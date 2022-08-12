import express from 'express';
import { fileURLToPath, URL } from 'url';

const app = express();
const port = 3000;

/**
 * @param {string} dir
 * @return
 */
const resolve = (dir) => {
  return express.static(fileURLToPath(new URL(dir, import.meta.url)));
};

app.use('/', resolve('../public'));
app.use('/lib', resolve('../lib'));
app.use('/src', resolve('../src'));
app.listen(port, () => console.log(`Listening on port ${port}`));
