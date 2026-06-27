import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";

// 🌟 ADD THIS SPECIFIC PATH IMPORT RIGHT HERE 🌟
import { join } from "path"; 
import fs from "fs";
import dotenv from "dotenv";

// Look for .env in the current folder, if not found, look one level up
const localEnv = join(process.cwd(), ".env");
const parentEnv = join(process.cwd(), "..", ".env");

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else {
  dotenv.config({ path: parentEnv });
}
const DB_PATH = `${process.cwd()}/database.sqlite`;

const billingConfig = {
  "My Shopify One-Time Charge": {
    amount: 5.0,
    currencyCode: "USD",
    interval: BillingInterval.OneTime,
  },
};

const shopify = shopifyApp({
  api: {
    apiVersion: LATEST_API_VERSION,
    restResources,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    // Increased to 5 minutes (300 seconds) to completely override the system time drift
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