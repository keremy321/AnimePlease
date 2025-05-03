import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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


app.get("/", (req, res) => {
    res.render("index");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});