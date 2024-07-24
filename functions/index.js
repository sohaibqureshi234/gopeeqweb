const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const admin = require("firebase-admin");
const {createCanvas, loadImage} = require("canvas");
const path = require("path");
// const jwt = require("jsonwebtoken");


const serviceAccount = require(
    path.join(__dirname, "service-account-file.json"),
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "project-piq.appspot.com",
});

/**
 * Middleware to validate JWT token in the request.
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @param {function} next - Next middleware function
 * @return {void}
 */

// function validateJWT(req, res, next) {
//  const token = req.headers["authorization"];
//
//  if (!token) {
//    return res.status(403).send("Token is required.");
//  }
//
//  jwt.verify(token, serviceAccount.private_key, {
//    algorithms: ["RS256"]}, (err, decoded) => {
//    if (err) {
//      return res.status(401).send("Invalid token.");
//    }
//    req.user = decoded;
//    next();
//  });
// }


const app = express();

// app.use(validateJWT);


app.use(express.static(path.join(__dirname, "public")));

/**
 * Function to get Firebase Storage URL
 * @param {string} filePath - The path to the file in Firebase Storage
 * @return {Promise<string>} - The signed URL for the file
 */
async function getFirebaseStorageUrl(filePath) {
  const file = admin.storage().bucket().file(filePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: "03-09-2491",
  });
  return url;
}

/**
 * Function to generate image with overlay
 * @param {string} imageUrl - The URL of the image to overlay
 * @param {string} urlPath - The path portion of the
 * URL to check for "/profile/"
 * @return {Promise<string>} - The data URL of the generated image
 */
async function generateImageWithOverlay(imageUrl, urlPath) {
  const isSquare = urlPath.includes("/profile/") || urlPath.includes("/refer/");
  const width = isSquare ? 450 : 450;
  const height = isSquare ? 450 : 800;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const image = await loadImage(imageUrl);
  ctx.drawImage(image, 0, 0, width, height);

  if (!isSquare) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    const playButtonUrl = await getFirebaseStorageUrl(
        "logo_coverPhoto/images.png",
    );
    const playButton = await loadImage(playButtonUrl);
    const playButtonSize = 150;
    const playButtonX = (width - playButtonSize) / 2;
    const playButtonY = (height - playButtonSize) / 2;

    ctx.drawImage(playButton, playButtonX, playButtonY,
        playButtonSize,
        playButtonSize,
    );
  }

  return canvas.toDataURL();
}

/**
 * Function to upload image to Firebase Storage
 * @param {string} imageDataUrl - The data URL of the image
 * @param {string} destinationPath - The path to save the
 * image in Firebase Storage
 * @return {Promise<string>} - The public URL of the uploaded image
 */
async function uploadImageToFirebaseStorage(imageDataUrl, destinationPath) {
  const buffer = Buffer.from(imageDataUrl.split(",")[1], "base64");
  const file = admin.storage().bucket().file(destinationPath);
  await file.save(buffer, {
    metadata: {
      contentType: "image/png",
    },
  });
  return await getFirebaseStorageUrl(destinationPath);
}

app.get("/share/:imageId/*", async (req, res) => {
  try {
    const imageId = req.params.imageId;
    const urlPath = req.path;
    let filePath = "";
    if (urlPath.includes("/profile/")) {
      filePath = `business_logos/${imageId}.jpg`;
    } else if (urlPath.includes("/refer/")) {
      filePath = `logo_coverPhoto/peeq_logo.jpg`;
    } else {
      filePath = `thumbnail/${imageId}.jpg`;
    }
    const storageUrl = await getFirebaseStorageUrl(filePath);
    const imageUrlWithOverlay = await generateImageWithOverlay(
        storageUrl,
        req.path,
    );
    const overlayImagePath = `thumbnail/overlay_${imageId}`;
    const publicUrl = await uploadImageToFirebaseStorage(
        imageUrlWithOverlay,
        overlayImagePath,
    );

    const image = await loadImage(imageUrlWithOverlay);
    const imageWidth = image.width;
    const imageHeight = image.height;

    const videoDetails = {
      title: `Video Title for ${imageId}`,
      description: `Description for video ${imageId}`,
      imageWithPlayButtonUrl: publicUrl,
    };

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <base href="/">
        <meta charset="UTF-8">
        <meta content="IE=Edge" http-equiv="X-UA-Compatible">
        <meta name="description" content="A new Flutter project.">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black">
        <meta name="apple-mobile-web-app-title" content="gopeeqweb">
        <link rel="apple-touch-icon" href="icons/Icon-192.png">
        <link rel="icon" type="image/png" href="favicon.png"/>
        <title>gopeeqweb</title>
        <link rel="manifest" href="manifest.json">
        <meta property="og:url" content="https://go.peeq.inc/share/${imageId}">
        <meta property="og:type" content="website">
        <meta property="og:title" content="peeq | The next big mobile app.">
        <meta property="og:description"
        content="Discover Amazing busineses and assets.">
        <meta property="og:image"
              content="${videoDetails.imageWithPlayButtonUrl}">
        <meta property="og:image:width" content="${imageWidth}">
        <meta property="og:image:height" content="${imageHeight}">
        <script type="module">
          import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js';
          import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js';

          const firebaseConfig = {
            apiKey: "AIzaSyAoEBMQpINV2ULo9GSCyAnn2CEALWgEz_k",
            authDomain: "project-piq.firebaseapp.com",
            databaseURL: "https://project-piq-default-rtdb.firebaseio.com",
            projectId: "project-piq",
            storageBucket: "project-piq.appspot.com",
            messagingSenderId: "192603333654",
            appId: "1:192603333654:web:739d3a6e933ac022060137",
            measurementId: "G-Z17RDESKZC"
          };

          const app = initializeApp(firebaseConfig);
          const analytics = getAnalytics(app);
        </script>
        <script>
          const serviceWorkerVersion = "1477476543";
        </script>
        <script src="flutter.js" defer></script>
      </head>
      <body>
      <script>
        window.addEventListener('load', function(ev) {
          if (typeof _flutter !== 'undefined' && _flutter.loader) {
            _flutter.loader.loadEntrypoint({
              serviceWorker: {
                serviceWorkerVersion: serviceWorkerVersion,
              },
              onEntrypointLoaded: function(engineInitializer) {
                engineInitializer.initializeEngine().then(
                function(appRunner) {
                  appRunner.runApp();
                });
              }
            });
          } else {
            console.error("_flutter is not defined");
          }
        });
      </script>
      </body>
      </html>
    `;

    res.set("Content-Type", "text/html");
    res.send(htmlTemplate);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.app = onRequest({
  timeoutSeconds: 540,
  maxInstances: 10,
}, app);
