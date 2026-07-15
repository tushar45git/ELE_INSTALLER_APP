/**
 * Camera Mapping constants.
 *
 * These mirror the literal values the legacy stored procedure `SaveBoothByID`
 * wrote into the booth / boothhistory / ChangeCamera tables. Keeping them in
 * one place means the "magic strings" the business depends on (page names,
 * audit actions, operator defaults) are defined exactly once.
 */

module.exports = {
  // ── Audit / page identifiers (exactly as the SP wrote them) ────────────────
  PAGE_NAME: "BoothMaster.aspx",
  FROM_ADD: "Add Booth",
  FROM_EDIT: "Edit Booth",
  FROM_DELETE: "Delete Booth",
  FROM_SWAP: "Swap Camera",

  // ── boothhistory.Action values ─────────────────────────────────────────────
  ACTION_INSERT: "INSERT",
  ACTION_UPDATE: "UPDATE",
  ACTION_DELETE: "DELETE",

  // ── Operator defaults (SP: blank name -> 'NA', blank number -> '1234567890')─
  DEFAULT_OPERATOR_NAME: "NA",
  DEFAULT_OPERATOR_NUMBER: "1234567890",

  // ── Camera location type that flags a booth as "outside" ───────────────────
  OUTSIDE_LOCATION_TYPE: "Outside",
  // Suffix appended to PS Number for Outside cameras (e.g. "7" -> "7-O").
  OUTSIDE_PS_SUFFIX: "-O",

  // ── Duplicate-camera business error codes (consumed by the frontend) ───────
  ERROR_ADD_EXIST: "AddExist", // new mapping, camera already used elsewhere
  ERROR_DUP_DID: "DupDID", // editing, camera used by another booth -> offer swap

  // ── Pagination guards ──────────────────────────────────────────────────────
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 200,

  /**
   * Whitelist of sortable columns. The client sends the API-facing key; we map
   * it to a fully-qualified column so `sortBy` can never inject SQL.
   */
  SORTABLE_COLUMNS: {
    cameraName: "s.streamname",
    district: "b.district",
    assembly: "b.acname",
    psNumber: "b.PSNum",
    location: "b.location",
    cameraType: "b.cameralocationtype",
    operator: "o.operatorName",
    updatedBy: "b.updatedBy",
    updatedDate: "b.updatedDate",
    id: "b.id",
  },
  DEFAULT_SORT_COLUMN: "b.id",
  DEFAULT_SORT_ORDER: "DESC",
};
