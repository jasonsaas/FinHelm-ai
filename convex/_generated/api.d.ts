/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accounts from "../accounts.js";
import type * as companies from "../companies.js";
import type * as dataReconciliation from "../dataReconciliation.js";
import type * as http from "../http.js";
import type * as quickbooks_api from "../quickbooks/api.js";
import type * as quickbooks_apiClient from "../quickbooks/apiClient.js";
import type * as quickbooks_auth from "../quickbooks/auth.js";
import type * as quickbooks_index from "../quickbooks/index.js";
import type * as quickbooks_oauth from "../quickbooks/oauth.js";
import type * as quickbooks_test from "../quickbooks/test.js";
import type * as quickbooks_tokenManager from "../quickbooks/tokenManager.js";
import type * as quickbooks_tokenManagerV2 from "../quickbooks/tokenManagerV2.js";
import type * as quickbooks_webhooks from "../quickbooks/webhooks.js";
import type * as sampleData from "../sampleData.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  companies: typeof companies;
  dataReconciliation: typeof dataReconciliation;
  http: typeof http;
  "quickbooks/api": typeof quickbooks_api;
  "quickbooks/apiClient": typeof quickbooks_apiClient;
  "quickbooks/auth": typeof quickbooks_auth;
  "quickbooks/index": typeof quickbooks_index;
  "quickbooks/oauth": typeof quickbooks_oauth;
  "quickbooks/test": typeof quickbooks_test;
  "quickbooks/tokenManager": typeof quickbooks_tokenManager;
  "quickbooks/tokenManagerV2": typeof quickbooks_tokenManagerV2;
  "quickbooks/webhooks": typeof quickbooks_webhooks;
  sampleData: typeof sampleData;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
