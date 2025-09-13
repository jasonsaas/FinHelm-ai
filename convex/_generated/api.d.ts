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
import type * as ai_agentExecutor from "../ai/agentExecutor.js";
import type * as ai_seedAgents from "../ai/seedAgents.js";
import type * as bills from "../bills.js";
import type * as companies_queries from "../companies/queries.js";
import type * as companies from "../companies.js";
import type * as dataReconciliation from "../dataReconciliation.js";
import type * as finHelmTest from "../finHelmTest.js";
import type * as functions_executeAgent from "../functions/executeAgent.js";
import type * as http from "../http.js";
import type * as quickbooks_api from "../quickbooks/api.js";
import type * as quickbooks_apiClient from "../quickbooks/apiClient.js";
import type * as quickbooks_auth from "../quickbooks/auth.js";
import type * as quickbooks_dataSync from "../quickbooks/dataSync.js";
import type * as quickbooks_dataSyncExtended from "../quickbooks/dataSyncExtended.js";
import type * as quickbooks_index from "../quickbooks/index.js";
import type * as quickbooks_n8nMutations from "../quickbooks/n8nMutations.js";
import type * as quickbooks_n8nWebhook from "../quickbooks/n8nWebhook.js";
import type * as quickbooks_oauth from "../quickbooks/oauth.js";
import type * as quickbooks_test from "../quickbooks/test.js";
import type * as quickbooks_tokenManager from "../quickbooks/tokenManager.js";
import type * as quickbooks_tokenManagerV2 from "../quickbooks/tokenManagerV2.js";
import type * as quickbooks_webhooks from "../quickbooks/webhooks.js";
import type * as quickbooks from "../quickbooks.js";
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
  "ai/agentExecutor": typeof ai_agentExecutor;
  "ai/seedAgents": typeof ai_seedAgents;
  bills: typeof bills;
  "companies/queries": typeof companies_queries;
  companies: typeof companies;
  dataReconciliation: typeof dataReconciliation;
  finHelmTest: typeof finHelmTest;
  "functions/executeAgent": typeof functions_executeAgent;
  http: typeof http;
  "quickbooks/api": typeof quickbooks_api;
  "quickbooks/apiClient": typeof quickbooks_apiClient;
  "quickbooks/auth": typeof quickbooks_auth;
  "quickbooks/dataSync": typeof quickbooks_dataSync;
  "quickbooks/dataSyncExtended": typeof quickbooks_dataSyncExtended;
  "quickbooks/index": typeof quickbooks_index;
  "quickbooks/n8nMutations": typeof quickbooks_n8nMutations;
  "quickbooks/n8nWebhook": typeof quickbooks_n8nWebhook;
  "quickbooks/oauth": typeof quickbooks_oauth;
  "quickbooks/test": typeof quickbooks_test;
  "quickbooks/tokenManager": typeof quickbooks_tokenManager;
  "quickbooks/tokenManagerV2": typeof quickbooks_tokenManagerV2;
  "quickbooks/webhooks": typeof quickbooks_webhooks;
  quickbooks: typeof quickbooks;
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
