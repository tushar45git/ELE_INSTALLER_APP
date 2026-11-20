/**
 * Camera mapping history: the `vehiclelogs_v2` collection in the polling
 * database. This replaces the SQL boothhistory + ChangeCamera tables.
 *
 * Same format the web portal writes: one document per location
 * (`vehicleNo` = location name) with a `history` array of entries:
 *   { deviceId, action, source, performedBy,
 *     details: { district, assembly, driverName, driverMobile, locationType,
 *                districtCode, psnum, ipAddress },
 *     timestamp, _id }
 */

const mongoose = require("mongoose");
const { getPollingModels } = require("../models/polling");

/** Append one history entry for a location. */
async function append(e, session) {
  if (!e.location) return;
  const { VehicleLog } = getPollingModels();
  await VehicleLog.updateOne(
    { vehicleNo: e.location },
    {
      $push: {
        history: {
          _id: new mongoose.Types.ObjectId(),
          deviceId: e.deviceId,
          action: e.action,
          source: e.source,
          performedBy: e.performedBy || "",
          details: {
            district: e.district || "",
            assembly: e.acname || "",
            driverName: e.operatorName || "",
            driverMobile: e.operatorNumber || "",
            locationType: e.locationType || "",
            districtCode: e.districtAssemblyCode || "",
            psnum: e.psNum || "",
            ipAddress: e.ipAddress || "",
          },
          timestamp: new Date(),
        },
      },
    },
    { upsert: true, session },
  );
}

/**
 * History for a location, newest first, in the row shape the History modal
 * uses. The newest entry is the active one (isdelete 0); older ones are 1.
 */
async function listByLocation(location, boothId) {
  if (!location) return [];
  const { VehicleLog } = getPollingModels();
  const doc = await VehicleLog.findOne({ vehicleNo: location }).lean();
  const entries = (doc?.history || []).slice().reverse();
  return entries.map((h, i) => {
    const d = h.details || {};
    const type = String(d.locationType || "").toLowerCase();
    return {
      id: String(h._id || i),
      boothid: boothId,
      streamid: h.deviceId,
      streamname: h.deviceId,
      district: d.district,
      accode: d.districtCode,
      acname: d.assembly,
      PSNum: d.psnum,
      location,
      cameralocationtype:
        type === "outdoor" ? "Outside" : type === "indoor" ? "Inside" : d.locationType,
      Action: h.action,
      addedBy: h.performedBy,
      updatedBy: h.performedBy,
      updatedFrom: h.source,
      updatedDate: h.timestamp,
      AddDatetime: h.timestamp,
      IPAddress: d.ipAddress,
      isdelete: i === 0 ? 0 : 1,
    };
  });
}

module.exports = { append, listByLocation };
