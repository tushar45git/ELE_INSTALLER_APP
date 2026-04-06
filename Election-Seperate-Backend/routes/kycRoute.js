const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  aadhaarSendOtp,
  aadhaarVerifyOtp,
  panVerify,
  dlVerify,
  uploadDocuments,
  getKycStatus,
  adminListKyc,
  adminUpdateKyc,
} = require("../controllers/kycController");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/aadhaar/send-otp", aadhaarSendOtp);
router.post("/aadhaar/verify-otp", aadhaarVerifyOtp);
router.post("/pan/verify", panVerify);
router.post("/dl/verify", dlVerify);
router.post(
  "/upload-documents",
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  uploadDocuments,
);
router.get("/status", getKycStatus);

// Admin routes
router.get("/admin/list", adminListKyc);
router.put("/admin/:id", adminUpdateKyc);

module.exports = router;
