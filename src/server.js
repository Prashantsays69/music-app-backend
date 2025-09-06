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
        headers: { "Authorization": `Basic ${authString}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials"
    });

    if (!response.ok) throw new Error("Failed to fetch Spotify token");
    
    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in * 1000);
    return cachedToken;
}

// Health check route
app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

// This route is no longer needed by the app, but we can keep it for testing
app.get("/token", async (req, res) => {
    try {
        const token = await getSpotifyToken();
        res.json({ access_token: token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search route that the frontend will call
app.get("/search", async (req, res) => {
    const searchTerm = req.query.q;
    if (!searchTerm) {
        return res.status(400).json({ error: "Search term (q) is required" });
    }

    try {
        const token = await getSpotifyToken();
        const spotifyUrl = `https://api.spotify.com/v1/search?q=...\`;`;
        const spotifyRes = await fetch(spotifyUrl, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!spotifyRes.ok) throw new Error("Spotify search failed");
        
        const data = await spotifyRes.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Album tracks route that the frontend will call
app.get("/album/:albumId", async (req, res) => {
    const { albumId } = req.params;
    try {
        const token = await getSpotifyToken();
        const albumUrl = `https://api.spotify.com/v1/albums/${albumId}`;
        const tracksUrl = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

        const [albumRes, tracksRes] = await Promise.all([
            fetch(albumUrl, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(tracksUrl, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (!albumRes.ok || !tracksRes.ok) throw new Error('Failed to fetch album details from Spotify');

        const albumData = await albumRes.json();
        const tracksData = await tracksRes.json();
        
        res.json({ albumData, tracksData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.listen(process.env.PORT || 3000, () => {
    console.log(`✅ Backend running at http://localhost:${process.env.PORT || 3000}`);
});