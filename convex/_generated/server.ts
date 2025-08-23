/* eslint-disable */
/**
 * Generated utilities for implementing server-side Convex query and mutation functions.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import {
  ActionBuilder,
  MutationBuilder,
  QueryBuilder,
  DatabaseReader,
  DatabaseWriter,
  ScheduledDeleteBuilder,
} from "convex/server";
import type { DataModel } from "./dataModel.js";

/**
 * Define a query in this Convex app's public API.
 *
 * This function will be allowed to read your Convex database and will be accessible from the client.
 *
 * @param func - The query function. It receives a `DatabaseReader` as a first argument.
 * @returns The wrapped query. Include this as an `export` to add it to your app's API.
 */
export declare const query: QueryBuilder<DataModel, "public">;

/**
 * Define a mutation in this Convex app's public API.
 *
 * This function will be allowed to modify your Convex database and will be accessible from the client.
 *
 * @param func - The mutation function. It receives a `DatabaseWriter` as a first argument.
 * @returns The wrapped mutation. Include this as an `export` to add it to your app's API.
 */
export declare const mutation: MutationBuilder<DataModel, "public">;

/**
 * Define an action in this Convex app's public API.
 *
 * An action can call third-party services and is automatically retried when possible.
 *
 * @param func - The action function.
 * @returns The wrapped action. Include this as an `export` to add it to your app's API.
 */
export declare const action: ActionBuilder<DataModel, "public">;

/**
 * Define an internal query in this Convex app.
 *
 * An internal query can be called from other Convex functions but is not accessible from the client.
 *
 * @param func - The query function. It receives a `DatabaseReader` as a first argument.
 * @returns The wrapped query. Include this as an `export` to add it to your app's API.
 */
export declare const internalQuery: QueryBuilder<DataModel, "internal">;

/**
 * Define an internal mutation in this Convex app.
 *
 * An internal mutation can be called from other Convex functions but is not accessible from the client.
 *
 * @param func - The mutation function. It receives a `DatabaseWriter` as a first argument.
 * @returns The wrapped mutation. Include this as an `export` to add it to your app's API.
 */
export declare const internalMutation: MutationBuilder<DataModel, "internal">;

/**
 * Define an internal action in this Convex app.
 *
 * An internal action can be called from other Convex functions but is not accessible from the client.
 *
 * @param func - The action function.
 * @returns The wrapped action. Include this as an `export` to add it to your app's API.
 */
export declare const internalAction: ActionBuilder<DataModel, "internal">;