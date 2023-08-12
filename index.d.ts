/// <reference types="node" />

import { EventEmitter } from 'events';

declare module "steam-inventory" {
  import type SteamID from "steamid";
  import { Request } from "request";

  /**
   * @param err `null` on success, an `Error` object on failure.
   */
  type Callback = (err: CallbackError) => any;
  type CallbackError = (Error & { [key: string]: any }) | null;
  type assetid = number | string;
  type userid = SteamID | string;
  type appid = number;
  type contextid = number;

  interface Http {
    /**
     * All arguments are optional, but you need one of uri and options. If uri isn't provided, then either options.uri or options.url must be defined with the request URI.
     * The options object will be passed to the request module (if provided). If you don't specify a method in options, then it will default to GET.
     *
     * @param uri Optional. A string containing the request URI.
     * @param options Optional. An object containing request options (this object will be passed to the request module).
     * @param callback Optional. Called when the request completes.
     * @param source Optional (but highly encouraged). A string which is passed to hooks as the source value.
     * @param args
     */
    httpRequest(uri?: string, options?: any, callback?: Callback, source?: string, ...args: any[]): void;

    /**
     * Convenience method which performs a GET request.
     * @param args
     */
    httpRequestGet(...args: any[]): any;

    /**
     * Convenience method which performs a POST request.
     * @param args
     */
    httpRequestPost(...args: any[]): any;
  }

  interface Options {
    /**
     * An instance of {@link https://www.npmjs.com/package/request|request} v2.x.x which will be used by `SteamInventory` for its HTTP requests.
     * SteamInventory` will create its own if omitted.
     */
    request: Request;

    /**
     * The time in milliseconds that `SteamInventory` will wait for HTTP requests to complete.
     * Defaults to `50000` (50 seconds). Overrides any `timeout` option that was set on the passed-in `request` object.
     */
    timeout: number;

    /**
     * The user-agent value that `SteamInventory` will use for its HTTP requests. Defaults to Chrome v47's user-agent.
     * Overrides any `headers['User-Agent']` option that was set on the passed-in `request` object.
     */
    userAgent: string;

    /** The local IP address that `SteamInventory` will use for its HTTP requests. Overrides an `localAddress` option that was set on the passed-in `request` object. */
    localAddress: string;
  }

  interface CEconItemDescription {
    type: string;
    value?: string;
    color?: string;
    app_data?: string;
  }

  interface CEconItemAction {
    link?: string;
    name?: string;
  }

  interface Tag {
    internal_name: string;
    name: string;
    category: string;
    color: string;
    category_name: string;
  }

  class CEconItem {
    /** The item's unique ID within its app+context. */
    id: string;

    /** The item's unique ID within its app+context. */
    assetid: string;

    /** The ID of the context within the app in which the item resides. */
    contextid: string;
    currencyid: string;

    /** The ID of the app which owns the item. */
    appid: number;

    /** The first half of the item cache identifier. The classid is enough to get you basic details about the item. */
    classid: string;

    /** The second half of the item cache identifier. */
    instanceid: string;

    /** How much of this item is in this stack. */
    amount: number;

    /**
     * The item's position within the inventory (starting at 1). Not defined if this item wasn't retrieved directly
     * from an inventory (e.g. from a trade offer or inventory history).
     */
    pos: number;

    /** The item's display name. */
    name: string;

    market_fee_app: number;

    /** The item's universal market name. This identifies the item's market listing page. */
    market_hash_name: string;

    /** The render color of the item's name, in hexadecimal. */
    name_color: string;

    /** The displayed background color, in hexadecimal. */
    background_color: string;

    /** The "type" that's shown under the game name to the right of the game icon. */
    type: string;

    /** `true` if the item can be traded, `false` if not. */
    tradable: boolean;

    /** `true` if the item can be listed on the Steam Community Market, `false` if not. */
    marketable: boolean;

    /** `true` if, on the Steam Community Market, this item will use buy orders. `false` if not. */
    commodity: boolean;

