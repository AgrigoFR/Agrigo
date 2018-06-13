'use strict';

const express = require('express');

// Constants
const http = require('http');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session')
const Keygrip = require('keygrip');
const request = require('request');
const tools = require('./tools');
const etapes = require('./etapes');
const authentification = require('./authentification');
const variables = require('./variables');
const utilisateurs = require('./utilisateurs');
const helmet = require('helmet');
const cors = require('cors');
const fileUpload = require('express-fileupload');

const PORT = variables.PORT;
const HOST = variables.HOST;

// App
var app = express();

app.use(helmet());
app.use(cors());
app.use(fileUpload({
  safeFileNames: true,
  preserveExtention: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cookieSession({
  name: 'session',
  sameSite: 'strict',
  keys: new Keygrip([variables.KEY_1, variables.KEY_2], 'SHA384', 'base64'),
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000
}));

app.use(fileUpload({
  limits: { fileSize: 20 * 1024 * 1024 },
}));
app.set('trust proxy', 1);

app.get('/', (req, res) => {
  req.session.views = (req.session.views || 0) + 1;

  // Write response
  res.end(req.session.views + ' views');
});

app.post('/etape1', (req, res) => {
  etapes.etape1(req, res);
});
app.post('/etape2', (req, res) => {
  etapes.etape2(req, res);
});
app.post('/oubli', (req, res) => {
  authentification.envoiOubliMotDePasse(req, res);
});
app.post('/retrouver', (req, res) => {
  authentification.retrouverMotDePasse(req, res);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
