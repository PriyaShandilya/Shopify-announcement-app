// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

// ✅ Fix 1: Only load .env locally, not in production
if (process.env.NODE_ENV !== "production") {
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ path: join(process.cwd(), "..", ".env") });
}

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import { connectDB, AnnouncementAudit } from "./backend/db/mongo.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// ✅ Fix 2: Shopify auth & webhook routes (must be before any body parsing)
app.get(shopify.config.auth.path, shopify.auth.begin());

app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// ✅ Fix 3: Body parsing AFTER webhook route
app.use(express.json());

// ✅ Fix 4: Validate authenticated session for all /api routes
app.use("/api/*", shopify.validateAuthenticatedSession());

// ──────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────

// 1. GET Products Count
app.get("/api/products/count", async (_req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const countData = await client.request(`
      query shopifyProductCount {
        productsCount {
          count
        }
      }
    `);

    res.status(200).send({ count: countData.data.productsCount.count });
  } catch (err) {
    console.error("Failed to fetch product count:", err);
    res.status(500).send({ success: false, error: err.message });
  }
});

// 2. POST Create Products
app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.error(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }

  res.status(status).send({ success: status === 200, error });
});

// 3. POST Save Announcement & Sync to Shopify Metafields
app.post("/api/announcement", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ success: false, error: "Announcement text is required." });
    }

    // Connect to MongoDB
    await connectDB();

    // Save/update in MongoDB
// Creates a NEW record every time — keeps all history
await AnnouncementAudit.create({
  shop: session.shop,
  announcementText: text,
  createdAt: new Date()
});

    // Step 1: Fetch real Shop GID
    const client = new shopify.api.clients.Graphql({ session });

    const shopResponse = await client.request(`
      query {
        shop {
          id
        }
      }
    `);

    const shopId = shopResponse.data?.shop?.id;

    if (!shopId) {
      return res.status(500).json({ success: false, error: "Could not fetch shop ID from Shopify." });
    }

    // Step 2: Set metafield using real shopId
    const graphqlQuery = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const graphqlVariables = {
      metafields: [
        {
          namespace: "my_app",
          key: "announcement",
          type: "single_line_text_field",
          value: text,
          ownerId: shopId,
        },
      ],
    };

    const response = await client.request(graphqlQuery, {
      variables: graphqlVariables,
    });

    const userErrors = response.data?.metafieldsSet?.userErrors;

    if (userErrors && userErrors.length > 0) {
      console.error("Metafield userErrors:", userErrors);
      return res.status(400).json({ success: false, errors: userErrors });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Shopify Sync Error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ──────────────────────────────────────────────
// FRONTEND SERVING
// ──────────────────────────────────────────────

// ✅ Fix 5: CSP headers before static files
app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

// ✅ Fix 6: ensureInstalledOnShop catches direct browser access without ?shop=
app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

// ──────────────────────────────────────────────
// START SERVER
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Backend server listening on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});