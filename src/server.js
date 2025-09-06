import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch token: " + response.statusText);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in * 1000); // expires_in is in seconds, convert to ms
  return cachedToken;
}

app.get("/token", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    res.json({ access_token: token, expires_in: 3600 });
  } catch (err) {
    console.error("Token error:", err);
    res.status(500).json({ error: "Failed to fetch token" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ Backend running at http://localhost:${process.env.PORT || 3000}`);
});