    /** How many days for which the item will be untradable after being sold on the market. */
    market_tradable_restriction: number;

    /** How many days for which the item will be unmarketable after being sold on the market. */
    market_marketable_restriction: number;

    /** An array of objects containing information about the item. Displayed under the item's `type`. */
    descriptions: CEconItemDescription[];
    owner_descriptions: CEconItemDescription[];
    actions: CEconItemAction[];
    owner_actions: CEconItemAction[];
    market_actions: any[];

    /**
     * An array of strings containing "fraud warnings" about the item. In inventories and trades, items with fraud
     * warnings have a red (!) symbol, and fraud warnings are displayed in red under the item's name.
     */
    fraudwarnings: string[];

    /** An array of objects containing the item's inventory tags. */
    tags: Tag[];

    /** Not always present. An object containing arbitrary data as reported by the game's item server. */
    app_data?: any;

    /**
     * Returns a URL where this item's image can be downloaded. You can optionally append a size as such:
     *
     * ```js
     * var url = item.getImageURL() + '128x128';
     * ```
     */
    getImageURL(): string;

    /** Returns a URL where this item's image can be downloaded. */
    getLargeImageURL(): string;

    /**
     * Returns a specific tag from the item, or `null` if it doesn't exist.
     *
     * @param category - A string containing the tag's category (the `category` property of the tag object).
     */
    getTag(category: string): Tag | null;
  }

  export default class SteamInventory extends EventEmitter {
    steamID: SteamID;

    constructor(options?: Options);

    /**
     * Get the contents of a user's inventory context.
     * @param userID - The user's SteamID as a SteamID object or a string which can parse into one
     * @param appID - The Steam application ID of the game for which you want an inventory
     * @param contextID - The ID of the "context" within the game you want to retrieve
     * @param tradableOnly - true to get only tradable items and currencies
     * @param language - The language of item descriptions to return. Omit for default (which may either be English or your account's chosen language)
     * @param callback
     */
    getUserInventoryContents(
      userID: userid,
      appID: appid,
      contextID: contextid,
      tradableOnly: boolean,
      language: string,
      callback: (err: Error | null, inventory: CEconItem[], currencies: CEconItem[]) => void
    ): any;

    /**
     * Get the contents of a user's inventory context.
     * @param userID - The user's SteamID as a SteamID object or a string which can parse into one
     * @param appID - The Steam application ID of the game for which you want an inventory
     * @param contextID - The ID of the "context" within the game you want to retrieve
     * @param tradableOnly - true to get only tradable items and currencies
     * @param callback
     */
    getUserInventoryContents(
      userID: userid,
      appID: appid,
      contextID: contextid,
      tradableOnly: boolean,
      callback: (err: Error | null, inventory: CEconItem[], currencies: CEconItem[]) => void
    ): any;

    /**
     * Get the contents of a user's inventory context.
     * @param apiKey - The steam web api key
     * @param userID - The user's SteamID as a SteamID object or a string which can parse into one
     * @param appID - The Steam application ID of the game for which you want an inventory
     * @param contextID - The ID of the "context" within the game you want to retrieve
     * @param tradableOnly - true to get only tradable items and currencies
     * @param language - The language of item descriptions to return. Omit for default (which may either be English or your account's chosen language)
     * @param callback
     */
    getInventoryItemsWithDescriptions(
      apiKey: string,
      userID: userid,
      appID: appid,
      contextID: contextid,
      tradableOnly: boolean,
      language,
      callback: (err: Error | null, inventory: CEconItem[], currencies: CEconItem[]) => void
    ): any;

