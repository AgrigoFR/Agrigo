const tools = require('./tools');
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

exports.etape1 = function(req, res) {
  var errors = [];

  var listeMotifs = [
    "Fond de commerce",
    "Achat de matériel",
    "Trésorerie",
    "Travaux / Réparation",
    "Développement",
    "Foncier",
    "Autre"
  ]

  var listeChiffreAffaires = [
    0,
    50000,
    100000,
    300000,
    500000,
    1000000
  ]

  var siren = req.body.siren;
  siren = siren.replace(/\s+/g, '');
  siren = parseInt(siren, 10);
  if (!tools.isNumber(siren) || siren < 100000000 || siren > 999999999) {
    errors.push("Le siren est invalide");
  }

  var ca = req.body.ca;
  ca = parseInt(ca, 10);
  if (!tools.isNumber(ca)) {
    errors.push("Le chiffre d'affaire est invalide");
  }
  else if (listeChiffreAffaires.indexOf(ca) == -1) {
    errors.push("Le chiffre d'affaire est invalide");
  }

  var email = req.body.email;
  if (!tools.validateEmail(email) || email.length > 100) {
    errors.push("L'adresse email est invalide");
  }

  var reglement = req.body.reglement;
  if (reglement != "on") {
    errors.push("Vous devez accepter les conditions générales d'utilisation");
  }

  var montant = req.body.montant;
  montant = montant.replace(/\s+/g, '');
  montant = parseInt(montant, 10);
  if (!tools.isNumber(montant)) {
    errors.push("Le montant du prêt est invalide");
  }
  else if (montant < 10000) {
    errors.push("Le montant du prêt demandé est trop faible");
  }
  else if (montant > 10000000000) {
    errors.push("Le montant du prêt demandé est trop important");
  }

  var apport = req.body.apport;
  apport = apport.replace(/\s+/g, '');
  apport = parseInt(apport, 10);
  if (!tools.isNumber(apport)) {
    errors.push("L'apport personnel est invalide");
  }

  var motif = req.body.motif;
  if (listeMotifs.indexOf(motif) == -1) {
    errors.push("Le motif est invalide");
  }
  if (errors == null || errors.length != 0 || errors == undefined) {
    res.json({code : 100, status : errors});
    return;
  }
  else {
    ca = pool.escape(ca);
    siren = pool.escape(siren);
    montant = pool.escape(montant);
    apport = pool.escape(apport);
    motif = pool.escape(motif);
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
            connection.query("INSERT INTO Company (siren, ca) \
            VALUES ("+siren+", "+ca+")", function(err, rows2) {
              if (err) {
                res.json({code : 100, status : "Error in connection database"});
                return;
              }
              else{
                connection.query("INSERT INTO Loan (apport, montant, motif, fk_company) \
                VALUES ("+apport+", "+montant+", "+motif+", "+rows2.insertId+")", function(err, rows3) {
                  if (err) {
                    res.json({code : 100, status : "Error in connection database"});
                    return;
                  }
                  else {
                    connection.query("INSERT INTO User (email, oubli, oubliDuree, fk_company) \
                    VALUES ("+email+", "+randomString+", "+Date.now()+", "+rows2.insertId+")", function(err, rows4) {
                      if (err) {
                        console.log(err);
                        res.json({code : 100, status : "Error in connection database"});
                        return;
                      }
                      else {
                        var details;
                        var initPromise = tools.getInfoSiren(siren);
                        initPromise.then(function(result) {
                          renvoi = result;
                          var cookie = {
                            'email' : email,
                          }
                          /* SI l'utilisateur ne passe pas l'étape 2, envoie d'un email */
                          req.session.cookie = cookie;
                          res.json({code : 200, status : renvoi});
                          return;
                        },
                        function(err) {
                          res.json({code : 100, status : "L'entreprise n'est pas reconnue dans le registre SIRENE"});
                          return;
                        });
                      }
                    });
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

exports.etape2 = function(req, res) {
  var cookie = req.session.cookie;
  if (cookie == null) {
    res.json({code : 100, status : "La partie 1 n'est pas complète"});
    return;
  }
  var errors = [];
  var listeContacts = [
    "Par email",
    "Par téléphone",
    "Je fais une simulation, ne me rappelez pas"
  ];

  var listeFonctions = [
    "Dirigeant",
    "Collaborateur",
    "Tiers"
  ];

  var fonction = req.body.fonction;
  if (listeFonctions.indexOf(fonction) == -1) {
    errors.push("La fonction est invalide");
  }

  var telephone = req.body.telephone;
  telephone = telephone.replace(/\s+/g, '').replace('.', '');
  telephone = parseInt(telephone, 10);
  if (!tools.isNumber(telephone) || telephone.toString().length < 10 || telephone.toString().length > 12) {
    errors.push("Le numéro de téléphone est invalide");
  }

  var raisonSociale = req.body.raisonSociale;
  if (tools.isEmpty(raisonSociale) || raisonSociale.length > 100) {
    errors.push("La raison sociale est invalide");
  }

  var nom = req.body.nom;
  if (tools.isEmpty(nom) || nom.length > 100) {
    errors.push("Le nom est invalide");
  }

  var prenom = req.body.prenom;
  if (tools.isEmpty(prenom) || prenom.length > 100) {
    errors.push("Le prénom est invalide");
  }

  var contact = req.body.contact;
  if (listeContacts.indexOf(contact) == -1) {
    errors.push("Le moyen de contact est invalide");
  }

  var dob = req.body.dob;
  if (!isValidDate(dob)) {
    errors.push("La date de naissance est invalide");
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

  var civilite = req.body.civilite;
  if (civilite != "Monsieur" || civilite != "Madame") {
    errors.push("La civilité est invalide");
  }

  var rue = req.body.rue;
  if (tools.isEmpty(rue) || rue.length > 100) {
    errors.push("La rue est invalide");
  }

  var codePostal = parseInt(req.body.codePostal);
  if (codePostal.toString().length != 5 || !isNumber(codePostal)) {
    errors.push("Le code postal est invalide");
  }

  var ville = req.body.ville;
  if (tools.isEmpty(ville) || ville.length > 100) {
    errors.push("La ville est invalide");
  }

  var activite = req.body.activite;
  if (tools.isEmpty(activite) || activite.length > 200) {
    errors.push("L'activité est invalide");
  }
  var email = req.session.cookie.email;
  if (errors == null || errors.length != 0 || errors == undefined) {
    res.json({code : 100, status : errors});
    return;
  }
  else {
    raisonSociale = pool.escape(raisonSociale);
    rue = pool.escape(rue);
    ville = pool.escape(ville);
    activite = pool.escape(activite);
    codePostal = pool.escape(codePostal);
    password = pool.escape(bcrypt.hashSync(password, 12));
    telephone = pool.escape(telephone);
    contact = pool.escape(contact);
    pool.getConnection(function(err,connection) {
      if (err) {
        res.json({code : 100, status : "Error in connection database"});
        return;
      }
      connection.on('error', function(err) {
        res.json({code : 100, status : "Error in connection database"});
        return;
      });
      connection.query("UPDATE User SET telephone = "+telephone+", SET password = "+password+", \
       SET civilite="+civilite+", SET fonction = "+fonction+" SET oubli = NULL, \
       SET oubliDuree = NULL WHERE email = "+email, function(err, rows) {
        if(err) {
          res.json({code : 100, status : "Error in connection database"});
          return;
        }
        else {
          connection.query("SELECT fk_company FROM User WHERE email="+email, function(err, rows2) {
            if (err) {
              res.json({code : 100, status : "Error in connection database"});
              return;
            }
            else {
              connection.query("UPDATE Company SET rue = "+rue+", SET ville = "+ville+", \
              SET codePostal = "+codePostal+", SET activite = "+activite+", SET raisonSociale = "+raisonSociale+" \
              WHERE id ="+rows2[0].fk_company, function(err, rows3) {
                connection.release();
                if (err) {
                  res.json({code : 100, status : "Error in connection database"});
                  return;
                }
                else {
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
              });
            }
          });
        }
      });
    });
  }
}
