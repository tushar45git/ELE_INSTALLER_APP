/**
 * Camera mappings: the `camera` collection in the polling database (this was
 * the SQL `booth` table).
 *
 * One document = one camera (deviceId) installed at one location:
 *   { deviceId, districtAssemblyCode, name, locations[], psnum,
 *     location_Type: "indoor" | "outdoor", operatorId, Date, ... }
 *
 * District / assembly names are not stored on the camera. They come from the
 * `district` collection through `districtAssemblyCode`.
 *
 * Reads return rows in the same shape the SQL version returned (id, streamid,
 * streamname, district, accode, acname, PSNum, location, cameralocationtype,
 * operatorName, ...), so the controllers and the frontend are unchanged.
 */

const mongoose = require("mongoose");
const { getPollingModels } = require("../models/polling");
const { escapeRegex } = require("./streamlistRepository");
const {
  SORTABLE_COLUMNS,
  DEFAULT_SORT_COLUMN,
  DEFAULT_SORT_ORDER,
} = require("../constants/cameraMapping");

// App uses "Inside"/"Outside"; the polling DB stores "indoor"/"outdoor".
const toDbLocationType = (t) =>
  t === "Outside" ? "outdoor" : t === "Inside" ? "indoor" : String(t || "").toLowerCase();

const toObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id)) ? new mongoose.Types.ObjectId(String(id)) : null;

/** Aggregation stages that turn a camera document into an API row. */
const ROW_STAGES = [
  {
    $lookup: {
      from: "district",
      localField: "districtAssemblyCode",
      foreignField: "districtAssemblyCode",
      as: "d",
    },
  },
  {
    $lookup: {
      from: "operator_infos",
      localField: "operatorId",
      foreignField: "operatorId",
      as: "o",
    },
  },
  {
    $addFields: {
      d: { $arrayElemAt: ["$d", 0] },
      o: { $arrayElemAt: ["$o", 0] },
    },
  },
  {
    $project: {
      _id: 0,
      _sortId: "$_id",
      id: { $toString: "$_id" },
      streamid: "$deviceId",
      streamname: "$deviceId",
      operatorid: "$operatorId",
      operatorName: "$o.name",
      operatorNumber: "$o.mobile",
      operatorDesignation: { $ifNull: ["$o.designation", ""] },
      district: "$d.dist_name",
      accode: "$d.accode",
      acname: "$d.accName",
      districtAssemblyCode: 1,
      PSNum: "$psnum",
      location: { $ifNull: ["$name", { $arrayElemAt: ["$locations", 0] }] },
      cameralocationtype: {
        $switch: {
          branches: [
            { case: { $eq: ["$location_Type", "outdoor"] }, then: "Outside" },
            { case: { $eq: ["$location_Type", "indoor"] }, then: "Inside" },
          ],
          default: "$location_Type",
        },
      },
      IsOutsideBooth: { $eq: ["$location_Type", "outdoor"] },
      longitude: { $ifNull: ["$longitude", 0] },
      latitude: { $ifNull: ["$latitude", 0] },
      addedBy: 1,
      AddDatetime: "$Date",
      updatedBy: 1,
      updatedDate: 1,
      updatedFrom: 1,
    },
  },
];

const stripSort = (row) => {
  if (row) delete row._sortId;
  return row;
};

async function findOneRow(match, sort = { _id: -1 }) {
  const { Camera } = getPollingModels();
  const [row] = await Camera.aggregate([
    { $match: match },
    { $sort: sort },
    { $limit: 1 },
    ...ROW_STAGES,
  ]);
  return stripSort(row) ?? null;
}

// ── district / assembly lookups (district collection) ───────────────────────

/** District row for a (district name, assembly name) pair, or null. */
async function findDistrictRow({ district, acname }) {
  const { District } = getPollingModels();
  const filter = { accName: acname };
  if (district) filter.dist_name = district;
  return District.findOne(filter).lean();
}

/** All districtAssemblyCodes matching the optional district / assembly filters. */
async function codesFor({ district = "", acname = "" } = {}) {
  const { District } = getPollingModels();
  const filter = {};
  if (district) filter.dist_name = district;
  if (acname) filter.accName = acname;
  return District.distinct("districtAssemblyCode", filter);
}

async function distinctDistricts() {
  const { District } = getPollingModels();
  const list = await District.distinct("dist_name", { dist_name: { $nin: [null, ""] } });
  return list.sort((a, b) => String(a).localeCompare(String(b)));
}

/** Assemblies (optionally for one district) as [{ acname, accode }]. */
async function distinctAssemblies(district = "") {
  const { District } = getPollingModels();
  const filter = { accName: { $nin: [null, ""] } };
  if (district) filter.dist_name = district;
  const rows = await District.find(filter, { accName: 1, accode: 1 }).lean();
  return rows
    .map((r) => ({ acname: r.accName, accode: r.accode }))
    .sort((a, b) => Number(a.accode) - Number(b.accode) || a.acname.localeCompare(b.acname));
}

/** PS numbers already used by cameras, optionally for a district / assembly. */
async function distinctPsNumbers({ district = "", acname = "" } = {}) {
  const { Camera } = getPollingModels();
  const filter = { psnum: { $nin: [null, ""] } };
  if (district || acname) filter.districtAssemblyCode = { $in: await codesFor({ district, acname }) };
  return Camera.distinct("psnum", filter);
}

// ── camera mapping reads ────────────────────────────────────────────────────

