import express from 'express';
import axios from 'axios';
import { buildAiPrompt } from '../services/aiPrompt.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const userInput = req.body.message;
    const prompt = buildAiPrompt(userInput);

    try {
        const response = await axios.post('http://localhost:1234/v1/completions', {
            model: 'local-model',
            prompt,
            max_tokens: 200,
            temperature: 0.8,
            stop: ["User:"]
        });

        const reply = response.data.choices[0].text.trim();
        res.json({ reply });
    } catch (err) {
        console.error("Ai error:", err.message);
        res.status(500).send("Ai-chan error");
    }
});

export default router;
