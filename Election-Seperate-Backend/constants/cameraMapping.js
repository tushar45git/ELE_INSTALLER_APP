/**
 * Camera Mapping constants.
 *
 * Page names, history actions and operator defaults used when writing camera
 * mappings to the polling MongoDB, defined in one place.
 */

module.exports = {
  // ── Audit / page identifiers (exactly as the SP wrote them) ────────────────
  PAGE_NAME: "Esp App",
  FROM_ADD: "Add Booth",
  FROM_EDIT: "Edit Booth",
  FROM_DELETE: "Delete Booth",
  FROM_SWAP: "Swap Camera",

  // ── History actions (vehiclelogs_v2 history[].action, same as the portal) ──
  ACTION_INSERT: "ADD",
  ACTION_UPDATE: "EDIT",
  ACTION_DELETE: "DELETE",
  ACTION_SWAP: "SWAP",
  ACTION_REMOVE: "REMOVE", // camera moved away from this location

  // ── Operator defaults (SP: blank name -> 'NA', blank number -> '1234567890')─
  DEFAULT_OPERATOR_NAME: "NA",
  DEFAULT_OPERATOR_NUMBER: "1234567890",

  // ── Duplicate-camera business error codes (consumed by the frontend) ───────
  ERROR_ADD_EXIST: "AddExist", // new mapping, camera already used elsewhere
  ERROR_DUP_DID: "DupDID", // editing, camera used by another booth -> offer swap

  // ── Pagination guards ──────────────────────────────────────────────────────
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 200,

  /**
   * Whitelist of sortable columns: API key -> field of the list row. Only these
   * fields can be sorted on.
   */
  SORTABLE_COLUMNS: {
    cameraName: "streamname",
    district: "district",
    assembly: "acname",
    psNumber: "PSNum",
    location: "location",
    cameraType: "cameralocationtype",
    operator: "operatorName",
    updatedBy: "updatedBy",
    updatedDate: "updatedDate",
    id: "_sortId",
  },
  DEFAULT_SORT_COLUMN: "_sortId",
  DEFAULT_SORT_ORDER: "DESC",
};
