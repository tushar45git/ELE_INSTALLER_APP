/**
 * Camera Mapping controller — thin HTTP adapter. No business logic here:
 * it validates input shape, builds the request context (acting user + IP),
 * delegates to the service, and shapes the HTTP response.
 *
 * Response contract:
 *   • 200 { success:true, status:true,  ... }  -> saved
 *   • 200 { success:true, status:false, error, message, id, id1 } -> duplicate
 *       (business block: AddExist / DupDID — the frontend reads `error`)
 *   • 400 { success:false, errors:[{field,message}] } -> validation failure
 *   • 404 / 500 handled by the async wrapper + global error middleware
 */

const service = require("../services/cameraMappingService");
const {
  validateMapping,
  validateSwap,
} = require("../validators/cameraMappingValidator");

// Small local async wrapper so every handler forwards errors to next().
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/** Acting-user context: userName from body, IP from the request. */
function contextFrom(req) {
  return {
    userName: (req.body?.userName || "").toString().slice(0, 50),
    ipAddress: (
      req.headers["x-forwarded-for"] ||
      req.ip ||
      req.connection?.remoteAddress ||
      ""
    )
      .toString()
      .slice(0, 50),
  };
}

const badRequest = (res, errors) =>
  res.status(400).json({ success: false, errors });

exports.list = wrap(async (req, res) => {
  const result = await service.list(req.query);
  res.status(200).json({ success: true, ...result });
});

exports.getById = wrap(async (req, res) => {
  const data = await service.getById(Number(req.params.id));
  res.status(200).json({ success: true, data });
});

exports.getByStream = wrap(async (req, res) => {
  const deviceId = req.query.deviceId || req.query.streamname || "";
  const data = await service.getByStream(deviceId);
  res.status(200).json({ success: true, ...data });
});

exports.getHistory = wrap(async (req, res) => {
  const data = await service.getHistory(Number(req.params.id));
  res.status(200).json({ success: true, data });
});

exports.getFilterMeta = wrap(async (req, res) => {
  const data = await service.getFilterMeta(req.query);
  res.status(200).json({ success: true, ...data });
});

exports.getFormSuggestions = wrap(async (req, res) => {
  const data = await service.getFormSuggestions(req.query);
  res.status(200).json({ success: true, ...data });
});

exports.searchCameras = wrap(async (req, res) => {
  const data = await service.searchCameras(req.query);
  res.status(200).json({ success: true, data });
});

exports.create = wrap(async (req, res) => {
  const errors = validateMapping(req.body);
  if (errors.length) return badRequest(res, errors);

  const result = await service.create(req.body, contextFrom(req));
  res.status(result.status ? 201 : 200).json({ success: true, ...result });
});

exports.update = wrap(async (req, res) => {
  const errors = validateMapping(req.body);
  if (errors.length) return badRequest(res, errors);

  const result = await service.update(
    Number(req.params.id),
    req.body,
    contextFrom(req),
  );
  res.status(200).json({ success: true, ...result });
});

exports.remove = wrap(async (req, res) => {
  const result = await service.remove(Number(req.params.id), contextFrom(req));
  res.status(200).json({ success: true, ...result });
});

exports.swap = wrap(async (req, res) => {
  const errors = validateSwap(req.body);
  if (errors.length) return badRequest(res, errors);

  const result = await service.swap(req.body, contextFrom(req));
  res.status(200).json({ success: true, ...result });
});

// Location-based swap (AutoInstaller): swap cameras between two booths.
exports.swapByLocation = wrap(async (req, res) => {
  const { currentBoothId, targetBoothId } = req.body;
  if (!currentBoothId || !targetBoothId) {
    return badRequest(res, [
      { field: "boothIds", message: "currentBoothId and targetBoothId are required" },
    ]);
  }
  const result = await service.swapByLocation(req.body, contextFrom(req));
  res.status(200).json({ success: true, ...result });
});
