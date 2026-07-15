/**
 * Camera Mapping validation layer — synchronous field/format checks.
 *
 * Existence checks that need the DB (invalid stream, missing booth) live in the
 * service; this layer catches shape errors early and returns meaningful,
 * field-level messages. Each function returns an array of
 * `{ field, message }`; an empty array means valid.
 */

const REQUIRED_TEXT = [
  ["district", "District"],
  ["accode", "Assembly Code"],
  ["acname", "Assembly Name"],
  ["location", "Location"],
  ["cameraLocationType", "Camera Location Type"],
];

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

function validateStreamId(body, errors) {
  const n = Number(body.streamId);
  if (isBlank(body.streamId) || !Number.isInteger(n) || n <= 0) {
    errors.push({ field: "streamId", message: "A valid camera (stream) is required" });
  }
}

function validateNumericOptional(body, field, label, errors) {
  if (!isBlank(body[field]) && Number.isNaN(Number(body[field]))) {
    errors.push({ field, message: `${label} must be a number` });
  }
}

/** Validate the create/update mapping payload. */
function validateMapping(body) {
  const errors = [];
  validateStreamId(body, errors);
  for (const [field, label] of REQUIRED_TEXT) {
    if (isBlank(body[field]))
      errors.push({ field, message: `${label} is required` });
  }
  validateNumericOptional(body, "longitude", "Longitude", errors);
  validateNumericOptional(body, "latitude", "Latitude", errors);
  return errors;
}

/** Validate the swap payload. */
function validateSwap(body) {
  const errors = validateMapping(body);
  const id = Number(body.id);
  const id1 = Number(body.id1);
  if (!Number.isInteger(id) || id <= 0)
    errors.push({ field: "id", message: "Current booth id is required" });
  if (!Number.isInteger(id1) || id1 <= 0)
    errors.push({ field: "id1", message: "Conflicting booth id is required" });
  return errors;
}

module.exports = { validateMapping, validateSwap };
