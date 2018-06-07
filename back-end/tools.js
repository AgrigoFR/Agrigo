var request = require('request');

exports.isNumber = function(siren) {
  return typeof siren == "number" || (typeof siren == "object" && siren.constructor === Number);
}

exports.validateEmail = function(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

exports.hasNumber = function(password) {
  return /\d/.test(password);
}

exports.hasLetter = function(password) {
  var re = /[a-zA-Z]/;
  return re.test(password);
}

exports.isEmpty = function(str) {
    return (!str || 0 === str.length || /^\s*$/.test(str));
}

exports.randomString = function() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 20; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

exports.isValidDate = function(date) {
    // format D(D)/M(M)/(YY)YY
    var dateFormat = /^\d{1,4}[\.|\/|-]\d{1,2}[\.|\/|-]\d{1,4}$/;

    if (dateFormat.test(date)) {
        // remove any leading zeros from date values
        date = date.replace(/0*(\d*)/gi,"$1");
        var dateArray = date.split(/[\.|\/|-]/);

              // correct month value
        dateArray[1] = dateArray[1]-1;

        // correct year value
        if (dateArray[2].length<4) {
            // correct year value
            dateArray[2] = (parseInt(dateArray[2]) < 50) ? 2000 + parseInt(dateArray[2]) : 1900 + parseInt(dateArray[2]);
        }

        var testDate = new Date(dateArray[2], dateArray[1], dateArray[0]);
        if (testDate.getDate()!=dateArray[0] || testDate.getMonth()!=dateArray[1] || testDate.getFullYear()!=dateArray[2]) {
            return false;
        } else {
            return true;
        }
    } else {
        return false;
    }
}

exports.getInfoSiren = function(siren) {
  var url = 'https://data.opendatasoft.com/api/records/1.0/search/' +
            '?dataset=sirene%40public&rows=1&facet=section&refine.siren=';
  url += siren;
  return new Promise((resolve, reject) => {
    request(url, function (err, response, body) {
      if (err) {
        reject(err);
      }
      else {
        body = JSON.parse(body);
        var jsonReponse = {
          'rue' : body.records[0].fields.l4_normalisee,
          'codePostal' : body.records[0].fields.codpos,
          'ville' : body.records[0].fields.libcom,
          'activite' : body.records[0].fields.activite,
          'raisonSociale' : body.records[0].fields.nomen_long,
          'siren' : siren
        }
        resolve(jsonReponse);
      }
    });
  });
}
