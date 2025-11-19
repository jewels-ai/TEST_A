TryMyGold — Option B (Auto-load from Cloudinary folder)

What this provides:
- A static client (index.html, style.css, script.js) that requests image lists from a small server.
- An Express server (server.js) that uses the Cloudinary Admin API to list images inside a folder prefix.
- A simple API: GET /api/resources/:folder  (folder example: trymygold/diamond_earrings)
- No client-side Cloudinary secret. Server holds API secret in environment variables.

Setup (local):
1. Install Node.js (14+)
2. Create a project folder, unzip these files.
3. In project root, run:
   npm install

4. Create a .env file with:
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   PORT=3000

5. Start server:
   npm start

6. Open the static site (index.html) via a static host or from same domain. If serving from a different origin, ensure CORS is allowed (the server has CORS enabled).

Use:
- Upload images to Cloudinary into folder prefixes like:
  trymygold/diamond_earrings
  trymygold/gold_earrings
  trymygold/diamond_necklaces
  trymygold/gold_necklaces

- Then in the web UI choose:
  EARRINGS -> Gold (this triggers client to call /api/resources/gold_earrings)

Deploy to Render / Heroku:
- Set environment variables in the platform dashboard (CLOUDINARY_*).
- Deploy server.js as a Node service.
- Host the client as static files (same domain or different — CORS enabled).

Security note:
- Keep CLOUDINARY_API_SECRET private on the server. Do NOT embed in client-side code.
