# Shopify Announcement Banner App

A modern Shopify embedded app that lets merchants set a live announcement banner on their storefront using **React + Node.js + MongoDB + Shopify Metafields**.

---

##  What It Does

- Merchant types an announcement (e.g. "Sale 50% Off!") in the app dashboard
- Clicks **Save & Sync**
- The announcement is:
  - Saved to **MongoDB** (audit history)
  - Synced to **Shopify Shop Metafields** via GraphQL Admin API
  - Displayed live on the **storefront** via a Theme App Extension

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Shopify Polaris + App Bridge |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Shopify | GraphQL Admin API + Theme App Extension |
| Deployment | Render |

---

## Project Structure


announcement-appp/
├── web/
│   ├── index.js               # Express backend server
│   ├── shopify.js             # Shopify app config
│   ├── backend/
│   │   └── db/
│   │       └── mongo.js       # MongoDB connection + schema
│   └── frontend/
│       └── pages/
│           └── index.jsx      # React dashboard UI
├── extensions/
│   └── announcement-baner/
│       └── blocks/            # Theme App Extension liquid file
├── shopify.app.toml           # Shopify app configuration
└── .env                       # Environment variables (local only)


---

##  Environment Variables

Create a `.env` file in the `/web` folder:

```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-render-url.onrender.com
SCOPES=write_products
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development
```

For production (Render), set these in **Render → Environment** panel.

---

##  How to Run Locally

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Shopify Partner account
- Shopify CLI installed (`npm install -g @shopify/cli`)

### Steps

**1. Clone the repo**
```bash
git clone https://github.com/YOUR-USERNAME/announcement-appp.git
cd announcement-appp
```

**2. Install dependencies**
```bash
npm install
cd web && npm install
cd web/frontend && npm install
```

**3. Set up environment variables**
```bash
cp .env.example .env
# Fill in your values
```

**4. Run the app locally**
```bash
npm run dev
```

This starts the app with a Shopify CLI tunnel and opens it in your dev store.

**5. Enable the Theme App Extension**
- Go to your store Admin → Online Store → Themes → Customize
- Click **App Embeds** in the left sidebar
- Toggle **Floating Announcement** ON
- Click Save

---

## 🚢 Deployment (Render)

1. Push code to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repo
4. Set **Build Command:** `cd web && npm install && cd frontend && npm install && npm run build`
5. Set **Start Command:** `cd web && npm run serve`
6. Add all environment variables in Render → Environment
7. Deploy!

**Live URL:** `https://shopify-announcement-app-c5dh.onrender.com`

---

## Install on Your Store

Visit this URL (replace with your store domain):

```
https://shopify-announcement-app-c5dh.onrender.com/api/auth?shop=YOUR-STORE.myshopify.com
```

---

## How It Works

```
Merchant types announcement
        ↓
React frontend (Polaris UI)
        ↓
POST /api/announcement (Express backend)
        ↓
  ┌─────────────────────────────┐
  │  Save to MongoDB (audit)    │
  │  Sync to Shopify Metafield  │
  └─────────────────────────────┘
        ↓
Theme App Extension reads metafield
        ↓
Banner appears live on storefront 
```

---

## Key Modifications Made

This app was built following Shopify's modern development ecosystem with these custom modifications:

- Fixed `dotenv` loading for production vs development environments
- Added `apiKey`, `apiSecretKey`, and `hostName` to `shopify.js` config (missing from template)
- Fetched real Shop GID dynamically via GraphQL before setting metafields
- Used `AnnouncementAudit.create()` for full audit history in MongoDB
- Added startup validation for required environment variables
- Cleaned up `shopify.app.toml` by removing invalid metafield declarations

---

## Screenshots



---

## Author

Built by **Priya Shandilya**  
[GitHub](https://github.com/PriyaShandilya)