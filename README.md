# Batch Flow API Backend

Để chạy backend nhận request từ `/api/batch-flow`:


```bash
cd server
node batchFlowApi.cjs
```

Server sẽ chạy ở port 3001 (hoặc PORT bạn đặt). Frontend có thể gửi POST tới `http://localhost:3001/api/batch-flow`.
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1uEArLK_VJYhK2LHFObLKmvfbqWH_lIRw

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
