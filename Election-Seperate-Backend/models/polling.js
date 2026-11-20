/**
 * Models for the "polling" database. These collections are shared with the
 * web portal, so schemas are non-strict: fields the portal writes are kept
 * untouched and nothing is renamed.
 *
 *   stream         camera master    { deviceId, "server name", mediaUrl, ... }
 *   camera         camera mapping   { deviceId, districtAssemblyCode, name,
 *                                     locations[], psnum, location_Type, operatorId }
 *   district       district list    { dist_name, accode, accName, districtAssemblyCode }
 *   operator_infos operators        { operatorId, name, mobile, Srno }
 *   vehiclelogs_v2 history          { vehicleNo (= location name), history[] }
 *
 * NOTE: camera has a 2dsphere index on `location`, so the location *text* is
 * stored in `name` / `locations`, never in `location`.
 */

const mongoose = require("mongoose");
const { getPollingConnection } = require("../config/pollingDatabase");

const loose = (collection) =>
  new mongoose.Schema({}, { strict: false, collection, versionKey: false });

let models = null;

function getPollingModels() {
  if (models) return models;
  const conn = getPollingConnection();
  models = {
    Stream: conn.model("PollingStream", loose("stream")),
    Camera: conn.model("PollingCamera", loose("camera")),
    District: conn.model("PollingDistrict", loose("district")),
    Operator: conn.model("PollingOperator", loose("operator_infos")),
    VehicleLog: conn.model("PollingVehicleLog", loose("vehiclelogs_v2")),
  };
  return models;
}

module.exports = { getPollingModels };
