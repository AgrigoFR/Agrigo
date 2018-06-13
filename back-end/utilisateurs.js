const fileUpload = require('express-fileupload');
const tools = require('./tools');
const variables = require('./variables');
const mysql = require('mysql');
const mkdirp = require('mkdirp');

var pool = mysql.createPool({
  connectionLimit : 100,
  host: variables.SQL_HOST,
  user: variables.SQL_USER,
  password: variables.SQL_PASSWORD,
  database: variables.SQL_DATABASE,
  multipleStatements: false
});

exports.changerMotDePasse = function(req, res) {
  if (req.session == null) {
    res.json({code : 100, status : "L'utilisateur n'est pas connecté"});
    return;
  }
  else {
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

    pool.getConnection(function(err,connection) {
      if (err) {
        res.json({code : 100, status : "Error in connection database"});
        return;
      }
      connection.on('error', function(err) {
        res.json({code : 100, status : "Error in connection database"});
        return;
      });
      password = pool.escape(bcrypt.hashSync(password, 12));
      connection.query("UPDATE User SET password="+password+" WHERE id="+id, function(err,rows) {
        if(err) {
          res.json({code : 100, status : "Error in connection database"});
          return;
        }
        else {
          connection.query("SELECT fichier1, fichier2, fichier3 FROM User WHERE id = \
           "+pool.escape(req.session.cookie.id), function(err, rows2) {
            if (err) {
              res.json({code : 100, status : "Error in connection database"});
              return;
            }
            else {
              renvoi = req.session.cookie;
              renvoi.fichier1 = rows2[0].fichier1;
              renvoi.fichier2 = rows2[0].fichier2;
              renvoi.fichier3 = rows2[0].fichier3;
              res.json({code : 200, status : renvoi});
              return;
            }
          });
        }
      });
    });
  }
}

exports.changerNumeroDeTelephone = function(req, res) {
  if (req.session == null) {
    res.json({code : 100, status : "L'utilisateur n'est pas connecté"});
    return;
  }
  else {
    var telephone = req.body.telephone;
    telephone = telephone.replace(/\s+/g, '').replace('.', '');
    telephone = parseInt(telephone, 10);
    if (!tools.isNumber(telephone) || telephone.toString().length < 10 || telephone.toString().length > 12) {
      res.json({code : 100, status : "Le numéro de téléphone est invalide"});
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
      password = pool.escape(bcrypt.hashSync(password, 12));
      connection.query("UPDATE User SET telephone="+telephone+" WHERE id="+id, function(err,rows) {
        if(err) {
          res.json({code : 100, status : "Error in connection database"});
          return;
        }
        else {
          connection.query("SELECT fichier1, fichier2, fichier3 FROM User WHERE id = \
           "+pool.escape(req.session.cookie.id), function(err, rows2) {
            if (err) {
              res.json({code : 100, status : "Error in connection database"});
              return;
            }
            else {
              renvoi = req.session.cookie;
              renvoi.fichier1 = rows2[0].fichier1;
              renvoi.fichier2 = rows2[0].fichier2;
              renvoi.fichier3 = rows2[0].fichier3;
              res.json({code : 200, status : renvoi});
              return;
            }
          });
        }
      });
    });
  }
}

exports.inviterNouvelUtilisateur = function(req, res) {
  if (req.session == null) {
    res.json({code : 100, status : "L'utilisateur n'est pas connecté"});
    return;
  }
  else {
    var email = req.body.email;
    if (!tools.validateEmail(email) || email.length > 100) {
      res.json({code : 100, status : "L'adresse email est invalide"});
      return;
    }
    else {
      email = pool.escape(email);
      randomString = pool.escape(tools.randomString());
      pool.getConnection(function(err,connection) {
        if (err) {
          res.json({code : 100, status : "Error in connection database"});
          return;
        }
        connection.on('error', function(err) {
          res.json({code : 100, status : "Error in connection database"});
          return;
        });
        connection.query("SELECT email from User WHERE email = " + email, function(err,rows) {
          if(err) {
            res.json({code : 100, status : "Error in connection database"});
            return;
          }
          else {
            if (rows.length > 0) {
              res.json({code : 100, status : "L'adresse email a déjà été utilisée"});
              return;
            }
            else {
              connection.query("INSERT INTO User (email, oubli, oubliDuree, fk_company) \
               VALUES("+email+", "+randomString+", "+Date.now()+", "+pool.escape(req.session.cookie.fk_company)+")", function(err,rows) {
                if(err) {
                  res.json({code : 100, status : "Error in connection database"});
                  return;
                }
                else {
                  connection.query("SELECT fichier1, fichier2, fichier3 FROM User WHERE id = \
                   "+pool.escape(req.session.cookie.id), function(err, rows2) {
                    if (err) {
                      res.json({code : 100, status : "Error in connection database"});
                      return;
                    }
                    else {
                      /* ENVOYER UN EMAIL POUR QUE L'UTILISATEUR FINALISE SON INSCRIPTION */
                      renvoi = req.session.cookie;
                      renvoi.fichier1 = rows2[0].fichier1;
                      renvoi.fichier2 = rows2[0].fichier2;
                      renvoi.fichier3 = rows2[0].fichier3;
                      res.json({code : 200, status : renvoi});
                      return;
                    }
                  });
                }
              });
            }
          }
        });
      });
    }
  }
}

