var tools = require('./tools');
var email = require('./email');
var variables = require('./variables');
var mysql = require('mysql');
var bcrypt = require('bcrypt');

var pool = mysql.createPool({
  connectionLimit : 100,
  host: variables.SQL_HOST,
  user: variables.SQL_USER,
  password: variables.SQL_PASSWORD,
  database: variables.SQL_DATABASE,
  multipleStatements: false
});

exports.logout = function(req, res) {
  req.session = null;
  res.json({code : 200, status : "Déconnecté"});
}

exports.signin = function(req, res) {
  if (req.session.cookie != null) {
    res.json({code : 200, status : "Déjà connecté"});
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
    connection.query("SELECT password from User WHERE email = " + email,function(err,rows){
      if(!err) {
        if (rows.length != 1) {
          res.json({code : 100, status : "Adresse email inconnue"});
          return;
        }
        else if (rows[0].password == null) {
          res.json({code : 100, status : "Mot de passe null"});
          return;
        }
        else {
          if (bcrypt.compareSync(password, rows[0].password)) {
            res.json({code : 200, status : "Connecté"});
            return;
          }
          else {
            res.json({code : 100, status : "Mot de passe incorrect"});
            return;
          }
        }
      }
    });
  });
}

exports.oubli = function(req, res) {
  if (req.session.cookie != null) {
    res.json({code : 200, status : "Déjà connecté"});
    return;
  }
  else {
    var email = req.body.email;
    if (!tools.validateEmail(email)) {
      res.json({code : 100, status : "Adresse email invalide"});
      return;
    }

    pool.getConnection(function(err,connection) {
      if (err) {
        res.json({code : 100, status : "Error in connection database"});
        return;
      }
      else {
        connection.on('error', function(err) {
          res.json({code : 100, status : "Error in connection database"});
          return;
        });
        email = pool.escape(email);
        connection.query("SELECT nom, prenom, email from User WHERE email = " + email,function(err,rows) {
          if(!err) {
            if (rows.length != 1) {
              res.json({code : 100, status : "Adresse email inconnue"});
              return;
            }
            else {
              randomString = tools.randomString();
              console.log("Date : "+Date.now());
              connection.query("UPDATE User SET oubli = '"+randomString+"', oubliDuree = '"+Date.now()+"' WHERE email = "+pool.escape(rows[0].email));
              connection.release();
              tools.envoiOubliMotDePasse(rows[0].nom, rows[0].prenom, email, randomString);
              res.json({code : 200, status : "Vous allez recevoir un email"});
              return;
            }
          }
        });
      }
    });
  }
}

exports.retrouver = function (req, res) {
  if (req.session.cookie != null) {
    res.json({code : 200, status : "Déjà connecté"});
    return;
  }
  var email = req.body.email;
  if (!tools.validateEmail(email)) {
    res.json({code : 100, status : "Adresse email invalide"});
    return;
  }
  var errors = [];
  var key = req.body.key;
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

  if (errors == null || errors.length != 0 || errors == undefined) {
    res.json({code : 100, status : errors});
    return;
  }
  email = pool.escape(email);
  pool.getConnection(function(err,connection) {
    if (err) {
      res.json({code : 100, status : "Error in connection database"});
      return;
    }
    else {
      connection.on('error', function(err) {
        res.json({code : 100, status : "Error in connection database"});
        return;
      });
      connection.query("SELECT oubli, oubliDuree, timestamp FROM User WHERE email = " + email, function(err,rows) {
        if(!err) {
          if (rows.length != 1) {
            res.json({code : 100, status : "Adresse email inconnue"});
            return;
          }
          else {
            if (rows[0].oubli != key || rows[0].oubli == null) {
              res.json({code : 100, status : "Clé incorrecte"});
              return;
            }
            else {
              if (Date.now() > rows[0].oubliDuree + 24*3600*1000) {
                res.json({code : 100, status : "Clé expirée"});
                return;
              }
              else {
                password = pool.escape(bcrypt.hashSync(password, 12));
                connection.query("UPDATE User SET password = "+password+", oubli = NULL WHERE email = "+email, function(err, rows) {
                  connection.release();
                  if (!err) {
                    res.json({code : 200, status : "Mot de passe mis à jour"});
                    return;
                  }
                });
              }
            }
          }
        }
      });
    }
  });
}
