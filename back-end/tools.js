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
