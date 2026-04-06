const axios = require("axios");
const KycUser = require("../models/KycUser");
const ElectionUser = require("../models/election-user");
const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const AADHAAR_API_URL = process.env.AADHAAR_API;
const AADHAAR_TOKEN = process.env.AADHAAR_API_TOKEN;

const PAN_API_URL = process.env.PAN_API;
const PAN_TOKEN = process.env.PAN_API_TOKEN;

const AZURE_STORAGE_CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING;
const KYC_CONTAINER = "kyc-documents";

let containerClient;
try {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING,
  );
  containerClient = blobServiceClient.getContainerClient(KYC_CONTAINER);
  containerClient.createIfNotExists({ access: "blob" }).catch(() => {});
} catch (e) {
  console.error("Azure KYC container init failed:", e.message);
}

exports.aadhaarSendOtp = async (req, res) => {
  try {
    const { aadhaar, contactNumber } = req.body;

    if (!aadhaar || !/^\d{12}$/.test(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Valid 12-digit Aadhaar number is required",
      });
    }

    // If user is already pre-verified in DB, skip OTP entirely
    const existing = await KycUser.findOne({ contactNumber, isVerified: true });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Already verified",
        alreadyVerified: true,
      });
    }

    let apiRes;
    try {
      apiRes = await axios.post(
        AADHAAR_API_URL,
        { aadhaar },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: AADHAAR_TOKEN,
          },
          timeout: 15000,
        },
      );
    } catch (axiosErr) {
      console.error("Aadhaar API network/HTTP error:", axiosErr.message);
      return res.status(503).json({
        success: false,
        serviceUnavailable: true,
        message:
          "Aadhaar OTP service is currently unavailable. Please verify using documents instead.",
      });
    }

    console.log("Aadhaar API full response:", JSON.stringify(apiRes.data));

    // Token invalid / auth failure from the external API
    if (apiRes.data?.statusCode === 401 || apiRes.data?.status === false) {
      return res.status(503).json({
        success: false,
        serviceUnavailable: true,
        message:
          "Aadhaar OTP service is currently unavailable. Please verify using documents instead.",
      });
    }

    const refId = apiRes.data?.ref_id || apiRes.data?.data?.ref_id;
    if (!refId) {
      return res.status(400).json({
        success: false,
        message:
          apiRes.data?.message ||
          apiRes.data?.data?.message ||
          "Failed to send OTP",
      });
    }

    // Look up name from election-users — try plain number and with/without country code
    const mobileNum = Number(contactNumber);
    const mobileWithCode = Number(`91${contactNumber}`);
    const electionUser = await ElectionUser.findOne({
      mobile: {
        $in: [
          mobileNum,
          mobileWithCode,
          Number(String(mobileNum).replace(/^91/, "")),
        ],
      },
    });
    const nameFromElection = electionUser?.name || null;
    console.log(
      `[KYC] contactNumber=${contactNumber}, tried mobiles: [${mobileNum}, ${mobileWithCode}], electionUser:`,
      electionUser ? electionUser.name : "NOT FOUND",
    );

    const kycUpdate = {
      contactNumber,
      aadhaarNumber: aadhaar,
      refId,
      kycType: "aadhaar",
      isVerified: false,
    };
    if (nameFromElection) kycUpdate.name = nameFromElection;

    await KycUser.findOneAndUpdate(
      { contactNumber },
      { $set: kycUpdate },
      { upsert: true, new: true },
    );

    // ref_id is stored in DB — never sent to frontend
    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error(
      "Aadhaar send OTP error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || "Failed to send OTP",
    });
  }
};

// ─── Aadhaar: Verify OTP ─────────────────────────────────────────────────────
exports.aadhaarVerifyOtp = async (req, res) => {
  try {
    const { otp, contactNumber } = req.body;

    if (!otp || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "OTP and contact number are required",
      });
    }

    // Fetch ref_id from DB — never trust frontend to send it
    const kycRecord = await KycUser.findOne({ contactNumber });
    if (!kycRecord || !kycRecord.refId) {
      return res.status(400).json({
        success: false,
        message: "No OTP session found. Please generate OTP first.",
      });
    }

    const apiRes = await axios.post(
      AADHAAR_API_URL,
      { ref_id: kycRecord.refId, otp },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: AADHAAR_TOKEN,
        },
        timeout: 15000,
      },
    );

    // Accept if status is true or statusCode is 200
    const success =
      apiRes.data?.status === true || apiRes.data?.statusCode === 200;
    if (!success) {
      return res.status(400).json({
        success: false,
        message: apiRes.data?.message || "OTP verification failed",
      });
    }

    await KycUser.findOneAndUpdate(
      { contactNumber },
      { isVerified: true, verificationMethod: "otp", refId: null },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Aadhaar verified successfully",
      data: apiRes.data?.data,
    });
  } catch (error) {
    console.error(
      "Aadhaar verify OTP error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || "OTP verification failed",
    });
  }
};