exports.upload = async function(req, res) {
  var listeExtensions = [
    "pdf",
    "docx",
    "jpg",
    "jpeg",
    "odt",
    "xls",
    "xlsx",
    "doc",
    "png",
    "bmp",
    "gif",
    "numbers",
    "pages",
    "csv"
  ];

  if (req.session == null) {
    res.json({code : 100, status : "L'utilisateur n'est pas connecté"});
    return;
  }
  else {
    if (!req.files) {
      res.json({code : 100, status : "Aucun fichier"});
      return;
    }
    else {
      var result = await uploadFichier(req);
      if (result == 1) {
        res.json({code : 100, status : "Error in connection database"});
        return;
      }
      else {
        renvoi = req.session.cookie;
        res.json({code : 200, status : renvoi});
        return;
      }
    }
  }
}

async function uploadFichier(req) {
  pool.getConnection(function(err,connection) {
    if (err) {
      return 1;
    }
    connection.on('error', function(err) {
      return 1;
    });
    connection.query("SELECT fk_company from User WHERE email = " + pool.escape(req.session.email), function(err, rows) {
      if(err) {
        return 1;
      }
      else {
        if (req.files.fichier1) {
          var nomFichier1 = req.files.fichier1.name;
          var extension1 = tools.getExtensionFichier(nomFichier1);
          if (listeExtensions.indexOf(extension1) != -1) {
            if (req.files.fichier1.truncated == false) {
              mkdirp('/tmp/'+rows[0].fk_company);
              req.files.fichier1.mv('/tmp/'+rows[0].fk_company+'/'+nomFichier1);
              connection.query("UPDATE User SET fichier1 ="+pool.escape(nomFichier1)+" WHERE email = "+pool.escape(req.session.email), function (err, rows2) {
                if (err) {
                  return 1;
                }
              });
            }
          }
        }
        if (req.files.fichier2) {
          var nomFichier2 = req.files.fichier2.name;
          var extension2 = tools.getExtensionFichier(nomFichier2);
          if (listeExtensions.indexOf(extension2) != -1) {
            if (req.files.fichier2.truncated == false) {
              mkdirp('/tmp/'+rows[0].fk_company);
              req.files.fichier2.mv('/tmp/'+rows[0].fk_company+'/'+nomFichier2);
              connection.query("UPDATE User SET fichier2 ="+pool.escape(nomFichier2)+" WHERE email = "+pool.escape(req.session.email), function (err, rows3) {
                if (err) {
                  return 1;
                }
              });
            }
          }
        }
        if (req.files.fichier3) {
          var nomFichier3 = req.files.fichier3.name;
          var extension3 = tools.getExtensionFichier(nomFichier3);
          if (listeExtensions.indexOf(extension3) != -1) {
            if (req.files.fichier3.truncated == false) {
              mmkdirp('/tmp/'+rows[0].fk_company);
              req.files.fichier3.mv('/tmp/'+rows[0].fk_company+'/'+nomFichier3);
              connection.query("UPDATE User SET fichier3 ="+pool.escape(nomFichier3)+" WHERE email = "+pool.escape(req.session.email), function (err, rows4) {
                if (err) {
                  return 1;
                }
              });
            }
          }
        }
      }
    });
  });
}
