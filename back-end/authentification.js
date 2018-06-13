const tools = require('./tools');
const email = require('./email');
const variables = require('./variables');
const mysql = require('mysql');
const bcrypt = require('bcrypt');

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
    connection.query("SELECT password, fk_company from User WHERE email = " + email, function(err,rows) {
      if(!err) {
        var password = pool.escape(rows[0].password);
        if (rows.length != 1) {
          res.json({code : 100, status : "Adresse email inconnue"});
          return;
        }
        else if (rows[0].password == null) {
          res.json({code : 100, status : "Mot de passe null"});
          return;
        }
        else {
          if (bcrypt.compareSync(password, password)) {
            connection.query("SELECT siren FROM Company WHERE id = " + rows[0].fk_company, function (err, rows2) {
              if (!err) {
                var renvoi = {
                  'nom' : nom,
                  'prenom' : prenom,
                  'raisonSociale' : raisonSociale,
                  'email' : email,
                  'siren' : siren,
                  'fk_company' : rows2[0].fk_company,
                  'id' : rows[0].insertId
                }
                req.session.cookie = renvoi;
                res.json({code : 200, status : renvoi});
                return;
              }
              else {

              }
            })
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

exports.envoiOubliMotDePasse = function(req, res) {
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
              randomString = pool.escape(tools.randomString());
              connection.query("UPDATE User SET oubli = "+randomString+", oubliDuree = "+Date.now()+" WHERE email = "+pool.escape(rows[0].email));
              connection.release();
              /*tools.envoiOubliMotDePasse(rows[0].nom, rows[0].prenom, email, randomString);
              ENVOI EMAIL */
              res.json({code : 200, status : "Vous allez recevoir un email"});
              return;
            }
          }
        });
      }
    });
  }
}

exports.retrouverMotDePasse = function (req, res) {
  if (req.session.cookie != null) {
    res.json({code : 200, status : "Déjà connecté"});
    return;
  }
  var errors = [];
  var email = req.body.email;
  if (!tools.validateEmail(email)) {
    errors.push("L'adresse email est invalide");
  }

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
      connection.query("SELECT oubli, oubliDuree, nom, prenom, fk_company, id, timestamp FROM User WHERE email = " + email, function (err,rows) {
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
                connection.query("UPDATE User SET password = "+password+", oubli = NULL, \
                 oubliDuree = NULL WHERE email = "+email, function(err, rows2) {
                  if (!err) {
                    connection.query("SELECT siren, raisonSociale FROM Company WHERE id="+rows[0].fk_company, function (err, rows3) {
                      if (!err) {
                        var renvoi = {
                          'nom' : rows[0].nom,
                          'prenom' : rows[0].prenom,
                          'raisonSociale' : rows3[0].raisonSociale,
                          'email' : email,
                          'siren' : rows[3].siren,
                          'fk_company' : rows[0].fk_company,
                          'id' : rows[0].id
                        }
                        req.session.cookie = renvoi;
                        res.json({code : 200, status : renvoi});
                        return;
                      }
                      else {
                        res.json({code : 100, status : "Error in connection database"});
                        return;
                      }
                    });
                  }
                  else {
                    res.json({code : 100, status : "Error in connection database"});
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

exports.premiereConnexion = function (req, res) {
  if (req.session.cookie != null) {
    res.json({code : 200, status : "Déjà connecté"});
    return;
  }
  var errors = [];
  var listeFonctions = [
    "Dirigeant",
    "Collaborateur",
    "Tiers"
  ];

  var fonction = req.body.fonction;
  if (listeFonctions.indexOf(fonction) == -1) {
    errors.push("La fonction est invalide");
  }

  var email = req.body.email;
  if (!tools.validateEmail(email)) {
    errors.push("L'adresse email est invalide");
  }
  var civilite = req.body.civilite;
  if (civilite != "Monsieur" || civilite != "Madame") {
    errors.push("La civilité est invalide");
  }

  var telephone = req.body.telephone;
  telephone = telephone.replace(/\s+/g, '').replace('.', '');
  telephone = parseInt(telephone, 10);
  if (!tools.isNumber(telephone) || telephone.toString().length < 10 || telephone.toString().length > 12) {
    errors.push("Le numéro de téléphone est invalide");
  }

  var nom = req.body.nom;
  if (tools.isEmpty(nom) || nom.length > 100) {
    errors.push("Le nom est invalide");
  }

  var prenom = req.body.prenom;
  if (tools.isEmpty(prenom) || prenom.length > 100) {
    errors.push("Le prénom est invalide");
  }

  var dob = req.body.dob;
  if (!isValidDate(dob)) {
    errors.push("La date de naissance est invalide");
  }

  if (errors == null || errors.length != 0 || errors == undefined) {
    res.json({code : 100, status : errors});
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
  nom = pool.escape(nom);
  prenom = pool.escape(prenom);
  dob = pool.escape(dob);
  civilite = pool.escape(civilite);
  telephone = pool.escape(telephone);
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
      connection.query("SELECT id, oubli, oubliDuree, fk_company FROM User WHERE email = " + email, function (err, rows) {
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
                connection.query("UPDATE User SET nom = "+nom+", SET prenom = "+prenom+", \
                 SET telephone = "+telephone+" SET dob = "+dob+", civilite = "+civilite+", SET fonction = "+fonction+" \
                 SET password = "+password+", SET oubli = NULL, SET oubliDuree = NULL WHERE email = "+email, function(err, rows2) {
                  if (err) {
                    res.json({code : 100, status : "Error in connection database"});
                    return;
                  }
                  else {
                    connection.query("SELECT siren, raisonSociale FROM Company WHERE id="+rows[0].fk_company, function (err, rows3) {
                      if (err) {
                        res.json({code : 100, status : "Error in connection database"});
                        return;
                      }
                      else {
                        var renvoi = {
                          'nom' : nom,
                          'prenom' : prenom,
                          'raisonSociale' : rows3[0].raisonSociale,
                          'email' : email,
                          'siren' : rows[3].siren,
                          'fk_company' : fk_company,
                          'id' : rows[0].id
                        }
                        req.session.cookie = renvoi;
                        res.json({code : 200, status : renvoi});
                        return;
                      }
                    });
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
