/* eslint-disable no-undef */
const assert = require('assert');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios').default;

const controller = () => {
  const router = express.Router();

  router.get('/test', (req, res) => {
    res.json({ message: 'surprise motherfucker!!!' });
  });

  return router;
};

describe('server', () => {
  const PORT = 3000;
  const URL = `http://localhost:${PORT}`;

  let listener;
  beforeEach(async () => {
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    app.use('/', controller());
    listener = app.listen(PORT);
  });

  afterEach(async () => {
    listener.close();
  });

  it('should echo api', async () => {
    const res = await axios.get(`${URL}/test`);
    assert.deepStrictEqual(res.data, { message: 'surprise motherfucker!!!' });
  });
});