    /**
     * Get the contents of a user's inventory context.
     * @param apiKey - The steam web api key
     * @param userID - The user's SteamID as a SteamID object or a string which can parse into one
     * @param appID - The Steam application ID of the game for which you want an inventory
     * @param contextID - The ID of the "context" within the game you want to retrieve
     * @param tradableOnly - true to get only tradable items and currencies
     * @param callback
     */
    getInventoryItemsWithDescriptions(
      apiKey: string,
      userID: userid,
      appID: appid,
      contextID: contextid,
      tradableOnly: boolean,
      callback: (err: Error | null, inventory: CEconItem[], currencies: CEconItem[]) => void
    ): any;

    /**
     * Get the contents of a user's inventory context.
     * @param apiKey - The steamapis apikey
     * @param userID - The user's SteamID as a SteamID object or a string which can parse into one
     * @param appID - The Steam application ID of the game for which you want an inventory
     * @param contextID - The ID of the "context" within the game you want to retrieve
     * @param tradableOnly - true to get only tradable items and currencies
     * @param language - The language of item descriptions to return. Omit for default (which may either be English or your account's chosen language)
     * @param callback
     */
    getUserInventorySteamApis(
      apiKey: string,
      userID: userid,
      appID: appid,
      contextID: contextid,
      tradableOnly: boolean,
      language: string,
      callback: (err: Error | null, inventory: CEconItem[], currencies: CEconItem[]) => void
    ): any;

    /**
     * Get the contents of a user's inventory context.
     * @param apiKey - The steamapis apikey
     * @param userID - The user's SteamID as a SteamID object or a string which can parse into one
     * @param appID - The Steam application ID of the game for which you want an inventory
     * @param contextID - The ID of the "context" within the game you want to retrieve
     * @param tradableOnly - true to get only tradable items and currencies
     * @param callback
     */
    getUserInventorySteamApis(
      apiKey: string,
      userID: userid,
      appID: appid,
      contextID: contextid,
      tradableOnly: boolean,
      callback: (err: Error | null, inventory: CEconItem[], currencies: CEconItem[]) => void
    ): any;

    /**
     * Get the contents of a user's inventory context.
     * @param apiKey - The steam.supply apikey
     * @param userID - The user's SteamID as a SteamID object or a string which can parse into one
     * @param appID - The Steam application ID of the game for which you want an inventory
     * @param contextID - The ID of the "context" within the game you want to retrieve
     * @param tradableOnly - true to get only tradable items and currencies
     * @param language - The language of item descriptions to return. Omit for default (which may either be English or your account's chosen language)
     * @param callback
     */
    getUserInventorySteamSupply(
      apiKey: string,
      userID: userid,
      appID: appid,
      contextID: contextid,
      tradableOnly: boolean,
      language: string,
      callback: (err: Error | null, inventory: CEconItem[], currencies: CEconItem[]) => void
    ): any;

    /**
     * Get the contents of a user's inventory context.
     * @param apiKey - The steam.supply apikey
     * @param userID - The user's SteamID as a SteamID object or a string which can parse into one
     * @param appID - The Steam application ID of the game for which you want an inventory
     * @param contextID - The ID of the "context" within the game you want to retrieve
     * @param tradableOnly - true to get only tradable items and currencies
     * @param callback
     */
    getUserInventorySteamSupply(
      apiKey: string,
      userID: userid,
      appID: appid,
      contextID: contextid,
      tradableOnly: boolean,
      callback: (err: Error | null, inventory: CEconItem[], currencies: CEconItem[]) => void
    ): any;

    /**
     * Get the contents of a user's inventory context.
     * @param apiKey - The rapid service apikey
     * @param userID - The user's SteamID as a SteamID object or a string which can parse into one
     * @param appID - The Steam application ID of the game for which you want an inventory
     * @param contextID - The ID of the "context" within the game you want to retrieve
     * @param tradableOnly - true to get only tradable items and currencies
     * @param callback
     */
    getUserInventoryRapid(
      apiKey: string,
      userID: userid,
      appID: appid,
      contextID: contextid,
      tradableOnly: boolean,
      callback: (err: Error | null, inventory: CEconItem[], currencies: CEconItem[]) => void
    ): any;
  }
}
