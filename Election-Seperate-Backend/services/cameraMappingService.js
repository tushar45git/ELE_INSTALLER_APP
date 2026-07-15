/**
 * Camera Mapping service — the business layer that replaces the SaveBoothByID
 * stored procedure. All multi-table writes run inside a single transaction
 * (utils/sqlTransaction.withTransaction) so a failure rolls everything back.
 *
 * Business rules preserved from the SP (see analysis):
 *   • Duplicate camera guard BEFORE any write:
 *       - new mapping   -> error "AddExist" (block)
 *       - editing       -> error "DupDID"   (block, offer swap)
 *   • find-or-create operator (operatorService)
 *   • booth + boothhistory + ChangeCamera kept consistent
 *   • parity: longitude/latitude -> 0, IsPink/IsAro -> 0 on write
 *
 * Net-new (SP had none): DELETE (soft) and SWAP, both transactional & audited.
 */

const ErrorHander = require("../utils/errorhander");
const { getISTString } = require("../utils/ist");
const { withTransaction, getReadFactory } = require("../utils/sqlTransaction");
const C = require("../constants/cameraMapping");

const boothRepository = require("../repositories/boothRepository");
const boothHistoryRepository = require("../repositories/boothHistoryRepository");
const streamlistRepository = require("../repositories/streamlistRepository");
const operatorService = require("./operatorService");
const changeCameraService = require("./changeCameraService");

// ── helpers ──────────────────────────────────────────────────────────────────

const isOutside = (type) =>
  type === C.OUTSIDE_LOCATION_TYPE ? 1 : 0;

/**
 * PS Number carries an "-O" suffix for Outside cameras (e.g. "7" -> "7-O").
 * Idempotent: strips any existing "-O" first, then re-appends only when the
 * camera location type is Outside — so switching a camera back to Inside also
 * drops the suffix. Empty PS numbers are left untouched.
 */
function formatPsNumber(psNum, cameraLocationType) {
  const base = String(psNum ?? "").trim().replace(/-O$/i, "");
  if (base === "") return "";
  return cameraLocationType === C.OUTSIDE_LOCATION_TYPE
    ? `${base}${C.OUTSIDE_PS_SUFFIX}`
    : base;
}

/** Build the "already mapped" message from the conflicting booth row. */
function duplicateMessage(row, offerSwap) {
  const base =
    `This camera is already mapped with District: ${row.district || ""}` +
    ` Assembly: ${row.acname || ""} PsNo:${row.PSNum || ""}` +
    ` Location:${row.location || ""}`;
  return offerSwap ? `${base} IF you want to swap Then Click on OK` : base;
}

/** Normalise the validated payload into the internal mapping shape. */
function toMapping(input) {
  return {
    streamId: Number(input.streamId),
    district: input.district,
    accode: input.accode,
    acname: input.acname,
    psNum: formatPsNumber(input.psNum, input.cameraLocationType),
    location: input.location,
    cameraLocationType: input.cameraLocationType,
    isOutsideBooth: isOutside(input.cameraLocationType),
  };
}

// ── reads ──────────────────────────────────────────────────────────────────

