import express from 'express';
import axios from 'axios';

const router = express.Router();

const searchCache = {};

router.get('/', async (req, res) => {
    const queryText = req.query.q;

    if (searchCache[queryText]) {
        return res.json(searchCache[queryText]);
    }

    const query = `
        query ($search: String) {
            Page(perPage: 10) {
                media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                    id
                    title {
                        romaji
                        english
                    }
                    coverImage {
                        medium
                    }
                    genres
                    tags {
                        name
                    }
                }
            }
        }
    `;

    const variables = { search: queryText };

    try {
        const response = await axios.post('https://graphql.anilist.co', { query, variables });
        const animeTitles = response.data.data.Page.media.map(media => ({
            id: media.id,
            title: media.title.romaji + (media.title.english ? ` (${media.title.english})` : ""),
            coverImage: media.coverImage.medium,
            genres: media.genres,
            tags: media.tags.map(tag => tag.name),
        }));
        
        searchCache[queryText] = animeTitles;

        res.json(animeTitles);
    } catch (error) {
        console.error("Error fetching anime titles from AniList API:", error);
        res.status(500).send("Error fetching anime titles");
    }
});

export default router;