/**
 * Camera Mapping routes — REST surface mounted at /election/api/camera-mapping.
 *
 * NOTE on ordering: the static /meta and /swap routes are declared before the
 * parameterised /:id routes so Express doesn't treat "meta"/"swap" as an :id.
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/cameraMappingController");

// Metadata for filters & pickers
router.get("/meta/filters", controller.getFilterMeta); // districts + assemblies
router.get("/meta/cameras", controller.searchCameras); // camera autocomplete
router.get("/meta/suggestions", controller.getFormSuggestions); // form field autocomplete
router.get("/meta/location", controller.getLocationForPs); // auto-fill location for (assembly, PS)
router.get("/by-stream", controller.getByStream); // resolve device id -> mapping

// Swap (resolves a DupDID conflict on the Map Camera page)
router.post("/swap", controller.swap);
// Location-based swap (AutoInstaller): swap cameras between two booths
router.post("/swap-location", controller.swapByLocation);

// CRUD
router.get("/", controller.list);
router.get("/:id/history", controller.getHistory);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
