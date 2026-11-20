/**
 * Camera master: the `stream` collection in the polling database.
 *
 * A camera is identified by its `deviceId`. The rest of the app still uses the
 * old SQL names `streamId` / `streamname`; for the Mongo data both are simply
 * the deviceId.
 */

const { getPollingModels } = require("../models/polling");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toCamera = (doc) =>
  doc ? { id: doc.deviceId, streamname: doc.deviceId, deviceid: doc.deviceId } : null;

/**
 * Full deviceId for what the user typed: an exact match first; otherwise, if
 * exactly ONE camera's deviceId contains the text (e.g. "405510" ->
 * "ATPL-405510-ARCIS"), that one. Returns null when none or several match.
 */
async function resolveDeviceId(term) {
  const t = String(term || "").trim();
  if (!t) return null;
  const { Stream } = getPollingModels();
  if (await Stream.exists({ deviceId: t })) return t;
  const ids = await Stream.distinct("deviceId", {
    deviceId: { $regex: escapeRegex(t), $options: "i" },
  });
  return ids.length === 1 ? ids[0] : null;
}

/** The camera's stream name (its deviceId), or null if it does not exist. */
async function getStreamName(deviceId) {
  const { Stream } = getPollingModels();
  const doc = await Stream.findOne({ deviceId }, { deviceId: 1 }).lean();
  return doc ? doc.deviceId : null;
}

/** True if the camera exists in the stream collection. */
async function existsById(deviceId) {
  if (!deviceId) return false;
  const { Stream } = getPollingModels();
  return Boolean(await Stream.exists({ deviceId }));
}

/** Resolve one camera (full or unique partial deviceId) -> { id, streamname, deviceid } or null. */
async function findByDeviceOrName(term) {
  const deviceId = await resolveDeviceId(term);
  if (!deviceId) return null;
  const { Stream } = getPollingModels();
  const doc = await Stream.findOne({ deviceId }, { deviceId: 1 })
    .sort({ _id: -1 })
    .lean();
  return toCamera(doc);
}

/** Autocomplete search for the camera picker (deviceId contains `term`). */
async function search({ term = "", limit = 25 } = {}) {
  const { Stream } = getPollingModels();
  const filter = term
    ? { deviceId: { $regex: escapeRegex(term), $options: "i" } }
    : {};
  const docs = await Stream.find(filter, { deviceId: 1 })
    .sort({ deviceId: 1 })
    .limit(limit)
    .lean();
  return docs.map(toCamera);
}

/** Full stream document for a device (full or unique partial deviceId), or null. */
async function findStream(term) {
  const deviceId = await resolveDeviceId(term);
  if (!deviceId) return null;
  const { Stream } = getPollingModels();
  return Stream.findOne({ deviceId }).sort({ _id: -1 }).lean();
}

/** Device ids matching `term` (case-insensitive), for the device search box. */
async function searchDeviceIds(term, { limit, sortDesc = false } = {}) {
  const { Stream } = getPollingModels();
  let q = Stream.find(
    { deviceId: { $regex: escapeRegex(term), $options: "i" } },
    { deviceId: 1 },
  ).sort({ deviceId: sortDesc ? -1 : 1 });
  if (limit) q = q.limit(limit);
  const docs = await q.lean();
  return [...new Set(docs.map((d) => d.deviceId))];
}

module.exports = {
  resolveDeviceId,
  getStreamName,
  existsById,
  findByDeviceOrName,
  search,
  findStream,
  searchDeviceIds,
  escapeRegex,
};
