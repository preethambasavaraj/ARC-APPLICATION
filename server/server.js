const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

const whitelist = [
  'http://localhost:3000',
  'https://894362bbe422.ngrok-free.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
