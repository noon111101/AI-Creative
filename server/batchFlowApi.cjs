require('dotenv').config();
const fetch = require('node-fetch');

// Hàm gọi Google Labs API để generate ảnh
async function generateVeo3ImageNode(payload, googleToken) {
  const url = 'https://aisandbox-pa.googleapis.com/v1/projects/95f518c7-51a3-4b42-a44a-c8e62538fdeb/flowMedia:batchGenerateImages';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'authorization': `Bearer ${googleToken}`,
      'content-type': 'text/plain;charset=UTF-8',
      'origin': 'https://labs.google',
      'referer': 'https://labs.google/',
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Veo3 image generation failed: ${txt}`);
  }
  return await response.json();
}

// Hàm fetch kết quả ảnh từ Google Labs
async function fetchVeo3ImageResultNode(mediaGenerationId, googleToken) {
  let url = `https://aisandbox-pa.googleapis.com/v1/media/${mediaGenerationId}`;
  url += `?key=AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY&clientContext.tool=PINHOLE`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': '*/*',
      'authorization': `Bearer ${googleToken}`,
      'origin': 'https://labs.google',
      'referer': 'https://labs.google/',
    }
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Veo3 image fetch failed: ${txt}`);
  }
  return await response.json();
}
// Simple Express backend for /api/batch-flow (CommonJS)
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

// Dummy batch-flow endpoint
app.post('/api/batch-flow', async (req, res) => {
  const { rows } = req.body;
  console.log(`[${new Date().toISOString()}] Batch request received:`, Array.isArray(rows) ? rows.length : 'invalid payload');
  if (!Array.isArray(rows)) {
    console.error('Payload missing rows array');
    return res.status(400).json({ error: 'Missing rows array in payload' });
  }

  const googleToken = process.env.VITE_GOOGLE_LABS_TOKEN || process.env.GOOGLE_LABS_TOKEN;
  if (!googleToken) {
    console.error('Missing Google Labs token in env');
    return res.status(500).json({ error: 'Missing Google Labs token in env' });
  }

  const results = await Promise.all(rows.map(async (row, idx) => {
    const startTime = Date.now();
    if (!row.imagePrompt || !row.referenceImageId) {
      console.warn(`[${new Date().toISOString()}] Row ${idx} missing imagePrompt or referenceImageId`);
      return {
        index: idx,
        status: 'error',
        error: 'Missing imagePrompt or referenceImageId',
      };
    }
    try {
      // Chuẩn bị payload generate ảnh từ mediaId đã upload
      if (!row.referenceImageId || !row.imagePrompt) {
        throw new Error('Missing referenceImageId or imagePrompt in row');
      }
      const payload = {
        imagePrompt: row.imagePrompt,
        referenceImageId: row.referenceImageId
      };
      console.log(`[${new Date().toISOString()}] [Row ${idx}] Sending generate request to Google Labs...`);
      const genRes = await generateVeo3ImageNode(payload, googleToken);
      console.log(`[${new Date().toISOString()}] [Row ${idx}] Google Labs response:`, JSON.stringify(genRes));
      const mediaGenerationId = genRes?.mediaGenerationId?.mediaGenerationId || genRes?.imageResult?.mediaId;
      if (!mediaGenerationId) {
        console.error(`[${new Date().toISOString()}] [Row ${idx}] No mediaGenerationId returned`);
        throw new Error('No mediaGenerationId returned');
      }
      console.log(`[${new Date().toISOString()}] [Row ${idx}] Fetching result for mediaGenerationId: ${mediaGenerationId}`);
      const resultRes = await fetchVeo3ImageResultNode(mediaGenerationId, googleToken);
      console.log(`[${new Date().toISOString()}] [Row ${idx}] Result response:`, JSON.stringify(resultRes));
      const fifeUrl = resultRes?.userUploadedImage?.fifeUrl || resultRes?.media?.[0]?.image?.generatedImage?.fifeUrl;
      const endTime = Date.now();
      console.log(`[${new Date().toISOString()}] [Row ${idx}] Done. Time: ${(endTime - startTime) / 1000}s`);
      return {
        index: idx,
        status: 'success',
        type: 'image',
        imagePrompt: row.imagePrompt,
        referenceImageId: row.referenceImageId,
        videoPrompt: row.videoPrompt || '',
        mediaId: mediaGenerationId,
        url: fifeUrl || '',
      };
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [Row ${idx}] Error:`, err);
      return {
        index: idx,
        status: 'error',
        error: err.message || 'Unknown error',
      };
    }
  }));

  console.log(`[${new Date().toISOString()}] Batch request finished.`);
  res.json({ status: 'ok', results });
});

app.listen(PORT, () => {
  console.log(`Batch Flow API running on port ${PORT}`);
});
