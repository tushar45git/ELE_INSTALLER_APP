/**
 * Camera Mapping service: business rules for adding, editing, deleting and
 * swapping camera mappings. Data lives in the "polling" MongoDB:
 *   stream (cameras), camera (mappings), district (district/assembly list),
 *   operator_infos (operators), vehiclelogs_v2 (history).
 *
 * Rules:
 *   • Duplicate camera check BEFORE any write:
 *       - new mapping -> error "AddExist" (blocked)
 *       - editing     -> error "DupDID"   (blocked, frontend offers swap)
 *   • District + assembly must exist in the `district` collection; the camera
 *     stores its districtAssemblyCode.
 *   • Operator is found or created (operatorService).
 *   • Multi-document writes run in one MongoDB transaction.
 *   • Every write appends a history entry to vehiclelogs_v2.
 *
 * Ids: a mapping id is the camera document's _id (string); `streamId` is the
 * camera's deviceId.
 */

const ErrorHander = require("../utils/errorhander");
const { withPollingTransaction } = require("../config/pollingDatabase");
const C = require("../constants/cameraMapping");

const boothRepository = require("../repositories/boothRepository");
const historyRepository = require("../repositories/boothHistoryRepository");
const streamlistRepository = require("../repositories/streamlistRepository");
const operatorService = require("./operatorService");

// ── helpers ──────────────────────────────────────────────────────────────────

const str = (v) => String(v ?? "").trim();

/** Build the "already mapped" message from the conflicting mapping row. */
function duplicateMessage(row, offerSwap) {
  const base =
    `This camera is already mapped with District: ${row.district || ""}` +
    ` Assembly: ${row.acname || ""} PsNo:${row.PSNum || ""}` +
    ` Location:${row.location || ""}`;
  return offerSwap ? `${base} IF you want to swap Then Click on OK` : base;
}

/**
 * Normalise the validated payload. The PS number is stored without the old
 * SQL "-O" suffix; Inside/Outside is kept in location_Type instead.
 */
function toMapping(input) {
  return {
    streamId: str(input.streamId),
    district: str(input.district),
    accode: str(input.accode),
    acname: str(input.acname),
    psNum: str(input.psNum).replace(/-O$/i, ""),
    location: str(input.location),
    cameraLocationType: input.cameraLocationType,
  };
}

/** Attach districtAssemblyCode from the `district` collection (400 if unknown). */
async function withDistrictCode(mapping) {
  const row = await boothRepository.findDistrictRow({
    district: mapping.district,
    acname: mapping.acname,
  });
  if (!row)
    throw new ErrorHander(
      `District "${mapping.district}" / Assembly "${mapping.acname}" not found in the district list`,
      400,
    );
  return {
    ...mapping,
    accode: row.accode ?? mapping.accode,
    districtAssemblyCode: row.districtAssemblyCode,
  };
}

/** One history entry for a mapping row or mapping payload. */
function historyEntry(m, { deviceId, action, ctx, operator }) {
  return {
    location: m.location,
    deviceId,
    action,
    source: C.PAGE_NAME,
    performedBy: ctx.userName,
    ipAddress: ctx.ipAddress,
    district: m.district,
    acname: m.acname,
    psNum: m.psNum ?? m.PSNum,
    locationType: m.cameraLocationType ?? m.cameralocationtype,
    districtAssemblyCode: m.districtAssemblyCode,
    operatorName: operator?.name ?? m.operatorName,
    operatorNumber: operator?.number ?? m.operatorNumber,
  };
}

// ── reads ────────────────────────────────────────────────────────────────────

