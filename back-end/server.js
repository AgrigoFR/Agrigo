'use strict';

const express = require('express');

// Constants
var http = require('http');
var bodyParser = require('body-parser');
var cookieSession = require('cookie-session')
var Keygrip = require('keygrip');
var request = require('request');
var tools = require('./tools');
var etapes = require('./etapes');
var authentification = require('./authentification');
var variables = require('./variables');

const PORT = variables.PORT;
const HOST = variables.HOST;
/*var pool = mysql.createPool({
connectionLimit : 100,
host: "db",
user: "soren",
password: "password",
multipleStatements: false
});*/

// App
const app = express();
var helmet = require('helmet');
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cookieSession({
  name: 'session',
  keys: new Keygrip([variables.KEY_1, variables.KEY_2], 'SHA384', 'base64'),
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000
}));

app.set('trust proxy', 1);

app.get('/', (req, res) => {
  req.session.views = (req.session.views || 0) + 1

  // Write response
  res.end(req.session.views + ' views' + ' ' + req.session.siren);
});

app.post('/etape1', (req, res) => {
  etapes.etape1(req, res);
});
app.post('/etape2', (req, res) => {
  etapes.etape2(req, res);
});
app.post('/oubli', (req, res) => {
  authentification.oubli(req, res);
});
app.post('/retrouver', (req, res) => {
  authentification.retrouver(req, res);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
