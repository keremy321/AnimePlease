import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import yaml from 'js-yaml';

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * @swagger
 * /genres:
 *   get:
 *     summary: Get all anime genres
 *     responses:
 *       200:
 *         description: A list of available anime genres
 */

app.get('/genres', async (req, res) => {
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

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: Get all anime tags
 *     responses:
 *       200:
 *         description: A list of available anime tags
 */

app.get('/tags', async (req, res) => {
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

/**
 * @swagger
 * /searchAnime:
 *   get:
 *     summary: Search anime with specific filters
 *     parameters:
 *       - in: query
 *         name: genres
 *         schema:
 *           type: string
 *         description: Comma-separated genres to include (e.g., Action,Drama)
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags to include (e.g., School,Shounen)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter anime by release year
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *         description: Minimum average score (e.g., 70)
 *     responses:
 *       200:
 *         description: List of matching anime titles
 */

const searchCache = {};

app.get('/searchAnime', async (req, res) => {
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

/**
 * @swagger
 * /suggestAnime:
 *   get:
 *     summary: Suggest anime titles based on preferences
 *     parameters:
 *       - in: query
 *         name: includeGenres
 *         schema:
 *           type: string
 *         description: Genres to prioritize
 *       - in: query
 *         name: excludeTags
 *         schema:
 *           type: string
 *         description: Tags to avoid
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *         description: Minimum average score
 *     responses:
 *       200:
 *         description: List of suggested anime titles
 */

app.get('/suggestAnime', async (req, res) => {
    const { includedGenres, excludedGenres, includedTags, excludedTags, ratingRange, yearRange } = req.query;

    // Parse rating and year range values
    const [minRating, maxRating] = ratingRange ? ratingRange.split('-').map(Number) : [0, 100];
    const [startYearRange, endYearRange] = yearRange ? yearRange.split('-').map(Number) : [1970, new Date().getFullYear() + 1];

    console.log("Requested Year Range:", startYearRange, "-", endYearRange);

    const query = `
        query ($includedGenres: [String], $excludedGenres: [String], $includedTags: [String], $excludedTags: [String], $minRating: Int, $maxRating: Int) {
            Page(perPage: 50) {
                media(type: ANIME, genre_in: $includedGenres, genre_not_in: $excludedGenres, tag_in: $includedTags, tag_not_in: $excludedTags, averageScore_greater: $minRating, averageScore_lesser: $maxRating, sort: POPULARITY_DESC) {
                    id
                    title {
                        romaji
                        english
                    }
                    coverImage {
                        large
                    }
                    genres
                    tags {
                        name
                    }
                    averageScore
                    startDate {
                        year
                    }
                }
            }
        }
    `;

    const variables = {
        includedGenres: includedGenres ? includedGenres.split(',') : null,
        excludedGenres: excludedGenres ? excludedGenres.split(',') : null,
        includedTags: includedTags ? includedTags.split(',') : null,
        excludedTags: excludedTags ? excludedTags.split(',') : null,
        minRating,
        maxRating
    };

    try {
        const response = await axios.post('https://graphql.anilist.co', { query, variables });
        let suggestions = response.data.data.Page.media;

        suggestions = suggestions.filter(anime => 
            anime.startDate &&
            anime.startDate.year >= startYearRange &&
            anime.startDate.year <= endYearRange
        );

        console.log("Filtered Suggestions by Year:", suggestions.map(a => a.startDate.year));
        res.json(suggestions.map(anime => ({
            id: anime.id,
            title: anime.title.romaji || anime.title.english || "Unknown Title",
            coverImage: anime.coverImage.large,
            genres: anime.genres,
            tags: anime.tags.map(tag => tag.name),
            averageScore: anime.averageScore,
            startDate: anime.startDate.year,
        })));
    } catch (error) {
        console.error("Error fetching suggested anime from AniList API:", error.message);
        if (error.response) {
            console.error("AniList API Error Details:", JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).send("Error fetching suggested anime");
    }
});

const swaggerOptions = {
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title: 'AnimePlease API',
        version: '1.0.0',
        description: 'API documentation for AnimePlease',
      },
    },
    apis: ['./index.js'],
  };
  
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); 
  
const yamlSpec = yaml.dump(swaggerSpec);
fs.writeFileSync('swagger.yaml', yamlSpec);

app.get("/", (req, res) => {
    res.render("index");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});