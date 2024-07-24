//const jwt = require('jsonwebtoken');
//
//// Your service account credentials
//const serviceAccount = require('path/to/serviceAccountKey.json');
//
//const iat = Math.floor(Date.now() / 1000);
//const exp = iat + 3600; // Token valid for 1 hour
//
//const token = jwt.sign(
//  {
//    iss: serviceAccount.client_email,
//    sub: serviceAccount.client_email,
//    aud: "https://oauth2.googleapis.com/token",
//    scope: "https://www.googleapis.com/auth/cloud-platform",
//    iat,
//    exp,
//  },
//  serviceAccount.private_key,
//  { algorithm: 'RS256' }
//);
//
//console.log("Generated JWT:", token);
