const SteamID = require("steamid");
const CEconItem = require("../classes/CEconItem.js");
const SteamInventory = require("../index.js");

/**
 * Get the contents of a user's inventory context.
 * @param {SteamID|string} userID - The user's SteamID as a SteamID object or a string which can parse into one
 * @param {int} appID - The Steam application ID of the game for which you want an inventory
 * @param {int} contextID - The ID of the "context" within the game you want to retrieve
 * @param {boolean} tradableOnly - true to get only tradable items and currencies
 * @param {string} [language] - The language of item descriptions to return. Omit for default (which may either be English or your account's chosen language)
 * @param {function} callback
 */
SteamInventory.prototype.getUserInventoryContents = function (
  userID,
  appID,
  contextID,
  tradableOnly,
  language,
  callback
) {
  if (typeof language === "function") {
    callback = language;
    language = "english";
  }

  if (!userID) {
    callback(new Error("The user's SteamID is invalid or missing."));
    return;
  }

  var self = this;

  if (typeof userID === "string") {
    userID = new SteamID(userID);
  }

  var pos = 1;
  get([], []);

  function get(inventory, currency, start) {
    self.httpRequest(
      {
        uri: "https://steamcommunity.com/inventory/" + userID.getSteamID64() + "/" + appID + "/" + contextID,
        headers: {
          Referer: "https://steamcommunity.com/profiles/" + userID.getSteamID64() + "/inventory",
        },
        qs: {
          l: language,
          count: 2000,
          start_assetid: start,
        },
        json: true,
      },
      function (err, response, body) {
        if (err) {
          if (err.message == "HTTP error 403" && body === null) {
            if (self.steamID && userID.getSteamID64() == self.steamID.getSteamID64()) {
              self._notifySessionExpired(err);
            }

            callback(new Error("This profile is private."));
            return;
          }

          if (err.message == "HTTP error 500" && body && body.error) {
            err = new Error(body.error);

            var match = body.error.match(/^(.+) \((\d+)\)$/);
            if (match) {
              err.message = match[1];
              err.eresult = match[2];
              callback(err);
              return;
            }
          }

          callback(err);
          return;
        }

        if (body && body.success && body.total_inventory_count === 0) {
          callback(null, [], [], 0);
          return;
        }

        if (!body || !body.success || !body.assets || !body.descriptions) {
          if (body) {
            callback(new Error(body.error || body.Error || "Malformed response"));
          } else {
            callback(new Error("Malformed response"));
          }

          return;
        }

        for (var i = 0; i < body.assets.length; i++) {
          var description = getDescription(body.descriptions, body.assets[i].classid, body.assets[i].instanceid);

          if (!tradableOnly || (description && description.tradable)) {
            body.assets[i].pos = pos++;
            (body.assets[i].currencyid ? currency : inventory).push(
              new CEconItem(body.assets[i], description, contextID)
            );
          }
        }

        if (body.more_items) {
          get(inventory, currency, body.last_assetid);
        } else {
          callback(null, inventory, currency, body.total_inventory_count);
        }
      },
      "steamcommunity"
    );
  }

  var quickDescriptionLookup = {};

  function getDescription(descriptions, classID, instanceID) {
    var key = classID + "_" + (instanceID || "0");

    if (quickDescriptionLookup[key]) {
      return quickDescriptionLookup[key];
    }

    for (var i = 0; i < descriptions.length; i++) {
      quickDescriptionLookup[descriptions[i].classid + "_" + (descriptions[i].instanceid || "0")] = descriptions[i];
    }

    return quickDescriptionLookup[key];
  }
};

/**
 * Get the contents of a user's inventory context.
 * @param {string} apiKey - The steam web api key
 * @param {SteamID|string} userID - The user's SteamID as a SteamID object or a string which can parse into one
 * @param {int} appID - The Steam application ID of the game for which you want an inventory
 * @param {int} contextID - The ID of the "context" within the game you want to retrieve
 * @param {boolean} tradableOnly - true to get only tradable items and currencies
 * @param {string} [language] - The language of item descriptions to return. Omit for default (which may either be English or your account's chosen language)
 * @param {function} callback
 */
