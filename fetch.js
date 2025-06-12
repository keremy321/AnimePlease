import axios from 'axios';

async function fetchGenres() {
  const query = `
    query {
      GenreCollection
    }
  `;

  try {
    const response = await axios.post('https://graphql.anilist.co', { query });
    const genres = response.data.data.GenreCollection;
    console.log("🎯 Genres:\n", genres.map(tag => `"${tag}"`).join(', '));
  } catch (err) {
    console.error("Failed to fetch genres:", err.message);
  }
}

async function fetchTags() {
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
      console.log("🏷️ Tags:\n", tags.map(tag => `"${tag}"`).join(', '));
    } catch (err) {
      console.error("Failed to fetch tags:", err.message);
    }
}

async function printGenresAndTags() {
    await fetchGenres();
    await fetchTags();
}
  
printGenresAndTags();
    