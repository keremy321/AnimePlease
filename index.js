import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import yaml from 'js-yaml';

import genresRoute from './routes/genres.js';
import tagsRoute from './routes/tags.js';
import searchRoute from './routes/searchAnime.js';
import suggestRoute from './routes/suggestAnime.js';
import aiRoute from './routes/aiChat.js';

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());

app.use('/genres', genresRoute);
app.use('/tags', tagsRoute);
app.use('/searchAnime', searchRoute);
app.use('/suggestAnime', suggestRoute);
app.use('/aiChat', aiRoute);


const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'AnimePlease API',
            version: '1.0.0',
            description: 'API documentation for AnimePlease',
        },
    },
    apis: ['./routes/*.js'],
};
  
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); 
  
const yamlSpec = yaml.dump(swaggerSpec);
fs.writeFileSync('swagger.yaml', yamlSpec);

app.get("/", (req, res) => {res.render("index");});

app.listen(port, () => {console.log(`Server running on port ${port}.`);});