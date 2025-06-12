import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/', async (req, res) => {
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

export default router;