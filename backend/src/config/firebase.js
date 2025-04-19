// backend/src/config/firebase.js
const admin = require("firebase-admin");

try {
  console.log("Beginning Firebase initialization...");

  // Initialize with direct JSON for more reliable parsing
  const serviceAccountJson = {
    type: "service_account",
    project_id: "ramaytilibrary",
    private_key_id: "6468a118e8b3dbe4a25d4cd9852d9c6b1183c568",
    private_key:
      "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvFBetoA44/euy\nBwyWv255IWE8IKFG3TUgMRcYXd6JEWOiRYNPbibmZIhENyJONEfoYWToAEj//vBg\nseph0V07vxQ2FBgUpZhx7m67oJSa7hZR7mfs6p0Z6wr/SxKjoog2e6JskQIa9dG5\nkmEcvHW8ltsm63Y6DUxeqWnK7KTnYgbpHG4zb+e3nCKgyWW2oPMcVOP6M2ZwY1Zr\nT2dY8CNW3e8jiOPCkL6oQeHPAKDssR96GYiS9fKhjEstldIzY7Bmz0B6y89G7u9t\nZ2bHsfuX/lzl0bC9embbiiE6Q7iy/ziZU5HYqjVftwwt1p92hnnQwxxMO7FtxVz7\nhnzX5BljAgMBAAECggEALUpT08DvXPPm2G91ZLvRvrkRV8YTImtP9mtsj4uc6TVb\n4lr8HHygyIHiNE9U6wkgPu+O9Gs6dyrCkSkFOle4OB/2gQTSs+iglnx5HcVtG+US\nVhCHxuRsTouclS0c/cKqXPm/qzkZ49KKdeh1gcMI7AfUWm2X8G2HP4ewy+NKx2YJ\nIQL8+GDvIxplBcZ/YdVp9uDYamJnE4iq9hkEZ/d607WF0N63NcAdPIcvTW9nH5bS\nsL4eCFDW8zug7roHl9MXFDYgoeOGM+Cm7qJHxRQGWBNBS+vgvrurjMAG7ExFRfrh\nH4TKMLczjEhIKHJ3c/Unl3QS9lLhcQrJI0jDT8I2XQKBgQDiJxRIziNUvhbi3AD3\nxcPyAbXyNEtqnVgpvkTgfThVt/zLXlHUyq1olrjP3nowxWwh1hndWTSdovPQ2jMz\n/g3klgG3lPfVT6BbzK3/1XOQr5E7V+eXQZMvity4Dhcefm5+Gv8w0BLZRrBDNSyP\n/ZTXUtm5NBk1zYp1+YmaPoD3rQKBgQDGL2SJVoCfv7Oeo+UBCpMIJr3ZljUnSoMd\nacsD/ka+frfsbhY8tQUQAmI2Y7LBjuzU/2UnE+5qvsI2S1Zhz15nmV4AAd/IiYns\nTIucybP9BdURMsCaFSIMqJL12RU2EKep/ZZVTugYnZP27sOoGwy3UDN6JWrqCgiC\nslIxHpe3TwKBgGh+GAA/xtFb92UgtA3Hwe6q3a+ofAQp6Vd4Q4jaMtJgbZxl2zeP\n4inGImRhbmHkhj7oFxFQK2B+r1sbxrbKNw8cRHTXjt9vqC9iVi80J+59QISD7EzW\nDrTT24HreMEtN85qmOir61mbMMwM4KczSrdm35SUPuW+L7Cs+Ohc4ugNAoGBAI/9\nGN9LcNIf1qG41AYIp8CxXRf8MQwl79Lr7SsukDmRGZH2fcOHhXEXOkHn95T3gYxT\nLivRKFR32eTWoaEYp68/V3NL6Unq28FJ79lvFo0Lsrz3EcYg+ocV5wglu2p3eUlh\nS9sZJDnWKw2qdY7qcDezVmM1UlNODNbgNiUn4/SzAoGAAMtb0K06iRp+XAyK3afS\nYNj+PRHdW12lpyuvjZWWZN5Jzcgp0tKEGthUPf7p2eTWPQLym9tpj4KKrzzT8Gaj\nPHMPRD3o0s6VxOfiDNwG2YpHW/ScQo5P0fhJawOliTEFjG0xjxg3BCKChyPhjwRp\nHGgkxW/Qj+uxL6L4v+9hI5k=\n-----END PRIVATE KEY-----\n",
    client_email:
      "firebase-adminsdk-fbsvc@ramaytilibrary.iam.gserviceaccount.com",
    client_id: "111909954238898428010",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ramaytilibrary.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  };

  // Initialize Firebase with hardcoded credentials
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountJson),
    databaseURL: "https://ramaytilibrary-default-rtdb.firebaseio.com",
  });

  console.log("Firebase Admin SDK initialized with hardcoded credentials");
  console.log("Project ID:", serviceAccountJson.project_id);
  console.log("Client email:", serviceAccountJson.client_email);
} catch (error) {
  console.error("Firebase initialization error:", error);
  console.error("Current directory:", process.cwd());
}

module.exports = admin;
