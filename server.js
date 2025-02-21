const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());

const API_TOKEN = "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";
const API_URL = "https://api-inference.huggingface.co/models/ContactDoctor/Bio-Medical-Llama-3-8B-CoT-012025";

app.post('/query', async (req, res) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: "[INST]" + req.body.text + "[/INST]",
                options: { 
                    wait_for_model: true,
                    max_new_tokens: 1000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(process.env.PORT || 3000);