SteamInventory.prototype.getInventoryItemsWithDescriptions = function (
  apiKey,
  userID,
  appID,
  contextID,
  tradableOnly,
  language,
  callback
) {
  if (typeof language === "function") {
    callback = language;
    language = "english";
  }

  if (!userID) {
    callback(new Error("The user's SteamID is invalid or missing."));
    return;
  }

  if (!apiKey) {
    callback(new Error("The apiKey is missing."));
    return;
  }

  var self = this;

  if (typeof userID === "string") {
    userID = new SteamID(userID);
  }

  var pos = 1;
  get([], []);

  function get(inventory, currency, start) {
    self.httpRequest(
      {
        uri: "https://api.steampowered.com/IEconService/GetInventoryItemsWithDescriptions/v1",
        qs: {
          key: apiKey,
          appid: appID,
          contextid: contextID,
          steamid: userID.getSteamID64(),
          language: language,
          start_assetid: start,
          get_descriptions: true,
        },
        json: true,
      },
      function (err, response, body) {
        if (err) {
          if (response.statusCode == 403) {
            callback(new Error("Invalid API key"));
            return;
          }

          callback(err);
          return;
        }

        if (body && body.response.total_inventory_count === 0) {
          callback(null, [], [], 0);
          return;
        }

        if (!body || !body.response.assets || !body.response.descriptions) {
          if (body) {
            callback(new Error(body.error || body.Error || "Malformed response"));
          } else {
            callback(new Error("Malformed response"));
          }

          return;
        }

        for (var i = 0; i < body.response.assets.length; i++) {
          var description = getDescription(
            body.response.descriptions,
            body.response.assets[i].classid,
            body.response.assets[i].instanceid
          );

          if (!tradableOnly || (description && description.tradable)) {
            body.response.assets[i].pos = pos++;
            (body.response.assets[i].currencyid ? currency : inventory).push(
              new CEconItem(body.response.assets[i], description, contextID)
            );
          }
        }

        if (body.response.more_items) {
          get(inventory, currency, body.response.last_assetid);
        } else {
          callback(null, inventory, currency, body.response.total_inventory_count);
        }
      },
      "steamcommunity"
    );
  }

  var quickDescriptionLookup = {};

  function getDescription(descriptions, classID, instanceID) {
    var key = classID + "_" + (instanceID || "0");

    if (quickDescriptionLookup[key]) {
      return quickDescriptionLookup[key];
    }

    for (var i = 0; i < descriptions.length; i++) {
      quickDescriptionLookup[descriptions[i].classid + "_" + (descriptions[i].instanceid || "0")] = descriptions[i];
    }

    return quickDescriptionLookup[key];
  }
};

/**
 * Get the contents of a user's inventory context.
 * @param {string} apiKey - The steamapis apikey
 * @param {SteamID|string} userID - The user's SteamID as a SteamID object or a string which can parse into one
 * @param {int} appID - The Steam application ID of the game for which you want an inventory
 * @param {int} contextID - The ID of the "context" within the game you want to retrieve
 * @param {boolean} tradableOnly - true to get only tradable items and currencies
 * @param {string} [language] - The language of item descriptions to return. Omit for default (which may either be English or your account's chosen language)
 * @param {function} callback
 */
