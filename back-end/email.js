var variables = require('./variables');
var nodemailer = require('nodemailer');
var smtpTransport = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    auth: {
        user: "",
        pass: ""
    }
});

exports.envoiOubliMotDePasse = function(nom, prenom, email, key) {
  var sujet = "Agrigo : Votre mot de passe oublié";
  var url = "localhost:8080/oubli?email="+email+"&key="+key;
  var message = url;
  var mailOptions = {
    from: variables.email,
    to: email,
    subject: sujet,
    text: message,
    html: '<b>' + message + '</b>'
  };
  
  smtpTransport.sendMail(mail, function(error, response){
     if(error) {
				console.log("Erreur lors de l'envoie du mail!");
				console.log(error);
			}
      else {
				console.log("Mail envoyé avec succès!")
			}
			smtpTransport.close();
	});
}