async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || C.DEFAULT_PAGE, 1);
  const rawLimit = parseInt(query.limit, 10) || C.DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(rawLimit, 1), C.MAX_PAGE_SIZE);
  const offset = (page - 1) * limit;

  const makeRequest = await getReadFactory();
  const { rows, total } = await boothRepository.list(makeRequest, {
    search: (query.search || "").trim(),
    district: (query.district || "").trim(),
    assembly: (query.assembly || "").trim(),
    camera: (query.camera || "").trim(),
    offset,
    limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getById(id) {
  const makeRequest = await getReadFactory();
  const row = await boothRepository.findById(makeRequest, id);
  if (!row) throw new ErrorHander("Camera mapping not found", 404);
  return row;
}

async function getHistory(id) {
  const makeRequest = await getReadFactory();
  return boothHistoryRepository.listByBooth(makeRequest, id);
}

async function getFilterMeta(query) {
  const makeRequest = await getReadFactory();
  const [districts, assemblies] = await Promise.all([
    boothRepository.distinctDistricts(makeRequest),
    boothRepository.distinctAssemblies(makeRequest, (query.district || "").trim()),
  ]);
  return { districts, assemblies };
}

/**
 * Resolve a camera (by device id or stream name) to its SQL mapping.
 * Returns { camera, mapped, mapping } so the AutoInstaller can decide whether
 * to show "Edit Details" (mapped) or "Add Mapping" (unmapped).
 */
async function getByStream(deviceId) {
  const makeRequest = await getReadFactory();
  const camera = await streamlistRepository.findByDeviceOrName(
    makeRequest,
    (deviceId || "").trim(),
  );
  if (!camera) return { camera: null, mapped: false, mapping: null };

  const mapping = await boothRepository.findByStreamId(makeRequest, camera.id);
  return { camera, mapped: Boolean(mapping), mapping };
}

/**
 * Autocomplete suggestions for the mapping form, cascading:
 *   districts (all) -> assemblies (by district) -> PS numbers (by assembly).
 * PS numbers are returned as base values ("-O" suffix stripped + deduped) so
 * the same slot isn't listed twice; the suffix is re-applied on save.
 */
async function getFormSuggestions(query) {
  const makeRequest = await getReadFactory();
  const district = (query.district || "").trim();
  const acname = (query.acname || "").trim();

  const [districts, assemblies, psRaw] = await Promise.all([
    boothRepository.distinctDistricts(makeRequest),
    boothRepository.distinctAssemblies(makeRequest, district),
    boothRepository.distinctPsNumbers(makeRequest, { district, acname }),
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

async function searchCameras(query) {
  const makeRequest = await getReadFactory();
  return streamlistRepository.search(makeRequest, {
    term: (query.term || "").trim(),
    limit: Math.min(parseInt(query.limit, 10) || 25, 100),
  });
}

// ── duplicate guard (shared by create & update) ──────────────────────────────

/**
 * Returns a business "blocked" response if the camera is already mapped
 * elsewhere, otherwise null. Mirrors the SP AddExist / DupDID branches.
 */
async function checkDuplicate(makeRequest, { streamId, id }) {
  const dup = await boothRepository.findDuplicateByStream(makeRequest, {
    streamId,
    excludeId: id,
  });
  if (!dup) return null;

  const editing = id !== 0;
  return {
    status: false,
    error: editing ? C.ERROR_DUP_DID : C.ERROR_ADD_EXIST,
    message: duplicateMessage(dup, editing),
    id,
    id1: dup.id,
  };
}

// ── create ───────────────────────────────────────────────────────────────────

async function create(input, ctx) {
  const streamId = Number(input.streamId);
  const read = await getReadFactory();

  // Invalid stream guard (SP implicitly relied on streamlist lookup).
  if (!(await streamlistRepository.existsById(read, streamId)))
    throw new ErrorHander("Invalid stream selected", 400);

  // Duplicate guard BEFORE any write — no data is saved if blocked.
  const blocked = await checkDuplicate(read, { streamId, id: 0 });
  if (blocked) return blocked;

  const streamName = await streamlistRepository.getStreamName(read, streamId);
  const getist = getISTString();
  const mapping = toMapping(input);

  const boothId = await withTransaction(async (makeRequest) => {
    const operatorId = await operatorService.resolveOperatorId(
      makeRequest,
      input,
      mapping.district,
    );

    const newBoothId = await boothRepository.insert(
      makeRequest,
      {
        ...mapping,
        operatorId,
        userName: ctx.userName,
        addedFrom: C.FROM_ADD,
        addedFromPage: C.PAGE_NAME,
      },
      getist,
    );

    await boothHistoryRepository.insert(
      makeRequest,
      {
        ...mapping,
        operatorId,
        addedBy: ctx.userName,
        updatedBy: ctx.userName,
        updatedFrom: C.FROM_ADD,
        action: C.ACTION_INSERT,
        boothId: newBoothId,
        ipAddress: ctx.ipAddress,
        addedFromPage: C.PAGE_NAME,
        addedFrom: C.FROM_ADD,
        updatedFromPage: null,
      },
      getist,
    );

    await changeCameraService.onCreate(makeRequest, mapping, streamName, getist);
    return newBoothId;
  });

  return { status: true, message: "Record Inserted Successfully!!", boothId };
}

// ── update ───────────────────────────────────────────────────────────────────

async function update(id, input, ctx) {
  const streamId = Number(input.streamId);
  const read = await getReadFactory();

  if (!(await streamlistRepository.existsById(read, streamId)))
    throw new ErrorHander("Invalid stream selected", 400);

  const existing = await boothRepository.findById(read, id);
  if (!existing) throw new ErrorHander("Camera mapping not found", 404);

  // Duplicate guard — blocks with DupDID (frontend then offers swap).
  const blocked = await checkDuplicate(read, { streamId, id });
  if (blocked) return blocked;

  const streamName = await streamlistRepository.getStreamName(read, streamId);
  const getist = getISTString();
  const mapping = toMapping(input);

  // AutoInstaller-only: if the edited location slot (assembly + PS + camera
  // location type) is already occupied by ANOTHER camera, block the save and
  // return a LocSwap prompt so the client can offer a swap. Gated on an
  // explicit flag so the Map Camera page's normal edits are unaffected.
  if (input.detectLocationSwap) {
    const slot = await boothRepository.findByLocationSlot(read, {
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

  await withTransaction(async (makeRequest) => {
    const old = await boothRepository.findOldSnapshot(makeRequest, id);

    const operatorId = await operatorService.resolveOperatorId(
      makeRequest,
      input,
      mapping.district,
    );

    await boothRepository.update(
      makeRequest,
      id,
      {
        ...mapping,
        operatorId,
        userName: ctx.userName,
        updatedFrom: C.FROM_EDIT,
        updatedFromPage: C.PAGE_NAME,
      },
      getist,
    );

    // ChangeCamera ledger (camera-change and/or location-change).
    await changeCameraService.onEdit(
      makeRequest,
      {
        streamId: old.oldStreamId,
        streamName: old.oldStreamName,
        district: old.oldDistrict,
        accode: old.oldAccode,
        acname: old.oldAcname,
        psNum: old.oldPsNum,
        location: old.oldLocation,
      },
      { ...mapping, streamName },
      getist,
    );

    // Soft-delete the previously active history rows, then append UPDATE row.
    await boothHistoryRepository.softDeleteActiveByBooth(
      makeRequest,
      id,
      {
        updatedBy: ctx.userName,
        updatedFrom: C.FROM_EDIT,
        updatedFromPage: C.PAGE_NAME,
      },
      getist,
    );

    await boothHistoryRepository.insert(
      makeRequest,
      {
        ...mapping,
        operatorId,
        addedBy: ctx.userName,
        updatedBy: ctx.userName,
        updatedFrom: C.FROM_EDIT,
        action: C.ACTION_UPDATE,
        boothId: id,
        ipAddress: ctx.ipAddress,
        addedFromPage: null,
        addedFrom: null,
        updatedFromPage: C.PAGE_NAME,
      },
      getist,
    );
  });

  return { status: true, message: "Record Updated Successfully!!" };
}

// ── delete (soft) ─────────────────────────────────────────────────────────────

async function remove(id, ctx) {
  const read = await getReadFactory();
  const existing = await boothRepository.findById(read, id);
  if (!existing) throw new ErrorHander("Camera mapping not found", 404);

  const getist = getISTString();

  await withTransaction(async (makeRequest) => {
    await boothRepository.softDelete(
      makeRequest,
      id,
      {
        userName: ctx.userName,
        updatedFrom: C.FROM_DELETE,
        updatedFromPage: C.PAGE_NAME,
      },
      getist,
    );

    // Close the active ledger row for this mapping.
    await changeCameraService.onDelete(
      makeRequest,
      {
        district: existing.district,
        accode: existing.accode,
        acname: existing.acname,
        psNum: existing.PSNum,
        location: existing.location,
      },
      existing.streamname,
      getist,
    );

    // Soft-delete active history, then append a DELETE marker row.
    await boothHistoryRepository.softDeleteActiveByBooth(
      makeRequest,
      id,
      {
        updatedBy: ctx.userName,
        updatedFrom: C.FROM_DELETE,
        updatedFromPage: C.PAGE_NAME,
      },
      getist,
    );

    await boothHistoryRepository.insert(
      makeRequest,
      {
        streamId: existing.streamid,
        operatorId: existing.operatorid,
        district: existing.district,
        accode: existing.accode,
        acname: existing.acname,
        psNum: existing.PSNum,
        location: existing.location,
        cameraLocationType: existing.cameralocationtype,
        isOutsideBooth: existing.IsOutsideBooth ? 1 : 0,
        addedBy: ctx.userName,
        updatedBy: ctx.userName,
        updatedFrom: C.FROM_DELETE,
        action: C.ACTION_DELETE,
        boothId: id,
        ipAddress: ctx.ipAddress,
        addedFromPage: null,
        addedFrom: null,
        updatedFromPage: C.PAGE_NAME,
      },
      getist,
    );
  });

  return { status: true, message: "Record Deleted Successfully!!" };
}

// ── swap (net-new) ────────────────────────────────────────────────────────────

/**
 * Safely resolve a DupDID conflict:
 *   • current booth (id)  receives the selected camera (streamId) + edited fields
 *   • other booth  (id1)  receives the camera the current booth used to hold
 * Both booths get history + ChangeCamera updates, all in one transaction.
 */
async function swap(input, ctx) {
  const id = Number(input.id);
  const id1 = Number(input.id1);
  const selectedStreamId = Number(input.streamId);

  if (!id || !id1)
    throw new ErrorHander("Both booth ids are required for swap", 400);

  const read = await getReadFactory();
  const current = await boothRepository.findById(read, id);
  const other = await boothRepository.findById(read, id1);
  if (!current) throw new ErrorHander("Current booth not found", 404);
  if (!other) throw new ErrorHander("Conflicting booth not found", 404);

  const currentOldStreamId = current.streamid; // camera X (moves to booth id1)
  const [selectedStreamName, currentOldStreamName] = await Promise.all([
    streamlistRepository.getStreamName(read, selectedStreamId),
    streamlistRepository.getStreamName(read, currentOldStreamId),
  ]);

  const getist = getISTString();
  const mapping = toMapping(input); // edited fields for booth `id`

  await withTransaction(async (makeRequest) => {
    const operatorId = await operatorService.resolveOperatorId(
      makeRequest,
      input,
      mapping.district,
    );

    // 1) Booth `id` -> selected camera + edited fields.
    await boothRepository.update(
      makeRequest,
      id,
      {
        ...mapping,
        operatorId,
        userName: ctx.userName,
        updatedFrom: C.FROM_SWAP,
        updatedFromPage: C.PAGE_NAME,
      },
      getist,
    );

    // 2) Booth `id1` -> the camera booth `id` used to hold (keep its fields).
    await boothRepository.updateStream(
      makeRequest,
      id1,
      currentOldStreamId,
      { userName: ctx.userName, updatedFrom: C.FROM_SWAP, updatedFromPage: C.PAGE_NAME },
      getist,
    );

    // 3) Ledger for booth `id`: old camera X @ its old location -> new mapping.
    await changeCameraService.onEdit(
      makeRequest,
      {
        streamId: currentOldStreamId,
        streamName: currentOldStreamName,
        district: current.district,
        accode: current.accode,
        acname: current.acname,
        psNum: current.PSNum,
        location: current.location,
      },
      { ...mapping, streamName: selectedStreamName },
      getist,
    );

    // 4) Ledger for booth `id1`: selected camera -> camera X at id1's location.
    await changeCameraService.onEdit(
      makeRequest,
      {
        streamId: selectedStreamId,
        streamName: selectedStreamName,
        district: other.district,
        accode: other.accode,
        acname: other.acname,
        psNum: other.PSNum,
        location: other.location,
      },
      {
        streamId: currentOldStreamId,
        streamName: currentOldStreamName,
        district: other.district,
        accode: other.accode,
        acname: other.acname,
        psNum: other.PSNum,
        location: other.location,
      },
      getist,
    );

    // 5) History for both booths (soft-delete active + append UPDATE row).
    for (const booth of [
      {
        id,
        streamId: selectedStreamId,
        operatorId,
        district: mapping.district,
        accode: mapping.accode,
        acname: mapping.acname,
        psNum: mapping.psNum,
        location: mapping.location,
        cameraLocationType: mapping.cameraLocationType,
        isOutsideBooth: mapping.isOutsideBooth,
      },
      {
        id: id1,
        streamId: currentOldStreamId,
        operatorId: other.operatorid,
        district: other.district,
        accode: other.accode,
        acname: other.acname,
        psNum: other.PSNum,
        location: other.location,
        cameraLocationType: other.cameralocationtype,
        isOutsideBooth: other.IsOutsideBooth ? 1 : 0,
      },
    ]) {
      await boothHistoryRepository.softDeleteActiveByBooth(
        makeRequest,
        booth.id,
        { updatedBy: ctx.userName, updatedFrom: C.FROM_SWAP, updatedFromPage: C.PAGE_NAME },
        getist,
      );
      await boothHistoryRepository.insert(
        makeRequest,
        {
          streamId: booth.streamId,
          operatorId: booth.operatorId,
          district: booth.district,
          accode: booth.accode,
          acname: booth.acname,
          psNum: booth.psNum,
          location: booth.location,
          cameraLocationType: booth.cameraLocationType,
          isOutsideBooth: booth.isOutsideBooth,
          addedBy: ctx.userName,
          updatedBy: ctx.userName,
          updatedFrom: C.FROM_SWAP,
          action: C.ACTION_UPDATE,
          boothId: booth.id,
          ipAddress: ctx.ipAddress,
          addedFromPage: null,
          addedFrom: null,
          updatedFromPage: C.PAGE_NAME,
        },
        getist,
      );
    }
  });

  return { status: true, message: "Cameras swapped successfully!!" };
}

// ── location swap (AutoInstaller) ─────────────────────────────────────────────

/**
 * Two booths at different location slots exchange cameras. Locations stay
 * fixed; only the cameras (streamids) swap — so the scanned camera ends at the
 * target slot and the camera that was there moves to the scanned camera's old
 * slot. Fully transactional + audited (history + ChangeCamera for both booths).
 */
async function swapByLocation(input, ctx) {
  const currentBoothId = Number(input.currentBoothId);
  const targetBoothId = Number(input.targetBoothId);

  if (!currentBoothId || !targetBoothId)
    throw new ErrorHander("Both booth ids are required for swap", 400);
  if (currentBoothId === targetBoothId)
    throw new ErrorHander("Cannot swap a booth with itself", 400);

  const read = await getReadFactory();
  const current = await boothRepository.findById(read, currentBoothId);
  const target = await boothRepository.findById(read, targetBoothId);
  if (!current) throw new ErrorHander("Current booth not found", 404);
  if (!target) throw new ErrorHander("Target booth not found", 404);

  const camCurrent = current.streamid; // scanned camera -> target slot
  const camTarget = target.streamid; // camera at target slot -> current slot
  const getist = getISTString();

  const meta = {
    userName: ctx.userName,
    updatedFrom: C.FROM_SWAP,
    updatedFromPage: C.PAGE_NAME,
  };

  await withTransaction(async (makeRequest) => {
    // Swap cameras between the two location-booths (locations unchanged).
    await boothRepository.updateStream(makeRequest, targetBoothId, camCurrent, meta, getist);
    await boothRepository.updateStream(makeRequest, currentBoothId, camTarget, meta, getist);

    // ChangeCamera ledger — each slot's camera changed (location fixed).
    await changeCameraService.onEdit(
      makeRequest,
      { streamId: camTarget, streamName: target.streamname, district: target.district, accode: target.accode, acname: target.acname, psNum: target.PSNum, location: target.location },
      { streamId: camCurrent, streamName: current.streamname, district: target.district, accode: target.accode, acname: target.acname, psNum: target.PSNum, location: target.location },
      getist,
    );
    await changeCameraService.onEdit(
      makeRequest,
      { streamId: camCurrent, streamName: current.streamname, district: current.district, accode: current.accode, acname: current.acname, psNum: current.PSNum, location: current.location },
      { streamId: camTarget, streamName: target.streamname, district: current.district, accode: current.accode, acname: current.acname, psNum: current.PSNum, location: current.location },
      getist,
    );

    // History for both booths (soft-delete active + append UPDATE row).
    for (const b of [
      { id: targetBoothId, streamId: camCurrent, booth: target },
      { id: currentBoothId, streamId: camTarget, booth: current },
    ]) {
      await boothHistoryRepository.softDeleteActiveByBooth(makeRequest, b.id, meta, getist);
      await boothHistoryRepository.insert(
        makeRequest,
        {
          streamId: b.streamId,
          operatorId: b.booth.operatorid,
          district: b.booth.district,
          accode: b.booth.accode,
          acname: b.booth.acname,
          psNum: b.booth.PSNum,
          location: b.booth.location,
          cameraLocationType: b.booth.cameralocationtype,
          isOutsideBooth: b.booth.IsOutsideBooth ? 1 : 0,
          addedBy: ctx.userName,
          updatedBy: ctx.userName,
          updatedFrom: C.FROM_SWAP,
          action: C.ACTION_UPDATE,
          boothId: b.id,
          ipAddress: ctx.ipAddress,
          addedFromPage: null,
          addedFrom: null,
          updatedFromPage: C.PAGE_NAME,
        },
        getist,
      );
    }
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
  searchCameras,
  create,
  update,
  remove,
  swap,
  swapByLocation,
};
