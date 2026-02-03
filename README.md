# LearnLink React Workspace

A rebuilt LearnLink front end powered by React, Vite, and Tailwind CSS. This single-page experience covers the full flow from authentication to flashcards, AI generation, quizzes, and admin moderation.

## Getting started

```bash
npm install

# Start both Frontend and Backend concurrently
npm run dev
```

- API: http://localhost:4000 (configurable via `PORT` in `.env`)
- Web client: http://localhost:5173 (configurable via Vite)

### Key scripts

- `npm run dev` – start Vite with hot reload.
- `npm run build` – create a production build.
- `npm run preview` – preview the production build locally.
- `npm run server` – launch the Express/MongoDB API.

## Environment variables

Create a `.env` in the project root (already ignored by git) with values similar to:

```
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=super-secret
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your-google-gemini-key
```

Only variables prefixed with `VITE_` are exposed to the browser; everything else stays on the server.

## Feature map

- `/auth` – combined sign-in/sign-up screen that keeps tokens in `sessionStorage`.
- `/dashboard` – recent flashcard sets and quizzes with quick search suggestions.
- `/flashcards` – manage sets, duplicate, delete, or jump into study mode.
- `/flashcards/new` – full React flashcard builder (supports duplication or editing via query params).
- `/flashcards/:id` – interactive card viewer with keyboard navigation and shuffle.
- `/materials` – upload PDFs/notes and organize them into color-coded class folders.
- `/rag/search` – retrieve top-k chunks from indexed materials using Atlas Vector Search.
- `/rag/answer` – answer questions grounded in retrieved chunks (RAG).
- `/ai-flashcards` – call the `/ai/flashcards` endpoint to draft study cards.
- `/quizzes` – create multiple‑choice quizzes and manage existing ones.
- `/quizzes/:id/play` – lightweight quiz player that scores client side.
- `/admin` – admin-only search and moderation tools (delete sets/cards/quizzes).

## Styling & components

- Tailwind utility classes with shared component layers defined in `src/index.css` (`.card`, `.btn`, `.input`, etc.).
- Sidebar-driven layout (`src/components/Layout.jsx`) with role-aware navigation.
- Auth state and API headers handled via `AuthContext` and `src/lib/api.js`.

## RAG (Atlas Vector Search)

### Create the Vector Search index (Atlas UI)
1. Open your Atlas cluster → **Search Indexes** → **Create Search Index**.
2. Choose **Vector Search** and select the `materialchunks` collection.
3. Paste the **definition only** (Atlas UI expects just this JSON):

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    { "type": "filter", "path": "user" },
    { "type": "filter", "path": "material" },
    { "type": "filter", "path": "className" }
  ]
}
```

4. Name the index `material_chunks_vector_index` (this must match the server code).

### Notes
- Atlas UI **does not** accept the full `{ name, type, definition }` object; that format is for code/CLI creation.
- If you change embedding dimensions, update both the index and the server config.

## Next steps

- Hook up advanced admin editing or real-time socket events if your backend exposes them.
- Add optimistic updates or react-query SWR if you want richer data handling.
- Configure deployment (e.g., Netlify/Vercel) by pointing to Vite’s `dist` output after running `npm run build`.
- `/ai-flashcards` – call the `/ai/flashcards` endpoint to draft study cards (falls back to mock data if no AI key).