async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || C.DEFAULT_PAGE, 1);
  const rawLimit = parseInt(query.limit, 10) || C.DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(rawLimit, 1), C.MAX_PAGE_SIZE);
  const offset = (page - 1) * limit;

  const { rows, total } = await boothRepository.list({
    search: str(query.search),
    district: str(query.district),
    assembly: str(query.assembly),
    camera: str(query.camera),
    offset,
    limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  return {
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(id) {
  const row = await boothRepository.findById(id);
  if (!row) throw new ErrorHander("Camera mapping not found", 404);
  return row;
}

async function getHistory(id) {
  const row = await boothRepository.findById(id);
  if (!row) return [];
  return historyRepository.listByLocation(row.location, row.id);
}

async function getFilterMeta(query) {
  const [districts, assemblies] = await Promise.all([
    boothRepository.distinctDistricts(),
    boothRepository.distinctAssemblies(str(query.district)),
  ]);
  return { districts, assemblies };
}

/**
 * Resolve a camera (deviceId) to its mapping. Returns { camera, mapped, mapping }
 * so the AutoInstaller can show "Edit Mapping" or "Add Mapping".
 */
async function getByStream(deviceId) {
  const camera = await streamlistRepository.findByDeviceOrName(str(deviceId));
  if (!camera) return { camera: null, mapped: false, mapping: null };
  const mapping = await boothRepository.findByStreamId(camera.id);
  return { camera, mapped: Boolean(mapping), mapping };
}

/**
 * Form dropdown data: districts and assemblies come from the `district`
 * collection; PS numbers are the ones already used by cameras there.
 */
async function getFormSuggestions(query) {
  const district = str(query.district);
  const acname = str(query.acname);

  const [districts, assemblies, psRaw] = await Promise.all([
    boothRepository.distinctDistricts(),
    boothRepository.distinctAssemblies(district),
    acname || district
      ? boothRepository.distinctPsNumbers({ district, acname })
      : Promise.resolve([]),
  ]);

  const psSet = new Set(psRaw.map((p) => String(p).replace(/-O$/i, "")));
  const psNumbers = Array.from(psSet).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });

  return { districts, assemblies, psNumbers };
}

/** Location already used for an (assembly, PS number) pair, to auto-fill the form. */
async function getLocationForPs(query) {
  const acname = str(query.acname);
  const psNum = str(query.psNum);
  if (!acname || !psNum) return { location: null };
  return { location: await boothRepository.getLocationForSlot({ acname, psNum }) };
}

async function searchCameras(query) {
  return streamlistRepository.search({
    term: str(query.term),
    limit: Math.min(parseInt(query.limit, 10) || 25, 100),
  });
}

// ── duplicate guard (create & update) ────────────────────────────────────────

/** A business "blocked" response if the camera is mapped elsewhere, else null. */
async function checkDuplicate({ streamId, id }) {
  const dup = await boothRepository.findDuplicateByStream({ streamId, excludeId: id });
  if (!dup) return null;

  const editing = Boolean(id);
  return {
    status: false,
    error: editing ? C.ERROR_DUP_DID : C.ERROR_ADD_EXIST,
    message: duplicateMessage(dup, editing),
    id: id || 0,
    id1: dup.id,
  };
}

// ── create ───────────────────────────────────────────────────────────────────

async function create(input, ctx) {
  const streamId = str(input.streamId);

  if (!(await streamlistRepository.existsById(streamId)))
    throw new ErrorHander("Invalid stream selected", 400);

  const blocked = await checkDuplicate({ streamId, id: null });
  if (blocked) return blocked;

  const mapping = await withDistrictCode(toMapping(input));

  // If another camera already occupies this exact slot (assembly + PS number +
  // location + camera location type), replace the camera there instead of
  // adding a second mapping.
  const slotBooth = await boothRepository.findByLocationSlot({
    acname: mapping.acname,
    psNum: mapping.psNum,
    location: mapping.location,
    cameraLocationType: mapping.cameraLocationType,
  });
  if (slotBooth) {
    const res = await update(slotBooth.id, input, ctx);
    if (res.status === false) return res;
    return { ...res, message: "Camera updated at existing location", boothId: slotBooth.id };
  }

  const boothId = await withPollingTransaction(async (session) => {
    const operator = await operatorService.resolveOperator(input, session);
    const newId = await boothRepository.insert(
      { ...mapping, operatorId: operator.operatorId, userName: ctx.userName, addedFrom: C.FROM_ADD },
      session,
    );
    await historyRepository.append(
      historyEntry(mapping, { deviceId: streamId, action: C.ACTION_INSERT, ctx, operator }),
      session,
    );
    return newId;
  });

  return { status: true, message: "Record Inserted Successfully!!", boothId };
}

// ── update ───────────────────────────────────────────────────────────────────

async function update(id, input, ctx) {
  const streamId = str(input.streamId);

  if (!(await streamlistRepository.existsById(streamId)))
    throw new ErrorHander("Invalid stream selected", 400);

  const existing = await boothRepository.findById(id);
  if (!existing) throw new ErrorHander("Camera mapping not found", 404);

  const blocked = await checkDuplicate({ streamId, id });
  if (blocked) return blocked;

  const mapping = await withDistrictCode(toMapping(input));

  // AutoInstaller only: if the edited slot (assembly + PS + camera location
  // type) already has ANOTHER camera, return a LocSwap prompt instead of saving.
  if (input.detectLocationSwap) {
    const slot = await boothRepository.findByLocationSlot({
      acname: mapping.acname,
      psNum: mapping.psNum,
      cameraLocationType: mapping.cameraLocationType,
      excludeId: id,
    });
    if (slot) {
      return {
        status: false,
        error: "LocSwap",
        id,
        targetId: slot.id,
        targetCamera: slot.streamname,
        message:
          `At Assembly: ${slot.acname} PsNo: ${slot.PSNum}` +
          ` (${slot.cameralocationtype}) camera ${slot.streamname} is already` +
          ` installed. Do you want to swap the cameras?`,
      };
    }
  }

  await withPollingTransaction(async (session) => {
    const operator = await operatorService.resolveOperator(input, session);
    await boothRepository.update(
      id,
      { ...mapping, operatorId: operator.operatorId, userName: ctx.userName, updatedFrom: C.FROM_EDIT },
      session,
    );

    // The camera left its old location: note that on the old location's log.
    if (existing.location && existing.location !== mapping.location) {
      await historyRepository.append(
        historyEntry(existing, { deviceId: existing.streamid, action: C.ACTION_REMOVE, ctx }),
        session,
      );
    }
    await historyRepository.append(
      historyEntry(mapping, { deviceId: streamId, action: C.ACTION_UPDATE, ctx, operator }),
      session,
    );
  });

  return { status: true, message: "Record Updated Successfully!!" };
}

// ── delete ───────────────────────────────────────────────────────────────────

async function remove(id, ctx) {
  const existing = await boothRepository.findById(id);
  if (!existing) throw new ErrorHander("Camera mapping not found", 404);

  await withPollingTransaction(async (session) => {
    await boothRepository.remove(id, session);
    await historyRepository.append(
      historyEntry(existing, { deviceId: existing.streamid, action: C.ACTION_DELETE, ctx }),
      session,
    );
  });

  return { status: true, message: "Record Deleted Successfully!!" };
}

// ── swap (DupDID) ────────────────────────────────────────────────────────────

/**
 * Resolve a DupDID conflict:
 *   • mapping `id`  gets the selected camera (streamId) + the edited fields
 *   • mapping `id1` gets the camera mapping `id` used to have
 */
async function swap(input, ctx) {
  const id = str(input.id);
  const id1 = str(input.id1);
  if (!id || !id1) throw new ErrorHander("Both booth ids are required for swap", 400);

  const current = await boothRepository.findById(id);
  const other = await boothRepository.findById(id1);
  if (!current) throw new ErrorHander("Current booth not found", 404);
  if (!other) throw new ErrorHander("Conflicting booth not found", 404);

  const mapping = await withDistrictCode(toMapping(input));
  const selectedDevice = mapping.streamId;
  const currentOldDevice = current.streamid;

  await withPollingTransaction(async (session) => {
    const operator = await operatorService.resolveOperator(input, session);
    await boothRepository.update(
      id,
      { ...mapping, operatorId: operator.operatorId, userName: ctx.userName, updatedFrom: C.FROM_SWAP },
      session,
    );
    await boothRepository.updateStream(
      id1,
      currentOldDevice,
      { userName: ctx.userName, updatedFrom: C.FROM_SWAP },
      session,
    );
    await historyRepository.append(
      historyEntry(mapping, { deviceId: selectedDevice, action: C.ACTION_SWAP, ctx, operator }),
      session,
    );
    await historyRepository.append(
      historyEntry(other, { deviceId: currentOldDevice, action: C.ACTION_SWAP, ctx }),
      session,
    );
  });

  return { status: true, message: "Cameras swapped successfully!!" };
}

// ── location swap (AutoInstaller) ────────────────────────────────────────────

/**
 * Two mappings at different locations exchange cameras. Locations stay put;
 * only the deviceIds swap.
 */
async function swapByLocation(input, ctx) {
  const currentBoothId = str(input.currentBoothId);
  const targetBoothId = str(input.targetBoothId);

  if (!currentBoothId || !targetBoothId)
    throw new ErrorHander("Both booth ids are required for swap", 400);
  if (currentBoothId === targetBoothId)
    throw new ErrorHander("Cannot swap a booth with itself", 400);

  const current = await boothRepository.findById(currentBoothId);
  const target = await boothRepository.findById(targetBoothId);
  if (!current) throw new ErrorHander("Current booth not found", 404);
  if (!target) throw new ErrorHander("Target booth not found", 404);

  const meta = { userName: ctx.userName, updatedFrom: C.FROM_SWAP };

  await withPollingTransaction(async (session) => {
    await boothRepository.updateStream(targetBoothId, current.streamid, meta, session);
    await boothRepository.updateStream(currentBoothId, target.streamid, meta, session);
    await historyRepository.append(
      historyEntry(target, { deviceId: current.streamid, action: C.ACTION_SWAP, ctx }),
      session,
    );
    await historyRepository.append(
      historyEntry(current, { deviceId: target.streamid, action: C.ACTION_SWAP, ctx }),
      session,
    );
  });

  return { status: true, message: "Cameras swapped successfully!!" };
}

module.exports = {
  list,
  getById,
  getByStream,
  getHistory,
  getFilterMeta,
  getFormSuggestions,
  getLocationForPs,
  searchCameras,
  create,
  update,
  remove,
  swap,
  swapByLocation,
};