// ─── PAN: Verify ─────────────────────────────────────────────────────────────
exports.panVerify = async (req, res) => {
  try {
    const { panNumber, contactNumber } = req.body;

    if (!panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid PAN number (e.g. ABCDE1234F)",
      });
    }

    // Call external PAN verification API
    let apiRes;
    try {
      apiRes = await axios.post(
        PAN_API_URL,
        { pan: panNumber },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: PAN_TOKEN,
          },
          timeout: 15000,
        },
      );
    } catch (axiosErr) {
      console.error("PAN API network/HTTP error:", axiosErr.message);
      return res.status(503).json({
        success: false,
        message:
          "PAN verification service is currently unavailable. Please try again later.",
      });
    }

    console.log("PAN API full response:", JSON.stringify(apiRes.data));

    const isVerified =
      apiRes.data?.status === true ||
      apiRes.data?.statusCode === 200 ||
      apiRes.data?.data?.status === "VALID" ||
      apiRes.data?.data?.pan_status === "VALID" ||
      apiRes.data?.result === "success";

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message:
          apiRes.data?.message ||
          apiRes.data?.data?.message ||
          "PAN verification failed. Please check your details.",
      });
    }

    // Look up name from election-users
    const mobileNum = Number(contactNumber);
    const mobileWithCode = Number(`91${contactNumber}`);
    const electionUser = await ElectionUser.findOne({
      mobile: {
        $in: [
          mobileNum,
          mobileWithCode,
          Number(String(mobileNum).replace(/^91/, "")),
        ],
      },
    });
    const nameFromElection = electionUser?.name || null;

    const update = {
      contactNumber,
      panNumber,
      kycType: "pan",
      isVerified: true,
      verificationMethod: "pan",
    };
    if (nameFromElection) update.name = nameFromElection;

    await KycUser.findOneAndUpdate({ contactNumber }, update, {
      upsert: true,
      new: true,
    });

    res
      .status(200)
      .json({ success: true, message: "PAN verified successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Driving Licence: Verify ─────────────────────────────────────────────────
exports.dlVerify = async (req, res) => {
  try {
    const { licenceNumber, dob, contactNumber } = req.body;

    if (!licenceNumber || !licenceNumber.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Licence number is required" });
    }
    if (!dob) {
      return res
        .status(400)
        .json({ success: false, message: "Date of birth is required" });
    }

    await KycUser.findOneAndUpdate(
      { contactNumber },
      {
        contactNumber,
        drivingLicenceNumber: licenceNumber,
        kycType: "dl",
        isVerified: true,
      },
      { upsert: true, new: true },
    );

    res.status(200).json({
      success: true,
      message: "Driving Licence verified successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Upload Documents (fallback) ─────────────────────────────────────────────
exports.uploadDocuments = async (req, res) => {
  try {
    const { contactNumber } = req.body;
    const files = req.files;

    if (!files || (!files.frontImage && !files.backImage)) {
      return res.status(400).json({
        success: false,
        message: "At least one document image is required",
      });
    }

    const uploadToAzure = async (file, prefix) => {
      const ext = path.extname(file.originalname);
      const blobName = `${prefix}/${contactNumber}/${uuidv4()}${ext}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });
      return blockBlobClient.url;
    };

    const update = {
      documents: {},
      verificationMethod: "document",
      isVerified: false,
    };
    if (files.frontImage)
      update.documents.frontImage = await uploadToAzure(
        files.frontImage[0],
        "front",
      );
    if (files.backImage)
      update.documents.backImage = await uploadToAzure(
        files.backImage[0],
        "back",
      );

    await KycUser.findOneAndUpdate(
      { contactNumber },
      { $set: update },
      { upsert: true, new: true },
    );

    res.status(200).json({
      success: true,
      message: "Documents uploaded successfully. Manual verification pending.",
    });
  } catch (error) {
    console.error("Upload documents error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: List all KYC (pending/all) ───────────────────────────────────────
exports.adminListKyc = async (req, res) => {
  try {
    const { status } = req.query; // 'pending' | 'verified' | 'rejected' | all
    const filter = {};
    if (status === "pending") filter.isVerified = false;
    else if (status === "verified") filter.isVerified = true;

    const list = await KycUser.find(filter).sort({ createdAt: -1 });

    // Backfill missing names from election-users and persist to DB
    const enriched = await Promise.all(
      list.map(async (kyc) => {
        const obj = kyc.toObject();
        if (!obj.name && obj.contactNumber) {
          const mobileNum = Number(obj.contactNumber);
          const mobileWithCode = Number(`91${obj.contactNumber}`);
          const eu = await ElectionUser.findOne({
            mobile: {
              $in: [
                mobileNum,
                mobileWithCode,
                Number(String(mobileNum).replace(/^91/, "")),
              ],
            },
          });
          console.log(
            `[KYC adminList] contact=${obj.contactNumber} mobileNum=${mobileNum} -> electionUser:`,
            eu ? eu.name : "NOT FOUND",
          );
          if (eu?.name) {
            obj.name = eu.name;
            // Persist so it doesn't need lookup next time
            await KycUser.findByIdAndUpdate(obj._id, {
              $set: { name: eu.name },
            });
          }
        }
        return obj;
      }),
    );

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Approve or Reject KYC ────────────────────────────────────────────
exports.adminUpdateKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "action must be approve or reject" });
    }

    const update =
      action === "approve"
        ? { isVerified: true, rejectedReason: null }
        : {
            isVerified: false,
            rejectedReason: req.body.reason || "Rejected by admin",
          };

    const kyc = await KycUser.findByIdAndUpdate(id, update, { new: true });
    if (!kyc)
      return res
        .status(404)
        .json({ success: false, message: "KYC record not found" });

    res.status(200).json({
      success: true,
      message: `KYC ${action}d successfully`,
      data: kyc,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getKycStatus = async (req, res) => {
  try {
    const { contactNumber } = req.query;
    const kyc = await KycUser.findOne({ contactNumber });
    res.status(200).json({
      success: true,
      data: kyc
        ? {
            name: kyc.name,
            contactNumber: kyc.contactNumber,
            aadhaarNumber: kyc.aadhaarNumber,
            panNumber: kyc.panNumber,
            drivingLicenceNumber: kyc.drivingLicenceNumber,
            kycType: kyc.kycType,
            isVerified: kyc.isVerified,
            rejectedReason: kyc.rejectedReason || null,
            verificationMethod: kyc.verificationMethod,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
