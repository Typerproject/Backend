const axios = require("axios");

let accessToken = "";

async function getOAuth() {
  const url = "https://openapi.koreainvestment.com:9443/oauth2/tokenP";
  const headers = {
    "content-type": "application/json",
  };
  const body = {
    grant_type: "client_credentials",
    appkey: process.env.APP_KEY,
    appsecret: process.env.APP_SECRET,
  };

  try {
    const resp = await axios.post(url, body, { headers });
    console.log("Access token updated:", resp.data);
    accessToken = resp.data.access_token;
  } catch (error) {
    console.error("Error fetching OAuth token:", error);
  }
}

async function getAccessToken() {
  return accessToken;
}

module.exports = { getOAuth, getAccessToken };
