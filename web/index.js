// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import dotenv from "dotenv";
dotenv.config({ path: join(process.cwd(), "..", ".env") });

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

// Set up Shopify authentication and webhook handling
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

// Middleware configurations
app.use("/api/*", shopify.validateAuthenticatedSession());
app.use(express.json());

// 1. GET Products Count Route
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

// 2. POST Products Creation Route
app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

// 3. POST Save Announcement & Sync Metafields
app.post("/api/announcement", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { text } = req.body;

    // Connect to MongoDB
    await connectDB();

    // Save to MongoDB
    await AnnouncementAudit.findOneAndUpdate(
      { shop: session.shop },
      { announcementText: text, updatedAt: new Date() },
      { upsert: true }
    );

    // ✅ Step 1: Fetch the real numeric Shop GID
    const client = new shopify.api.clients.Graphql({ session });

    const shopResponse = await client.request(`
      query {
        shop {
          id
        }
      }
    `);

    const shopId = shopResponse.data.shop.id; // ✅ "gid://shopify/Shop/12345678"

    // ✅ Step 2: Use real shopId in metafields mutation
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
          ownerId: shopId  // ✅ Correct: "gid://shopify/Shop/12345678"
        }
      ]
    };

    const response = await client.request(graphqlQuery, { variables: graphqlVariables });

    if (response.data?.metafieldsSet?.userErrors?.length > 0) {
      return res.status(400).json({ errors: response.data.metafieldsSet.userErrors });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Shopify Sync Error Details:", err);
    res.status(500).json({ 
      success: false, 
      error: err instanceof Error ? err.message : String(err) 
    });
  }
});

// Serve frontend assets cleanly
app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

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

app.listen(PORT, () => {
  console.log(`Backend server successfully listening on port ${PORT}`);
});