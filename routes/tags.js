import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/', async (req, res) => {
    const query = `
        query {
            MediaTagCollection {
                name
            }
        }
    `;

    try {
        const response = await axios.post('https://graphql.anilist.co', { query });
        const tags = response.data.data.MediaTagCollection.map(tag => tag.name);
        res.json(tags);
    } catch (error) {
        console.error("Error fetching tags from AniList API:", error.message);
        res.status(500).send("Error fetching tags from AniList API");
    }
});

export default router;