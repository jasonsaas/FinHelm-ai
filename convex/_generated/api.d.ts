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
import type * as accountActions from "../accountActions.js";
import type * as agentActions from "../agentActions.js";
import type * as finHelmTest from "../finHelmTest.js";
import type * as finHelmTestSimple from "../finHelmTestSimple.js";
import type * as sampleData from "../sampleData.js";
import type * as syncActions from "../syncActions.js";
import type * as transactionActions from "../transactionActions.js";
import type * as userActions from "../userActions.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accountActions: typeof accountActions;
  agentActions: typeof agentActions;
  finHelmTest: typeof finHelmTest;
  finHelmTestSimple: typeof finHelmTestSimple;
  sampleData: typeof sampleData;
  syncActions: typeof syncActions;
  transactionActions: typeof transactionActions;
  userActions: typeof userActions;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
