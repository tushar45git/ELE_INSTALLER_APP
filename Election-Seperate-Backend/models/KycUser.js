const mongoose = require("mongoose");

const kycUserSchema = new mongoose.Schema({
  name: { type: String, default: null },
  contactNumber: { type: String, required: true },
  aadhaarNumber: { type: String, default: null },
  panNumber: { type: String, default: null },
  drivingLicenceNumber: { type: String, default: null },
  kycType: { type: String, enum: ["aadhaar", "pan", "dl"], default: "aadhaar" },
  isVerified: { type: Boolean, default: false },
  verificationMethod: { type: String, default: null },
  refId: { type: String, default: null },
  rejectedReason: { type: String, default: null },
  documents: {
    frontImage: { type: String, default: null },
    backImage: { type: String, default: null },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("KycUser", kycUserSchema, "kyc_users");
