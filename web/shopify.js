import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import { restResources } from "@shopify/shopify-api/rest/admin/2025-07";
import { join } from "path";
import fs from "fs";
import dotenv from "dotenv";

// ✅ Load .env only in development
if (process.env.NODE_ENV !== "production") {
  const localEnv = join(process.cwd(), ".env");
  const parentEnv = join(process.cwd(), "..", ".env");

  if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    dotenv.config({ path: parentEnv });
  }
}

// ✅ Validate required env vars at startup
const requiredEnvVars = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_APP_URL",
];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(
      `❌ Missing required environment variable: ${key}. Please set it in Render → Environment.`
    );
  }
}

const DB_PATH = `${process.cwd()}/database.sqlite`;

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,           // ✅ Required
    apiSecretKey: process.env.SHOPIFY_API_SECRET,  // ✅ Required
    scopes: (process.env.SCOPES || "write_products").split(","),
    hostName: process.env.SHOPIFY_APP_URL.replace(/https?:\/\//, ""), // ✅ e.g. shopify-announcement-app-c5dh.onrender.com
    hostScheme: "https",
    apiVersion: LATEST_API_VERSION,
    restResources,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    allowedClockSkew: 300,
    billing: undefined,
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new SQLiteSessionStorage(DB_PATH),
});

export default shopify;