SteamInventory.prototype.getUserInventorySteamApis = function (
  apiKey,
  userID,
  appID,
  contextID,
  tradableOnly,
  language,
  callback
) {
  if (typeof language === "function") {
    callback = language;
    language = "english";
  }

  if (!userID) {
    callback(new Error("The user's SteamID is invalid or missing."));
    return;
  }

  if (!apiKey) {
    callback(new Error("The apiKey is missing."));
    return;
  }

  var self = this;

  if (typeof userID === "string") {
    userID = new SteamID(userID);
  }

  var pos = 1;
  get([], []);

  function get(inventory, currency, start, retries = 5) {
    self.httpRequest(
      {
        uri: `https://api.steamapis.com/steam/inventory/${userID.getSteamID64()}/${appID}/${contextID}`,
        qs: {
          api_key: apiKey,
          l: language,
          count: 2000,
          start_assetid: start,
        },
        json: true,
      },
      function (err, response, body) {
        if (err) {
          if (
            err.message == "HTTP error 404" ||
            (body && body.error == "Could not retrieve user inventory. Please try again later.")
          ) {
            if (retries > 0) {
              get(inventory, currency, start, retries - 1);
              return;
            }
          }

          if (err.message == "HTTP error 403") {
            callback(new Error("This profile is private."));
            return;
          }

          if (body && body.error) {
            callback(new Error(body.error));
            return;
          }

          callback(err);
          return;
        }

        if (body && body.success && body.total_inventory_count === 0) {
          callback(null, [], [], 0);
          return;
        }

        if (!body || !body.success || !body.assets || !body.descriptions) {
          if (body) {
            callback(new Error(body.error || body.Error || "Malformed response"));
          } else {
            callback(new Error("Malformed response"));
          }

          return;
        }

        for (var i = 0; i < body.assets.length; i++) {
          var description = getDescription(body.descriptions, body.assets[i].classid, body.assets[i].instanceid);

          if (!tradableOnly || (description && description.tradable)) {
            body.assets[i].pos = pos++;
            (body.assets[i].currencyid ? currency : inventory).push(
              new CEconItem(body.assets[i], description, contextID)
            );
          }
        }

        if (body.more_items) {
          get(inventory, currency, body.last_assetid);
        } else {
          callback(null, inventory, currency, body.total_inventory_count);
        }
      },
      "steamcommunity"
    );
  }

  var quickDescriptionLookup = {};

  function getDescription(descriptions, classID, instanceID) {
    var key = classID + "_" + (instanceID || "0");

    if (quickDescriptionLookup[key]) {
      return quickDescriptionLookup[key];
    }

    for (var i = 0; i < descriptions.length; i++) {
      quickDescriptionLookup[descriptions[i].classid + "_" + (descriptions[i].instanceid || "0")] = descriptions[i];
    }

    return quickDescriptionLookup[key];
  }
};

/**
 * Get the contents of a user's inventory context.
 * @param {string} apiKey - The steamsupply apikey
 * @param {SteamID|string} userID - The user's SteamID as a SteamID object or a string which can parse into one
 * @param {int} appID - The Steam application ID of the game for which you want an inventory
 * @param {int} contextID - The ID of the "context" within the game you want to retrieve
 * @param {boolean} tradableOnly - true to get only tradable items and currencies
 * @param {string} [language] - The language of item descriptions to return. Omit for default (which may either be English or your account's chosen language)
 * @param {function} callback
 */
SteamInventory.prototype.getUserInventorySteamSupply = function (
  apiKey,
  userID,
  appID,
  contextID,
  tradableOnly,
  language,
  callback
) {
  if (typeof language === "function") {
    callback = language;
    language = "english";
  }

  if (!userID) {
    callback(new Error("The user's SteamID is invalid or missing."));
    return;
  }

  if (!apiKey) {
    callback(new Error("The apiKey is missing."));
    return;
  }

  var self = this;

  if (typeof userID === "string") {
    userID = new SteamID(userID);
  }

  var pos = 1;
  get([], []);

  function get(inventory, currency, start, retries = 5) {
    self.httpRequest(
      {
        uri: `https://steam.supply/API/${apiKey}/loadinventory`,
        qs: {
          l: language,
          steamid: userID.getSteamID64(),
          appid: appID,
          contextid: contextID,
          count: 5000,
          start_assetid: start,
        },
        json: true,
      },
      function (err, response, body) {
        if (err) {
          if (err.message == "HTTP error 500") {
            if (retries > 0) {
              get(inventory, currency, start, retries - 1);
              return;
            }
          }

          if (err.message == "HTTP error 403") {
            if (response.body && response.body.includes("Invalid API key")) {
              callback(new Error("Invalid API key"));
              return;
            }

            if (response.body && response.body.includes("Inventory Private")) {
              callback(new Error("This profile is private."));
              return;
            }
          }

          if (response && response.body) {
            callback(new Error(response.body));
            return;
          }

          callback(err);
          return;
        }

        if (typeof response.body != "object" || response.body.fake_redirect) {
          if (retries > 0) {
            get(inventory, currency, start, retries - 1);
            return;
          }
        }

        if (body && body.success && body.total_inventory_count === 0) {
          callback(null, [], [], 0);
          return;
        }

        if (!body || !body.success || !body.assets || !body.descriptions) {
          if (body) {
            callback(new Error(body.error || body.Error || "Malformed response"));
          } else {
            callback(new Error("Malformed response"));
          }

          return;
        }

        for (var i = 0; i < body.assets.length; i++) {
          var description = getDescription(body.descriptions, body.assets[i].classid, body.assets[i].instanceid);

          if (!tradableOnly || (description && description.tradable)) {
            body.assets[i].pos = pos++;
            (body.assets[i].currencyid ? currency : inventory).push(
              new CEconItem(body.assets[i], description, contextID)
            );
          }
        }

        if (body.more_items) {
          get(inventory, currency, body.last_assetid);
        } else {
          callback(null, inventory, currency, body.total_inventory_count);
        }
      },
      "steamcommunity"
    );
  }

  var quickDescriptionLookup = {};

  function getDescription(descriptions, classID, instanceID) {
    var key = classID + "_" + (instanceID || "0");

    if (quickDescriptionLookup[key]) {
      return quickDescriptionLookup[key];
    }

    for (var i = 0; i < descriptions.length; i++) {
      quickDescriptionLookup[descriptions[i].classid + "_" + (descriptions[i].instanceid || "0")] = descriptions[i];
    }

    return quickDescriptionLookup[key];
  }
};