/** Another mapping already using this camera (excluding `excludeId`), or null. */
async function findDuplicateByStream({ streamId, excludeId }) {
  const match = { deviceId: streamId };
  const ex = excludeId ? toObjectId(excludeId) : null;
  if (ex) match._id = { $ne: ex };
  return findOneRow(match, { _id: 1 });
}

async function findById(id) {
  const oid = toObjectId(id);
  if (!oid) return null;
  return findOneRow({ _id: oid });
}

/** Latest mapping for a camera (deviceId), or null when it is not mapped. */
async function findByStreamId(deviceId) {
  return findOneRow({ deviceId });
}

/**
 * Another mapping at the same location slot: assembly + PS number + camera
 * location type, plus the location text when given. Excludes `excludeId`.
 */
async function findByLocationSlot({ acname, psNum, cameraLocationType, location, excludeId }) {
  const match = {
    districtAssemblyCode: { $in: await codesFor({ acname }) },
    psnum: psNum,
    location_Type: toDbLocationType(cameraLocationType),
  };
  if (location !== undefined && location !== null) match.name = location;
  const ex = excludeId ? toObjectId(excludeId) : null;
  if (ex) match._id = { $ne: ex };
  return findOneRow(match);
}

/** Most-used location text for an (assembly, PS number) pair, or null. */
async function getLocationForSlot({ acname, psNum }) {
  const { Camera } = getPollingModels();
  const base = String(psNum ?? "").replace(/-O$/i, "");
  const [top] = await Camera.aggregate([
    {
      $match: {
        districtAssemblyCode: { $in: await codesFor({ acname }) },
        psnum: { $regex: `^${escapeRegex(base)}(-O)?$`, $options: "i" },
        name: { $nin: [null, ""] },
      },
    },
    { $group: { _id: "$name", cnt: { $sum: 1 } } },
    { $sort: { cnt: -1 } },
    { $limit: 1 },
  ]);
  return top ? top._id : null;
}

/** Paginated / filtered / sorted list for the Camera Mapping page. */
async function list(params) {
  const { Camera } = getPollingModels();
  const {
    search = "",
    district = "",
    assembly = "",
    camera = "",
    offset = 0,
    limit = 10,
    sortBy,
    sortOrder,
  } = params;

  const match = {};
  if (district) match.district = district;
  if (assembly) match.acname = assembly;
  if (camera) match.streamname = { $regex: escapeRegex(camera), $options: "i" };
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: "i" };
    match.$or = ["streamname", "location", "district", "acname", "PSNum", "operatorName"].map(
      (f) => ({ [f]: rx }),
    );
  }

  const sortField = SORTABLE_COLUMNS[sortBy] || DEFAULT_SORT_COLUMN;
  const dir =
    String(sortOrder || DEFAULT_SORT_ORDER).toUpperCase() === "ASC" ? 1 : -1;
  const sort = sortField === "_sortId" ? { _sortId: dir } : { [sortField]: dir, _sortId: -1 };

  const [res] = await Camera.aggregate([
    ...ROW_STAGES,
    { $match: match },
    { $sort: sort },
    {
      $facet: {
        rows: [{ $skip: offset }, { $limit: limit }],
        total: [{ $count: "n" }],
      },
    },
  ]);

  return {
    rows: (res?.rows || []).map(stripSort),
    total: res?.total?.[0]?.n || 0,
  };
}

// ── camera mapping writes ───────────────────────────────────────────────────

/** Fields written to the camera document for a mapping. */
function mappingFields(d) {
  return {
    deviceId: d.streamId,
    districtAssemblyCode: d.districtAssemblyCode,
    name: d.location,
    locations: [d.location],
    psnum: d.psNum,
    location_Type: toDbLocationType(d.cameraLocationType),
    operatorId: d.operatorId,
  };
}

/** Insert a new mapping. Returns the new id (string). */
async function insert(d, session) {
  const { Camera } = getPollingModels();
  const now = new Date();
  const [doc] = await Camera.create(
    [
      {
        ...mappingFields(d),
        Date: now,
        connectedOnceFlag: false,
        isp2p: 1,
        sharedWith: [],
        addedBy: d.userName,
        updatedBy: d.userName,
        updatedDate: now,
        updatedFrom: d.addedFrom,
      },
    ],
    { session },
  );
  return String(doc._id);
}

/** Update an existing mapping. */
async function update(id, d, session) {
  const { Camera } = getPollingModels();
  await Camera.updateOne(
    { _id: toObjectId(id) },
    {
      $set: {
        ...mappingFields(d),
        updatedBy: d.userName,
        updatedDate: new Date(),
        updatedFrom: d.updatedFrom,
      },
    },
    { session },
  );
}

/** Move a different camera (deviceId) onto an existing mapping (swap flows). */
async function updateStream(id, deviceId, meta, session) {
  const { Camera } = getPollingModels();
  await Camera.updateOne(
    { _id: toObjectId(id) },
    {
      $set: {
        deviceId,
        updatedBy: meta.userName,
        updatedDate: new Date(),
        updatedFrom: meta.updatedFrom,
      },
    },
    { session },
  );
}

/** Delete a mapping. The camera document is removed, as the portal does. */
async function remove(id, session) {
  const { Camera } = getPollingModels();
  await Camera.deleteOne({ _id: toObjectId(id) }, { session });
}

module.exports = {
  findDistrictRow,
  distinctDistricts,
  distinctAssemblies,
  distinctPsNumbers,
  findDuplicateByStream,
  findById,
  findByStreamId,
  findByLocationSlot,
  getLocationForSlot,
  list,
  insert,
  update,
  updateStream,
  remove,
};
