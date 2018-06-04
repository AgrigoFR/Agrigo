'use strict';

const express = require('express');

// Constants
var bodyParser = require('body-parser');
var mysql = require('mysql');
var bcrypt = require('bcrypt');
var cookieSession = require('cookie-session')
var Keygrip = require('keygrip');
var tools = require('./tools');
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

var pool = mysql.createPool({
  connectionLimit : 100,
  host: variables.SQL_HOST,
  user: variables.SQL_USER,
  password: variables.SQL_PASSWORD,
  database: variables.SQL_DATABASE,
  multipleStatements: false
});

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
app.get('/logout', (req, res) => {
  logout(req, res);
});
app.post('/signin', (req, res) => {
  signin(req, res);
})
app.post('/signup', (req, res) => {
  signup(req, res);
});

// Function
function signin(req, res) {
  if (req.session.siren) {
    res.json({code : 201, status : "Déjà connecté"});
    return;
  }

  var email = req.body.email;
  if (!tools.validateEmail(email)) {
    res.json({code : 100, status : "Adresse email invalide"});
    return;
  }
  var password = req.body.password;
  if (!tools.hasLetter(password) || !tools.hasNumber(password)) {
    res.json({code : 100, status : "Mot de passe invalide"});
    return;
  }

  pool.getConnection(function(err,connection) {
    if (err) {
      res.json({code : 100, status : "Error in connection database"});
      return;
    }
    connection.on('error', function(err) {
      res.json({code : 100, status : "Error in connection database"});
      return;
    });
    email = pool.escape(email);
    connection.query("SELECT password from Users WHERE email = " + email,function(err,rows){
      if(!err) {
        if (rows.length != 1) {
          res.json({code : 100, status : "Adresse email inconnue"});
          return
        }
        console.log(rows[0].password);
        if (bcrypt.compareSync(password, rows[0].password)) {
          req.session.siren = rows[0].siren;
          res.json({code : 201, status : "Connecté"});
          return;
        }
      }
    });
  });
}

function logout(req, res) {
  req.session = null;
  res.json({code : 201, status : "Déconnecté"});
}

function signup(req, res) {
  var errors = [];

  var siren = parseInt(req.body.siren, 10);
  if (siren < 100000000 || siren > 999999999 || !tools.isNumber(siren)) {
    errors.push("Siren invalide");
  }

  var email = req.body.email;
  if (!tools.validateEmail(email)) {
    errors.push("Adresse email invalide");
  }

  var password = req.body.password;
  var password2 = req.body.password2;
  if (password != password2) {
    errors.push("Les mots de passe ne correspondent pas");
  }
  if (!tools.hasNumber(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }
  if (!tools.hasLetter(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre");
  }
  if (password.length < 8) {
    errors.push("Le mot de passe est trop court");
  }
  else if (password.length > 50) {
    errors.push("Le mot de passe est trop long");
  }

  var email = pool.escape(email);
  pool.getConnection(function(err,connection){
    if (err) {
      res.json({code : 100, status : "Error in connection database"});
      return;
    }

    connection.on('error', function(err) {
      res.json({code : 100, status : "Error in connection database"});
      return;
    });

    connection.query("SELECT email from Users WHERE email = " + email,function(err,rows) {
      if(!err) {
        if (rows.length > 0) {
          errors.push("L'adresse email est déjà utilisée");
        }
      }
      if (errors.length > 0) {
        res.json({code : 100, status : errors});
        return;
      }
      else {
        var passwordHashed = bcrypt.hashSync(password, 12);
        passwordHashed = pool.escape(passwordHashed);
        connection.query("INSERT INTO Users (siren, email, password) VALUES (" + siren + ", " + email + ", " + passwordHashed + ")",function(err,rows){
          connection.release();
          if(!err) {
            req.session.siren = siren;
            res.json({code : 201, status : "Compte créé"});
            return;
          }
        });
      }
    });
  });
}

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
