import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/', async (req, res) => {
    const query = `
        query {
            GenreCollection
        }
    `;

    try {
        const response = await axios.post('https://graphql.anilist.co', { query });
        const genres = response.data.data.GenreCollection;
        res.json(genres);
    } catch (error) {
        console.error("Error fetching genres from AniList API:", error.message);
        console.error("Error details:", error.response ? error.response.data : "No response from API");
        res.status(500).send("Error fetching genres from AniList API");
    }
});

export default router;