/**
 * Get the contents of a user's inventory context.
 * @param {string} apiKey - The rapid service apikey
 * @param {SteamID|string} userID - The user's SteamID as a SteamID object or a string which can parse into one
 * @param {int} appID - The Steam application ID of the game for which you want an inventory
 * @param {int} contextID - The ID of the "context" within the game you want to retrieve
 * @param {boolean} tradableOnly - true to get only tradable items and currencies
 * @param {string} [language] - The language of item descriptions to return. Omit for default (which may either be English or your account's chosen language)
 * @param {function} callback
 */
SteamInventory.prototype.getUserInventoryRapid = function (
  apiKey,
  userID,
  appID,
  contextID,
  tradableOnly,
  language,
  callback
) {
  if (typeof language === "function") {
    callback = language;
    language = "english";
  }

  if (!userID) {
    callback(new Error("The user's SteamID is invalid or missing."));
    return;
  }

  if (!apiKey) {
    callback(new Error("The apiKey is missing."));
    return;
  }

  var self = this;

  if (typeof userID === "string") {
    userID = new SteamID(userID);
  }

  var pos = 1;
  get([], []);

  function get(inventory, currency, start, retries = 10) {
    self.httpRequest(
      {
        uri: `https://steamdata1.p.rapidapi.com/inventory/${userID.getSteamID64()}/${appID}/${contextID}`,
        qs: {
          l: language,
          count: 5000,
          start_assetid: start,
        },
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "steamdata1.p.rapidapi.com",
        },
        json: true,
      },
      function (err, response, body) {
        if (err) {
          if (
            (response.statusCode == 429 && body == null) ||
            (response.statusCode == 504 && body && body.info.includes("took too long to respond")) ||
            (body && body.error == "Could not retrieve user inventory. Please try again later.")
          ) {
            if (retries > 0) {
              get(inventory, currency, start, retries - 1);
              return;
            }
          }

          if (body && body.message == "Forbidden") {
            callback(new Error("Forbidden"));
            return;
          }

          if (err.message == "HTTP error 403") {
            callback(new Error("This profile is private."));
            return;
          }

          if (body && body.error) {
            callback(new Error(body.error || body));
            return;
          }

          callback(err);
          return;
        }

        if (body && body.success && body.total_inventory_count === 0) {
          callback(null, [], [], 0);
          return;
        }

        if (!body || !body.success || !body.assets || !body.descriptions) {
          if (body) {
            callback(new Error(body.error || body.Error || "Malformed response"));
          } else {
            callback(new Error("Malformed response"));
          }

          return;
        }

        for (var i = 0; i < body.assets.length; i++) {
          var description = getDescription(body.descriptions, body.assets[i].classid, body.assets[i].instanceid);

          if (!tradableOnly || (description && description.tradable)) {
            body.assets[i].pos = pos++;
            (body.assets[i].currencyid ? currency : inventory).push(
              new CEconItem(body.assets[i], description, contextID)
            );
          }
        }

        if (body.more_items) {
          get(inventory, currency, body.last_assetid);
        } else {
          callback(null, inventory, currency, body.total_inventory_count);
        }
      },
      "steamcommunity"
    );
  }

  var quickDescriptionLookup = {};

  function getDescription(descriptions, classID, instanceID) {
    var key = classID + "_" + (instanceID || "0");

    if (quickDescriptionLookup[key]) {
      return quickDescriptionLookup[key];
    }

    for (var i = 0; i < descriptions.length; i++) {
      quickDescriptionLookup[descriptions[i].classid + "_" + (descriptions[i].instanceid || "0")] = descriptions[i];
    }

    return quickDescriptionLookup[key];
  }
};
