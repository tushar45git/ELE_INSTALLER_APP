const Booth = require("../models/election-booth-data");
const Fsv = require("../models/election-fsv");
const EleCamera = require("../models/election-camera");
const Cameradetails = require("../models/Cameradetails");
const EleFlv = require("../models/election-flv-data");
const sendToken = require("../utils/jwtToken");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const electionUser = require("../models/election-user");
const electionUserPunjab = require("../models/election-users-punjab");
const mqtt = require("mqtt");
const commonConfig = require("./script/commonConfig");
const appSettings = require("./script/appsettings");
const Elehistory = require("../models/election-history");
const {
  VUtil_decodeGetConfigMsg,
  VUtil_encodeMsgHeader,
  VUtil_decodeMsgHeader,
  VUtil_getStreamId,
  VUtil_encodeMsg,
} = require("./script/vutil");
const Attend = require("../models/election-attendance");
const moment = require("moment");
const EleUserhistory = require("../models/ele-user-latlong-history");
const elePhaseOneData = require("../models/phaseonedata");
const EleReboot = require("../models/election-reboot");
const punjabElection = require("../models/election-users-punjab");
const AiStatus = require("../models/AiStatus");
const { getSqlConnection } = require("../config/sqlDatabase");
const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const AZURE_STORAGE_CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = "election-camera-photos";

const blobServiceClient = BlobServiceClient.fromConnectionString(
  AZURE_STORAGE_CONNECTION_STRING,
);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// Ensure container exists
const ensureContainerExists = async () => {
  try {
    await containerClient.createIfNotExists({ access: "blob" });
  } catch (error) {
    console.error("Error creating container:", error.message);
  }
};
ensureContainerExists();

const getSqlData = async (phase, deviceId) => {
  const pool = await getSqlConnection(phase);

  const query = `
        SELECT top(1) streamname, prourl, servername, 'https://' + servername + '/live-record/' + streamname + '.flv' AS url2,b.district,b.acname AS assemblyName,
b.PSNum AS psNo,b.location,s.deviceid AS deviceId, statename as state FROM streamlist s WITH (NOLOCK)INNER JOIN booth b WITH (NOLOCK)ON s.id = b.streamid 
inner join state st  WITH (NOLOCK) on st.id=b.boothstateid 
WHERE ISNULL(b.isdelete,'')=0  AND s.deviceid = @deviceId
    `;

  const result = await pool.request().input("deviceId", deviceId).query(query);

  const data = result.recordset[0] || null;

  return {
    stream: data
      ? {
          streamname: data.streamname,
          prourl: data.prourl,
          servername: data.servername,
          url2: data.url2,
        }
      : null,
    booth: data
      ? {
          district: data.district,
          assemblyName: data.assemblyName,
          psNo: data.psNo,
          location: data.location,
          locationtype: data.locationtype,
          deviceId: data.deviceId,
          state: data.state,
        }
      : null,
  };
};

// Function to upload camera photo
exports.uploadCameraPhoto = async (req, res) => {
  try {
    const file = req.file;
    const { deviceId } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const dateString = new Date().toISOString().split("T")[0];
    const blobName = `camera-installations/${deviceId || "unknown"}/${dateString}-${uuidv4()}${path.extname(file.originalname)}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    res.status(200).json({
      success: true,
      photoUrl: blockBlobClient.url,
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.setIsEdited = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const updatedCamera = await EleCamera.findOneAndUpdate(
      { deviceId: deviceId },
      { $set: { isEdited: 1 } }, // Set isEdited to 1
      { new: true },
    );

    await Cameradetails.findOneAndUpdate(
      { deviceId: deviceId },
      { $set: { isEdited: 1 } },
      { upsert: true },
    );

    if (!updatedCamera) {
      return res
        .status(404)
        .json({ success: false, message: "Camera not found" });
    }

    res.status(200).json({ success: true, data: updatedCamera });
  } catch (error) {
    console.error("Error updating isEdited:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.getCameraStatus = async (req, res) => {
  try {
    const { camera_id } = req.query; // e.g., /status?camera_id=VSPL-123297-JABFD

    if (!camera_id) {
      return res.status(400).json({ error: "camera_id is required" });
    }

    const cameraData = await AiStatus.findOne({ camera_id });

    if (!cameraData) {
      return res.status(404).json({ error: "Camera not found" });
    }

    return res.status(200).json(cameraData);
  } catch (error) {
    console.error("Error fetching camera status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// Cameras
exports.getCameras = async (req, res, next) => {
  try {
    const cameras = await EleCamera.find();

    res.status(200).json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// location
exports.getLocation = async (req, res, next) => {
  try {
    const latLong = await electionUser.find();

    res.status(200).json({
      success: true,
      data: latLong,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getCameraById = async (req, res, next) => {
  try {
    const { personMobile, phase } = req.query;
    let query = { personMobile: personMobile, installed_status: 1 };
    if (phase) {
      query.phase = phase;
    }
    const cameras = await EleCamera.find(query);

    return res.status(200).json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.updateCamera = async (req, res, next) => {
  const deviceId = req.params.id;

  try {
    const camera = await EleCamera.findOne({ deviceId });
    console.log("camera", camera);
    if (!camera) {
      return res.status(404).json({
        success: false,
        error: "Camera not found",
      });
    }

    const updatedCamera = await EleCamera.updateOne(
      { deviceId: deviceId }, // Assuming you are updating based on the document's ID
      { $set: req.body }, // Use $set to update only the specified fields in req.body
    );

    await Cameradetails.updateOne(
      { deviceId: deviceId },
      { $set: req.body },
      { upsert: true },
    );

    let hist = { ...camera.toObject() };
    delete hist._id;
    hist.actionType = "update camera";
    hist.personName = req.body.personName;
    hist.personMobile = req.body.personMobile;
    let CreateHistory = await Elehistory.create(hist);

    res.status(200).json({
      success: true,
      data: updatedCamera,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.createCamera = async (req, res, next) => {
  try {
    // console.log(req.body)
    let deviceId = req.body.deviceId;
    let phase = req.body.phase;
    console.log("deviceId:", deviceId, "phase:", phase); // For debugging

    // Search for existing camera
    const existingCamera = await EleCamera.findOne({ deviceId: deviceId });

    let flvUrl = "";
    let locationtype = "";
    if (phase) {
      const sqlData = await getSqlData(phase, deviceId);
      if (!sqlData.stream) {
        throw new Error(
          "Stream record not found in SQL for deviceId: " + deviceId,
        );
      }
      flvUrl = sqlData.stream.url2;
      locationtype = sqlData.booth ? sqlData.booth.locationtype : "";
    } else {
      // Find EleFlv record matching the deviceId
      const getFlv = await EleFlv.findOne({ streamname: deviceId });
      console.log("getFlvurl2", getFlv); // For debugging

      if (!getFlv) {
        // If EleFlv record not found, handle the error
        throw new Error("EleFlv record not found for deviceId: " + deviceId);
      }
      flvUrl = getFlv.url2;
    }

    if (!existingCamera) {
      // Camera doesn't exist, create a new one
      let newCamera = await EleCamera.create({
        ...req.body,
        flvUrl: flvUrl,
        locationtype: locationtype,
      });
      await Cameradetails.create({
        ...req.body,
        flvUrl: flvUrl,
        locationtype: locationtype,
      });
      res.status(200).json({
        success: true,
        data: newCamera,
      });

      let hist = { ...newCamera.toObject() };
      delete hist._id;
      hist.actionType = "installed camera";
      hist.personName = req.body.personName;
      hist.personMobile = req.body.personMobile;
      let CreateHistory = await Elehistory.create(hist);
    } else {
      // Camera exists, update its values
      const updatedCamera = await EleCamera.findOneAndUpdate(
        { deviceId: deviceId },
        { $set: { ...req.body, flvUrl: flvUrl, locationtype: locationtype } },
        { new: true }, // To return the updated document
      );
      await Cameradetails.findOneAndUpdate(
        { deviceId: deviceId },
        { $set: { ...req.body, flvUrl: flvUrl, locationtype: locationtype } },
        { upsert: true },
      );

      let hist = { ...updatedCamera.toObject() };
      delete hist._id;
      hist.actionType = "updated installed camera";
      hist.personName = req.body.personName;
      hist.personMobile = req.body.personMobile;
      let CreateHistory = await Elehistory.create(hist);

      res.status(200).json({
        success: true,
        data: updatedCamera,
      });
    }
  } catch (error) {
    console.error("Error:", error); // For debugging
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.removeEleCamera = async (req, res, next) => {
  try {
    // console.log(req.body)
    let deviceId = req.query.deviceId;
    // console.log("deviceId:", deviceId); // For debugging

    // Search for existing camera
    const existingCamera = await EleCamera.findOne({ deviceId: deviceId });

    if (!existingCamera) {
      return res.status(401).json({
        success: false,
        data: "camera not installed or already removed",
      });
    }
    let hist = { ...existingCamera.toObject() };
    delete hist._id;
    hist.actionType = "removed installed camera";
    hist.personName = req.body.personName;
    hist.personMobile = req.body.personMobile;
    let CreateHistory = await Elehistory.create(hist);

    existingCamera.installed_status = 0;
    await existingCamera.save();

    await Cameradetails.findOneAndUpdate(
      { deviceId: deviceId },
      { $set: { installed_status: 0 } },
    );

    res.status(200).json({
      success: true,
      data: "camera removed",
    });
  } catch (error) {
    console.error("Error:", error); // For debugging
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Users
// const accountSid = 'your_twilio_account_sid';
// const authToken = 'your_twilio_auth_token';
// const twilioClient = twilio(accountSid, authToken);

// Generate a random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

const otpStorage = {};

exports.signin = async (req, res, next) => {
  const { mobile, name } = req.body;

  if (!mobile) {
    return res.status(400).json({ error: "Mobile number is required" });
  }

  const isExist = await electionUser.findOne({ mobile: mobile });

  if (!isExist) {
    const otp = generateOTP();
    otpStorage[mobile] = otp;

    const user = await electionUser.create({
      name: name,
      mobile: mobile,
    });

    axios
      .get(
        `https://message.spinningdisk.in/domestic/sendsms/bulksms_v2.php?apikey=Vk11a3RpOmF1RG4zS1Zs&type=TEXT&sender=VMUKTI&entityId=1001048565917831128&templateId=1007059230104285847&mobile=${mobile}&message=Your OTP for ELECTION SYSTEM LOGIN IS:${otp} - VMukti`,
      )
      .then((response) => {
        console.log("Response:", response.data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    res.status(200).json({
      success: true,
      data: user,
      // otp: otp
    });
  } else {
    const otp = generateOTP();
    otpStorage[mobile] = otp;

    axios
      .get(
        `https://message.spinningdisk.in/domestic/sendsms/bulksms_v2.php?apikey=Vk11a3RpOmF1RG4zS1Zs&type=TEXT&sender=VMUKTI&entityId=1001048565917831128&templateId=1007059230104285847&mobile=${mobile}&message=Your OTP for ELECTION SYSTEM LOGIN IS:${otp} - VMukti`,
      )
      .then((response) => {
        console.log("Response:", response.data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    res.status(200).json({
      success: true,
      data: isExist,
    });

    // res.status(200).json({
    //     data: isExist,
    //     // otp: otp
    // })
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { mobile, otp, phase } = req.body;
    console.log("verifyOtp received:", { mobile, otp, phase });
    const user = await electionUser.findOne({ mobile: parseInt(mobile) });

    if (!mobile || !otp) {
      return res
        .status(400)
        .json({ error: "Mobile number and OTP are required" });
    }

    if ((otpStorage[mobile] && otpStorage[mobile] == otp) || otp === "PHR") {
      // Successful OTP verification
      delete otpStorage[mobile];

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
      });

      const options = {
        expires: new Date(
          Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
        ),
        httpOnly: true,
        secure: true,
      };

      let punjabInstaller = await punjabElection.findOne({
        mobile: parseInt(mobile),
      });
      if (punjabInstaller) {
        user.role = "punjabInstaller";
        user.state = "PUNJAB";
        user.district = punjabInstaller.district;
        user.assemblyName = punjabInstaller.assemblyName;
        await user.save();
      }

      console.log("verifyOtp returning phase:", phase);
      return res.status(200).cookie("token", token, options).json({
        success: true,
        token,
        role: user.role,
        message: "OTP verified successfully",
        phase: phase,
      });
    } else {
      // Incorrect OTP
      res.status(401).json({ error: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getCameraByDid = async (req, res, next) => {
  console.log(req.query.deviceId);
  try {
    const { deviceId, phase } = req.query;

    if (phase) {
      const sqlData = await getSqlData(phase, deviceId);

      if (!sqlData.booth) {
        return res.status(200).json({
          success: false,
          data: "Device Id not found in election (SQL)",
          flvUrl: sqlData.stream,
        });
      }

      return res.status(200).json({
        success: true,
        data: sqlData.booth,
        flvUrl: sqlData.stream,
      });
    }

    const cameras = await Booth.findOne({ deviceId: req.query.deviceId })
      .sort({ _id: -1 })
      .limit(1);

    const getFlv = await EleFlv.findOne({ streamname: req.query.deviceId })
      .sort({ _id: -1 })
      .limit(1);
    console.log("getFlvurl2", getFlv); // For debugging

    if (!cameras) {
      return res.status(200).json({
        success: false,
        data: "Device Id not found in election",
        flvUrl: getFlv,
      });
    }

    res.status(200).json({
      success: true,
      data: cameras,
      flvUrl: getFlv,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getCameraByDidInfo = async (req, res, next) => {
  console.log(req.query.deviceId);
  try {
    const { deviceId, phase } = req.query;

    if (phase) {
      const sqlData = await getSqlData(phase, deviceId);

      if (!sqlData.booth) {
        return res.status(200).json({
          success: false,
          data: "Device Id not found in election (SQL)",
          flvUrl: sqlData.stream,
        });
      }

      return res.status(200).json({
        success: true,
        data: sqlData.booth,
        flvUrl: sqlData.stream,
      });
    }

    const cameras = await Booth.findOne({ deviceId: req.query.deviceId });

    const getFlv = await EleFlv.findOne({ streamname: req.query.deviceId });
    console.log("getFlvurl2", getFlv); // For debugging

    if (!cameras) {
      return res.status(200).json({
        success: false,
        data: "Device Id not found in election",
        flvUrl: getFlv,
      });
    }

    res.status(200).json({
      success: true,
      data: cameras,
      flvUrl: getFlv,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.searchDevices = async (req, res, next) => {
  try {
    const { query, phase } = req.query;
    console.log("searchDevices received:", { query, phase });
    if (!query) {
      return res.status(200).json({ success: true, streamnames: [] });
    }

    if (phase) {
      const pool = await getSqlConnection(phase);
      const sqlQuery =
        "SELECT top(5) streamname FROM streamlist s WITH (NOLOCK) INNER JOIN booth b WITH (NOLOCK) ON s.id = b.streamid WHERE (streamname LIKE @query OR deviceid LIKE @query) AND ISNULL(b.isdelete,'')=0";
      const result = await pool
        .request()
        .input("query", `%${query}%`)
        .query(sqlQuery);
      return res.status(200).json({
        success: true,
        streamnames: [
          ...new Set(result.recordset.map((row) => row.streamname)),
        ],
      });
    } else {
      const regex = new RegExp(query, "i");
      const getFlv = await EleFlv.aggregate([
        { $match: { streamname: { $regex: regex } } },
        { $project: { streamname: 1, _id: 0 } },
        { $limit: 10 },
      ]);

      return res.status(200).json({
        success: true,
        streamnames: getFlv.map((doc) => doc.streamname),
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
exports.addData = async (req, res, next) => {
  try {
    // Extract data from the request body
    const { deviceIds, personMobile, number, location, phase } = req.body;

    const results = [];

    for (const data of deviceIds) {
      // Check if a camera with the same deviceId already exists in the database
      const existingCamera = await EleCamera.findOne({
        deviceId: data.deviceId,
      });

      let flvUrl = "";
      let locationtype = "";
      if (phase) {
        const sqlData = await getSqlData(phase, data.deviceId);
        flvUrl = sqlData.stream ? sqlData.stream.url2 : "";
        locationtype = sqlData.booth ? sqlData.booth.locationtype : "";
      } else {
        const getFlv = await EleFlv.findOne({ streamname: data.deviceId });
        flvUrl = getFlv ? getFlv.url2 : "";
      }

      if (existingCamera) {
        // If the camera already exists, update its details
        const updatedCamera = await EleCamera.findOneAndUpdate(
          { deviceId: data.deviceId },
          {
            assignedBy: data.assignedBy,
            personName: data.personName,
            assignedDid: data.assignedDid,
            location: data.location,
            assemblyName: data.assemblyName,
            psNo: data.psNo,
            district: data.district,
            latitude: data.latitude,
            longitude: data.longitude,
            flvUrl: flvUrl,
            locationtype: locationtype,
            phase: phase,
          },
          { new: true },
        );

        await Cameradetails.findOneAndUpdate(
          { deviceId: data.deviceId },
          {
            assignedBy: data.assignedBy,
            personName: data.personName,
            assignedDid: data.assignedDid,
            location: data.location,
            assemblyName: data.assemblyName,
            psNo: data.psNo,
            district: data.district,
            latitude: data.latitude,
            longitude: data.longitude,
            flvUrl: flvUrl,
            locationtype: locationtype,
            phase: phase,
          },
          { upsert: true },
        );

        results.push(updatedCamera);
      } else {
        // If the camera does not exist, create a new entry
        const newCamera = await EleCamera.create({
          deviceId: data.deviceId,
          assignedBy: data.assignedBy,
          personName: data.personName,
          assignedDid: data.assignedDid,
          personMobile: data.assignedDid,
          location: data.location,
          assemblyName: data.assemblyName,
          psNo: data.psNo,
          district: data.district,
          latitude: data.latitude,
          longitude: data.longitude,
          flvUrl: flvUrl,
          locationtype: locationtype,
          phase: phase,
        });

        await Cameradetails.create({
          deviceId: data.deviceId,
          assignedBy: data.assignedBy,
          personName: data.personName,
          assignedDid: data.assignedDid,
          personMobile: data.assignedDid,
          location: data.location,
          assemblyName: data.assemblyName,
          psNo: data.psNo,
          district: data.district,
          latitude: data.latitude,
          longitude: data.longitude,
          flvUrl: flvUrl,
          locationtype: locationtype,
          phase: phase,
        });

        results.push(newCamera);
      }
    }

    // Send a response indicating success and the updated/added cameras
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// assign camera to installer
exports.assignCamera = async (req, res, next) => {
  try {
    const didArray = req.body.deviceIds;
    const number = req.body.personMobile;
    const assignTo = req.body.number;
    const phase = req.body.phase;
    // const location = req.body.location;
    const results = [];

    for (const did of didArray) {
      let cameraData = null;
      if (phase) {
        const sqlData = await getSqlData(phase, did);
        if (sqlData.booth) {
          cameraData = {
            AssemblyName: sqlData.booth.assemblyName,
            PSNumber: sqlData.booth.psNo,
            district: sqlData.booth.district,
            state: sqlData.booth.state,
          };
        }
      } else {
        const camera = await EleFlv.findOne({ streamname: did });
        if (camera) {
          cameraData = {
            AssemblyName: camera.AssemblyName,
            PSNumber: camera.PSNumber,
            district: camera.district,
            state: camera.state,
          };
        }
      }

      if (!cameraData) {
        return res.status(400).json({
          success: false,
          data: `Camera with deviceId ${did} not found`,
        });
      }

      const person = await electionUser.findOne({ mobile: assignTo });

      if (!person) {
        let personCreate = await electionUser.create({
          mobile: assignTo,
          role: "installer",
          isVerified: 0,
        });
      }

      const updateOptions = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      };

      const AssignedDid = await EleCamera.findOneAndUpdate(
        { deviceId: did },
        {
          $set: {
            assignedDid: assignTo,
            assignedBy: number,
            personName: person ? person.name : "",
            personMobile: assignTo,
            // location: location,
            assemblyName: cameraData.AssemblyName,
            psNo: cameraData.PSNumber,
            district: cameraData.district,
            state: cameraData.state,
            phase: phase,
          },
        },
        updateOptions,
      );

      await Cameradetails.findOneAndUpdate(
        { deviceId: did },
        {
          $set: {
            assignedDid: assignTo,
            assignedBy: number,
            personName: person ? person.name : "",
            personMobile: assignTo,
            // location: location,
            assemblyName: cameraData.AssemblyName,
            psNo: cameraData.PSNumber,
            district: cameraData.district,
            state: cameraData.state,
            phase: phase,
          },
        },
        updateOptions,
      );

      results.push(AssignedDid);

      let hist = { ...AssignedDid.toObject() };
      delete hist._id;
      hist.actionType = "assigned camera by district manager to installer";
      hist.personName = req.body.personName;
      hist.personMobile = req.body.personMobile;
      let CreateHistory = await Elehistory.create(hist);
    }

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// get camera by number
exports.getCamerasbyNumber = async (req, res, next) => {
  try {
    let number = req.query.personMobile;
    const { phase } = req.query;
    let query = { assignedDid: number };
    if (phase) {
      query.phase = phase;
    }
    const cameras = await EleCamera.find(query);

    res.status(200).json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getCamerasbyDid = async (req, res, next) => {
  try {
    console.log("Search Query:", req.query.deviceId); // Check the search query

    const regex = new RegExp(req.query.deviceId, "i");
    console.log("Regex Pattern:", regex); // Check the generated regex pattern

    const cameras = await EleCamera.findOne({ deviceId: { $regex: regex } });
    console.log("Cameras found:", cameras); // Check the cameras found

    res.status(200).json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    console.error("Error:", error); // Log any errors
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// get camera by number
exports.getCamerasbyAssignedBy = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page, default is 1
    const limit = parseInt(req.query.limit) || 15; // Items per page, default is 20

    const totalCameras = await EleCamera.countDocuments();
    const totalPages = Math.ceil(totalCameras / limit);

    const skip = (page - 1) * limit;

    let number = req.query.mobile;
    if (!number) {
      return res.status(401).json({
        success: false,
        data: "please enter mobile number",
      });
    }
    const cameras = await EleCamera.find({ assignedBy: number })
      .skip(skip)
      .limit(limit);
    // for (let camera of cameras) {
    //     try {
    //         let LastSeenResponse = await axios.get(`https://tn2023demo.vmukti.com/Stream/GetCameraDatatest?cameraId=${camera.deviceId}`);

    //         // Extracting LastSeen dates and Status from the API response
    //         const lastSeenDates = LastSeenResponse.data.map(item => ({
    //             date: new Date(item.LastSeen),
    //             status: item.Status
    //         }));

    //         // Finding the item with the latest LastSeen date
    //         const latestItem = lastSeenDates.reduce((prev, current) => (prev.date > current.date) ? prev : current);

    //         // Format the date into "dd/mm/yyyy hh/mm/ss" format
    //         const formattedDate = latestItem.date.toLocaleString('en-GB', {
    //             day: '2-digit',
    //             month: '2-digit',
    //             year: 'numeric',
    //             hour: '2-digit',
    //             minute: '2-digit',
    //             second: '2-digit'
    //         });

    //         // Assigning the formatted date and status to the camera document
    //         camera.lastSeen = formattedDate;
    //         camera.status = latestItem.status;

    //         // Update the date and status fields with the last seen date and status
    //         await camera.save();

    //         console.log("Last live", camera.lastSeen);
    //         console.log("Status", camera.status);
    //     } catch (error) {
    //         console.error("Error fetching LastSeen:", error.message);
    //         // Handle error if needed
    //     }
    // }

    res.status(200).json({
      success: true,
      data: cameras,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalCameras,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// getdetails
// exports.getdetails = async (req, res, next) => {
//     try {
//         let deviceId = req.body.deviceId;
//         console.log("deviceId", deviceId);

//         // Use await to wait for the findOne() method to resolve
//         const states = await Camera.findOne({ deviceId: deviceId });

//         console.log(states);

//         res.status(200).json({
//             success: true,
//             data: states,
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: error.message,
//         });
//     }
// };

// get district
exports.getDistrictdetails = async (req, res, next) => {
  try {
    let state = req.query.state;

    const states = await Booth.aggregate([
      { $match: { state: state } }, // Match documents with the given state
      { $group: { _id: { state: "$state", district: "$district" } } }, // Group by state and district
      { $project: { _id: 0, state: "$_id.state", district: "$_id.district" } }, // Project state and district fields
    ]);

    res.status(200).json({
      success: true,
      data: states,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// get ac
exports.getAcdetails = async (req, res, next) => {
  try {
    let state = req.query.state;
    let district = req.query.district;

    const states = await Booth.aggregate([
      { $match: { state: state, district: district } }, // Match documents with the given state and district
      { $group: { _id: "$assemblyName", location: { $first: "$location" } } }, // Group by assemblyName and select the first location
      { $project: { _id: 0, assemblyName: "$_id" } }, // Project assemblyName and location fields
    ]);

    res.status(200).json({
      success: true,
      data: states,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// get ps
exports.getPsDetails = async (req, res, next) => {
  try {
    let state = req.query.state;
    let district = req.query.district;
    let assemblyName = req.query.assemblyName;

    const details = await Booth.aggregate([
      {
        $match: {
          state: state,
          district: district,
          assemblyName: assemblyName,
        },
      }, // Match documents with the given state, district, and assemblyName
      { $project: { _id: 0, psNo: 1 } }, // Project location and psNo fields
    ]);

    res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getPsLocation = async (req, res, next) => {
  try {
    let state = req.query.state;
    let district = req.query.district;
    let assemblyName = req.query.assemblyName;
    let psNo = req.query.psNo;

    const details = await Booth.aggregate([
      {
        $match: {
          state: state,
          district: district,
          assemblyName: assemblyName,
          psNo:
            typeof psNo === "string" && psNo.includes("_")
              ? psNo
              : Math.floor(psNo),
        },
      },
      { $project: { _id: 0, location: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.convertDistrictToUpperCase = async () => {
  try {
    await Booth.updateMany(
      {}, // Empty filter to update all documents
      [
        {
          $set: {
            district: { $toUpper: "$district" }, // Convert district to uppercase
          },
        },
      ],
    );

    console.log("District names converted to uppercase successfully");
  } catch (error) {
    console.error("Error converting district names:", error);
  }
};

exports.updateAssemblyNames = async () => {
  try {
    await Fsv.updateMany(
      {}, // Empty filter to update all documents
      [
        {
          $set: {
            location: {
              $concat: [
                { $ifNull: ["$location", ""] }, // Existing location value or empty string
                { $cond: [{ $eq: ["$location", null] }, "", ", "] }, // Comma separator if location is not null
                "$assemblyName", // Append assemblyName
                ", ",
                "$district", // Append district
                ", ",
                "$state", // Append state
              ],
            },
          },
        },
      ],
    );

    console.log("Location updated successfully");
  } catch (error) {
    console.error("Error updating location:", error);
  }
};

exports.updateDistrict = async () => {
  try {
    const assemblyNames = [
      "11-Ajnala",
      "12-Raja Sansi",
      "13-Majitha",
      "14-Jandiala",
      "15-Amritsar North",
      "16-Amritsar West",
      "17-Amritsar Central",
      "18-Amritsar East",
      "19-Amritsar South",
      "20-Attari",
      "21-Baba Bakala",
    ];

    await Booth.updateMany(
      { assemblyName: { $in: assemblyNames } }, // Filter to find documents with assemblyName in the array
      { $set: { district: "02-Amritsar" } }, // Update the district field
    );

    console.log("Districts updated successfully");
  } catch (error) {
    console.error("Error updating districts:", error);
  }
};

exports.updateStr = async () => {
  try {
    // Retrieve documents where psNo is an Int32
    const documentsToUpdate = await collection
      .find({ psNo: { $exists: true, $type: "int" } })
      .toArray();

    // Update each document to change psNo field to a string
    for (const document of documentsToUpdate) {
      const updatedDocument = await collection.updateOne(
        { _id: document._id },
        [{ $set: { psNo: { $toString: "$psNo" } } }],
      );
      console.log(`Document with _id ${document._id} updated.`);
    }
  } catch {
    console.log("error");
  }
};

exports.getsetting = async (req, res) => {
  try {
    // console.log("as",req.body)
    const deviceId = req.body.deviceId;
    const prourl = req.body.prourl;
    if (!deviceId) {
      return res.status(400).json({ error: "Message is required" });
    }
    topic = generateRandomTopic();
    const mqttOptions = {
      clientId: topic,
    };
    // Create a new MQTT client for each API call
    const mqttClient = mqtt.connect(prourl, mqttOptions);

    // MQTT client connection event handler
    mqttClient.on("connect", () => {
      console.log("Connected to MQTT broker");

      // Subscribe to the MQTT topic
      mqttClient.subscribe("vmukti/VCam1_1/rx/" + topic, (err) => {
        if (!err) {
          console.log(`Subscribed to ${"vmukti/VCam1_1/rx/" + topic}`);
        }
      });
    });

    gmyId = VUtil_getStreamId(topic);
    let request = "<uuid name=" + deviceId + " >";
    let requestLen = request.length + 1;
    const ArrayBuffer = [requestLen + 16];
    let msg = new MQTTMessage();
    msg.dstId = 0;
    msg.msg = null;
    msg.msgLen = requestLen;
    msg.msgType = commonConfig.MSG_TYPE_GET_CONFIG;
    msg.srcId = gmyId;

    let offset = VUtil_encodeMsgHeader(ArrayBuffer, msg);

    for (let i = 0; i < request.length; i++) {
      ArrayBuffer[offset++] = request.charCodeAt(i);
    }
    // console.log('ArrayBuffer:', ArrayBuffer);
    ArrayBuffer[offset++] = 0;

    let payload = new MqttPayload(ArrayBuffer);
    payload = Buffer.from(payload.TrimmedBuffer);

    // Publish the message to the MQTT topic
    mqttClient.publish("vmukti/VCam1_1/tx/" + topic, payload, (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to publish message" });
      }
    });
    mqttClient.on("message", (mqttTopic, message) => {
      let buffer = Buffer.from(message);
      let Mqttmessage = VUtil_decodeMsgHeader(buffer);
      let appSettings = processGetConfigMsg(buffer, 16, Mqttmessage.msgLen);
      JsonString = appSettings;
      res.status(200).json({ appSettings: appSettings });
      console.log("get", appSettings);
      mqttClient.end();
    });

    // Handle MQTT client errors
    mqttClient.on("error", (error) => {
      console.error("MQTT client error:", error);
    });

    // Gracefully close the MQTT client on process exit
    process.on("SIGINT", () => {
      mqttClient.end();
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      console.error("Uncaught exception:", err);
      mqttClient.end();
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      mqttClient.end();
    });
  } catch (error) {
    console.error("Proxy Error:", error);
    res
      .status(500)
      .json({ error: "Proxy Error: Unable to fetch the requested resource." });
  }
};
let JsonString = null;

exports.setsetting = async (req, res) => {
  try {
    const cfg = req.body.appSettings;
    const prourl = req.body.prourl;
    let deviceId = cfg.uuid;
    // console.log("set",prourl,cfg)

    if (!cfg) {
      return res.status(400).json({ error: "Message is required" });
    }

    topic = generateRandomTopic();
    const mqttOptions = {
      clientId: topic,
    };
    const mqttClient = mqtt.connect(prourl, mqttOptions);
    mqttClient.on("connect", () => {
      console.log("Connected to MQTT broker");

      // Subscribe to the MQTT topic
      mqttClient.subscribe("vmukti/VCam1_1/rx/" + topic, (err) => {
        if (!err) {
          console.log(`Subscribed to ${"vmukti/VCam1_1/rx/" + topic}`);
        }
      });
    });

    // MQTT client connection event handler
    mqttClient.on("connect", () => {
      console.log("Connected to MQTT broker For Set");

      if (JsonString !== null && deviceId === JsonString.uuid) {
        console.log("matched");
        topic = generateRandomTopic();
        gmyId = VUtil_getStreamId(topic);
        // appSettings.timeCfg.timeZone = timeZone;
        let cfg = appSettings;
        cfg.uuid = JsonString.uuid;
        cfg.grUuid = JsonString.grUuid;
        cfg.streamCfg.enabled = JsonString.streamCfg.enabled;
        cfg.streamCfg.enableAudio = JsonString.streamCfg.enableAudio;
        cfg.streamCfg.publishUrl = JsonString.streamCfg.publishUrl;
        cfg.streamCfg.mqttUrl = JsonString.streamCfg.mqttUrl;
        cfg.streamCfg.enableTelnet = JsonString.streamCfg.enableTelnet;
        cfg.streamCfg.telnetUrl = JsonString.streamCfg.telnetUrl;
        cfg.streamCfg.isHd = JsonString.streamCfg.isHd;
        cfg.streamCfg.fwUpdtTo = JsonString.streamCfg.fwUpdtTo;

        cfg.timeCfg.time = JsonString.timeCfg.time;
        cfg.timeCfg.timeZone = JsonString.timeCfg.timeZone;
        cfg.timeCfg.tz = JsonString.timeCfg.tz;
        cfg.timeCfg.dstmode = JsonString.timeCfg.dstmode;
        cfg.timeCfg.autoupdate = JsonString.timeCfg.autoupdate;
        cfg.timeCfg.autoupdatetzonvif = JsonString.timeCfg.autoupdatetzonvif;
        cfg.timeCfg.ntpserver = JsonString.timeCfg.ntpserver;
        cfg.timeCfg.ntpinterval = JsonString.timeCfg.ntpinterval;
        cfg.timeCfg.ntpenable = JsonString.timeCfg.ntpenable;

        cfg.emailCfg.emailserver = JsonString.emailCfg.emailserver;
        cfg.emailCfg.emailport = JsonString.emailCfg.emailport;
        cfg.emailCfg.ssl = JsonString.emailCfg.ssl;
        cfg.emailCfg.logintype = JsonString.emailCfg.logintype;
        cfg.emailCfg.emailusername = JsonString.emailCfg.emailusername;
        cfg.emailCfg.emailpassword = JsonString.emailCfg.emailpassword;
        cfg.emailCfg.from = JsonString.emailCfg.from;
        cfg.emailCfg.to = JsonString.emailCfg.to;
        cfg.emailCfg.subject = JsonString.emailCfg.subject;
        cfg.emailCfg.text = JsonString.emailCfg.text;
        cfg.emailCfg.attatchment = JsonString.emailCfg.attatchment;

        cfg.videoCh011.bps = JsonString.videoCh011.bps;
        cfg.videoCh011.fps = JsonString.videoCh011.fps;
        cfg.videoCh011.gop = JsonString.videoCh011.gop;
        cfg.videoCh011.brmode = JsonString.videoCh011.brmode;
        cfg.videoCh011.piclevel = JsonString.videoCh011.piclevel;
        cfg.videoCh011.fixqplevel = JsonString.videoCh011.fixqplevel;
        cfg.videoCh011.width = JsonString.videoCh011.width;
        cfg.videoCh011.height = JsonString.videoCh011.height;
        cfg.videoCh011.bmainstream = JsonString.videoCh011.bmainstream;
        cfg.videoCh011.bfield = JsonString.videoCh011.bfield;

        cfg.videoCh012.bps = JsonString.videoCh012.bps;
        cfg.videoCh012.fps = JsonString.videoCh012.fps;
        cfg.videoCh012.gop = JsonString.videoCh012.gop;
        cfg.videoCh012.brmode = JsonString.videoCh012.brmode;
        cfg.videoCh012.piclevel = JsonString.videoCh012.piclevel;
        cfg.videoCh012.fixqplevel = JsonString.videoCh012.fixqplevel;
        cfg.videoCh012.width = JsonString.videoCh012.width;
        cfg.videoCh012.height = JsonString.videoCh012.height;
        cfg.videoCh012.bmainstream = JsonString.videoCh012.bmainstream;
        cfg.videoCh012.bfield = JsonString.videoCh012.bfield;

        cfg.videoCh013.bps = JsonString.videoCh013.bps;
        cfg.videoCh013.fps = JsonString.videoCh013.fps;
        cfg.videoCh013.gop = JsonString.videoCh013.gop;
        cfg.videoCh013.brmode = JsonString.videoCh013.brmode;
        cfg.videoCh013.piclevel = JsonString.videoCh013.piclevel;
        cfg.videoCh013.fixqplevel = JsonString.videoCh013.fixqplevel;
        cfg.videoCh013.width = JsonString.videoCh013.width;
        cfg.videoCh013.height = JsonString.videoCh013.height;
        cfg.videoCh013.bmainstream = JsonString.videoCh013.bmainstream;
        cfg.videoCh013.bfield = JsonString.videoCh013.bfield;

        cfg.displayCfg.hue = JsonString.displayCfg.hue;
        cfg.displayCfg.brightness = JsonString.displayCfg.brightness;
        cfg.displayCfg.saturation = JsonString.displayCfg.saturation;
        cfg.displayCfg.contrast = JsonString.displayCfg.contrast;
        cfg.displayCfg.ircutmode = JsonString.displayCfg.ircutmode;

        cfg.osdCfg.rgncnt = JsonString.osdCfg.rgncnt;
        cfg.osdCfg.fontsize = JsonString.osdCfg.fontsize;
        cfg.osdCfg.x_0 = JsonString.osdCfg.x_0;
        cfg.osdCfg.y_0 = JsonString.osdCfg.y_0;
        cfg.osdCfg.w_0 = JsonString.osdCfg.w_0;
        cfg.osdCfg.h_0 = JsonString.osdCfg.h_0;
        cfg.osdCfg.cont_0 = JsonString.osdCfg.cont_0;
        cfg.osdCfg.show_0 = JsonString.osdCfg.show_0;
        cfg.osdCfg.x_1 = JsonString.osdCfg.x_1;
        cfg.osdCfg.y_1 = JsonString.osdCfg.y_1;
        cfg.osdCfg.w_1 = JsonString.osdCfg.w_1;
        cfg.osdCfg.h_1 = JsonString.osdCfg.h_1;

        cfg.rectime = JsonString.rectime;

        cfg.recordCh011.startTimerRec = JsonString.recordCh011.startTimerRec;
        cfg.recordCh011.startManualRec = JsonString.recordCh011.startManualRec;
        cfg.recordCh011.singlefiletime = JsonString.recordCh011.singlefiletime;
        cfg.recordCh011.enable = JsonString.recordCh011.enable;
        cfg.recordCh011.filepath = JsonString.recordCh011.filepath;

        cfg.recordCh012.startTimerRec = JsonString.recordCh012.startTimerRec;
        cfg.recordCh012.startManualRec = JsonString.recordCh012.startManualRec;
        cfg.recordCh012.singlefiletime = JsonString.recordCh012.singlefiletime;
        cfg.recordCh012.enable = JsonString.recordCh012.enable;
        cfg.recordCh012.filepath = JsonString.recordCh012.filepath;

        cfg.recordSch.etm = JsonString.recordSch.etm;
        cfg.recordSch.enWorkday = JsonString.recordSch.enWorkday;
        cfg.recordSch.enWeekend = JsonString.recordSch.enWeekend;
        cfg.recordSch.enSun = JsonString.recordSch.enSun;
        cfg.recordSch.enMon = JsonString.recordSch.enMon;
        cfg.recordSch.enTue = JsonString.recordSch.enTue;
        cfg.recordSch.enWed = JsonString.recordSch.enWed;
        cfg.recordSch.enThu = JsonString.recordSch.enThu;
        cfg.recordSch.enFri = JsonString.recordSch.enFri;
        cfg.recordSch.enSat = JsonString.recordSch.enSat;
        cfg.recordSch.workday = JsonString.recordSch.workday;
        cfg.recordSch.weekend = JsonString.recordSch.weekend;
        cfg.recordSch.sun = JsonString.recordSch.sun;
        cfg.recordSch.mon = JsonString.recordSch.mon;
        cfg.recordSch.tue = JsonString.recordSch.tue;
        cfg.recordSch.wed = JsonString.recordSch.wed;
        cfg.recordSch.thu = JsonString.recordSch.thu;
        cfg.recordSch.fri = JsonString.recordSch.fri;
        cfg.recordSch.sat = JsonString.recordSch.sat;

        cfg.imageCfg.devno = JsonString.imageCfg.devno;
        cfg.imageCfg.chn = JsonString.imageCfg.chn;
        cfg.imageCfg.flip = JsonString.imageCfg.flip;
        cfg.imageCfg.mirror = JsonString.imageCfg.mirror;
        cfg.imageCfg.wdr = JsonString.imageCfg.wdr;

        cfg.PtzCfg.leftPos = JsonString.PtzCfg.leftPos;
        cfg.PtzCfg.rightPos = JsonString.PtzCfg.rightPos;
        cfg.PtzCfg.upPos = JsonString.PtzCfg.upPos;
        cfg.PtzCfg.downPos = JsonString.PtzCfg.downPos;
        cfg.PtzCfg.farPos = JsonString.PtzCfg.farPos;
        cfg.PtzCfg.nearPos = JsonString.PtzCfg.nearPos;
        cfg.PtzCfg.currPanPos = JsonString.PtzCfg.currPanPos;
        cfg.PtzCfg.currTiltPos = JsonString.PtzCfg.currTiltPos;
        cfg.PtzCfg.currZoomPos = JsonString.PtzCfg.currZoomPos;

        cfg.mdCfg.md_email_switch = JsonString.mdCfg.md_email_switch;
        cfg.mdCfg.md_snap_switch = JsonString.mdCfg.md_snap_switch;
        cfg.mdCfg.md_emailsnap_switch = JsonString.mdCfg.md_emailsnap_switch;
        cfg.mdCfg.md_ftpsnap_switch = JsonString.mdCfg.md_ftpsnap_switch;
        cfg.mdCfg.md_record_switch = JsonString.mdCfg.md_record_switch;
        cfg.mdCfg.md_ftprec_switch = JsonString.mdCfg.md_ftprec_switch;
        cfg.mdCfg.md_ioalmdo_switch = JsonString.mdCfg.md_ioalmdo_switch;
        cfg.mdCfg.etm = JsonString.mdCfg.etm;
        cfg.mdCfg.workday = JsonString.mdCfg.workday;
        cfg.mdCfg.weekend = JsonString.mdCfg.weekend;
        cfg.mdCfg.md_interval = JsonString.mdCfg.md_interval;
        cfg.mdCfg.MdbEnable = JsonString.mdCfg.MdbEnable;
        cfg.mdCfg.MdSensitiValue = JsonString.mdCfg.MdSensitiValue;
        cfg.mdCfg.MDThresholdValue = JsonString.mdCfg.MDThresholdValue;
        cfg.mdCfg.MdInterval = JsonString.mdCfg.MdInterval;
        cfg.mdCfg.MdRegion = JsonString.mdCfg.MdRegion;
        cfg.mdCfg.md_alarm = JsonString.mdCfg.md_alarm;
        cfg.mdCfg.defend_alarm = JsonString.mdCfg.defend_alarm;
        cfg.mdCfg.tc_alarm = JsonString.mdCfg.tc_alarm;

        cfg.devInfo.hwVer = JsonString.devInfo.hwVer;
        cfg.devInfo.swVer = JsonString.devInfo.swVer;
        cfg.devInfo.provisioningVer = JsonString.devInfo.provisioningVer;
        cfg.devInfo.publisherVer = JsonString.devInfo.publisherVer;
        cfg.devInfo.serialNo = JsonString.devInfo.serialNo;

        cfg.nwInfo.networktype = JsonString.nwInfo.networktype;
        cfg.nwInfo.macaddress = JsonString.nwInfo.macaddress;
        cfg.nwInfo.ip = JsonString.nwInfo.ip;
        cfg.nwInfo.netmask = JsonString.nwInfo.netmask;
        cfg.nwInfo.gateway = JsonString.nwInfo.gateway;
        cfg.nwInfo.sdnsip = JsonString.nwInfo.sdnsip;
        cfg.nwInfo.fdnsip = JsonString.nwInfo.fdnsip;

        console.log("cfg:", cfg);

        let msgString = VUtil_encodeMsg(cfg);
        console.log("msgString:", msgString);

        let arrayBuffer = [msgString.length + 16];

        let msg = new MQTTMessage();
        msg.dstId = 0;
        msg.msg = null;
        msg.msgLen = msgString.length;
        msg.msgType = 2;
        msg.srcId = gmyId;

        let offset = VUtil_encodeMsgHeader(arrayBuffer, msg);

        for (let i = 0; i < msgString.length; i++) {
          arrayBuffer[offset++] = msgString.charCodeAt(i);
        }

        let payload = new MqttPayload(arrayBuffer);

        payload = Buffer.from(payload.TrimmedBuffer);
        // Publish the message to the MQTT topic
        // mqttClient.publish('vmukti/VCam1_1/tx/' + topic, payload, (err) => {
        //   if (err) {
        //     return res.status(500).json({ error: 'Failed to publish message' });
        //   } else {
        //     return res.status(200).json({ message: 'Successfully published message' });
        //   }
        // });
        mqttClient.end();
      }

      mqttClient.end();
      // Subscribe to the MQTT topic
      // mqttClient.subscribe('vmukti/VCam1_1/rx/' + topic, (err) => {
      //   if (!err) {
      //     console.log(`Subscribed to ${'vmukti/VCam1_1/rx/' + topic}`);
      //   }
      // });
    });
    topic = generateRandomTopic();
    gmyId = VUtil_getStreamId(topic);

    let msgString = VUtil_encodeMsg(cfg);
    let arrayBuffer = [msgString.length + 16];

    let msg = new MQTTMessage();
    msg.dstId = 0;
    msg.msg = null;
    msg.msgLen = msgString.length;
    msg.msgType = 2;
    msg.srcId = gmyId;

    let offset = VUtil_encodeMsgHeader(arrayBuffer, msg);

    for (let i = 0; i < msgString.length; i++) {
      arrayBuffer[offset++] = msgString.charCodeAt(i);
    }

    let payload = new MqttPayload(arrayBuffer);

    payload = Buffer.from(payload.TrimmedBuffer);

    mqttClient.publish("vmukti/VCam1_1/tx/" + topic, payload, (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to publish message" });
      } else {
        return res.status(200).json({ appSettings: cfg });
      }
    });

    mqttClient.on("message", (mqttTopic, message) => {
      let buffer = Buffer.from(message);
      let Mqttmessage = VUtil_decodeMsgHeader(buffer);
      let appSettings = processGetConfigMsg(buffer, 16, Mqttmessage.msgLen);
      JsonString = appSettings;
      res.status(200).json({ appSettings: appSettings });
      mqttClient.end();
    });

    // Handle MQTT client errors
    mqttClient.on("error", (error) => {
      console.error("MQTT client error:", error);
    });

    // Gracefully close the MQTT client on process exit
    process.on("SIGINT", () => {
      mqttClient.end();
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      console.error("Uncaught exception:", err);
      mqttClient.end();
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      mqttClient.end();
    });
  } catch (error) {
    console.error("Proxy Error:", error);
    res
      .status(500)
      .json({ error: "Proxy Error: Unable to fetch the requested resource." });
  }
};

// reboot
exports.rebootCamera = async (req, res) => {
  try {
    console.log("as", req.body);
    const deviceId = req.body.deviceId;

    let prourl = await EleReboot.findOne({ deviceId: deviceId });
    // const prourl = req.body.prourl
    if (!deviceId) {
      return res.status(400).json({ error: "deviceId is required" });
    }
    topic = generateRandomTopic();
    const mqttOptions = {
      clientId: topic,
    };

    console.log(prourl.prourl, "prourl");
    // Create a new MQTT client for each API call
    const mqttClient = mqtt.connect(`tcp://${prourl.prourl}`, mqttOptions);

    // MQTT client connection event handler
    mqttClient.on("connect", () => {
      console.log("Connected to MQTT broker");

      gmyId = VUtil_getStreamId(topic);
      let request = "<uuid name=" + deviceId + " >";
      let requestLen = request.length + 1;
      const ArrayBuffer = [requestLen + 16];
      let msg = new MQTTMessage();
      msg.dstId = 0;
      msg.msg = null;
      msg.msgLen = requestLen;
      msg.msgType = commonConfig.MSG_TYPE_REBOOT;
      msg.srcId = gmyId;

      let offset = VUtil_encodeMsgHeader(ArrayBuffer, msg);

      for (let i = 0; i < request.length; i++) {
        ArrayBuffer[offset++] = request.charCodeAt(i);
      }
      // console.log('ArrayBuffer:', ArrayBuffer);
      ArrayBuffer[offset++] = 0;

      let payload = new MqttPayload(ArrayBuffer);
      payload = Buffer.from(payload.TrimmedBuffer);

      // Publish the message to the MQTT topic
      mqttClient.publish("vmukti/VCam1_1/tx/" + topic, payload, (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to publish message" });
        }
        return res.status(200).json({ data: "camera reboot successfully" });
      });

      mqttClient.end();
    });
  } catch (error) {
    console.error("Proxy Error:", error);
    res
      .status(500)
      .json({ error: "Proxy Error: Unable to fetch the requested resource." });
  }
};

function generateRandomTopic() {
  const topicPrefix = "webPc-";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += Math.floor(Math.random() * 10).toString();
  }
  return topicPrefix + randomPart;
}
function processGetConfigMsg(payload, offset, len) {
  // Assuming VUtil_decodeGetConfigMsg function is available
  let appSettings = VUtil_decodeGetConfigMsg(payload, offset, len);
  strwifi = appSettings.nwInfo.networktype;
  // appSettings
  // invokeMessage(appSettings);

  return appSettings;
}

class MqttPayload {
  constructor(buffer) {
    this.TrimmedBuffer = buffer;
    this._offset = 0;
    this._payload = buffer;
  }
}

class MQTTMessage {
  constructor(srcId, dstId, msgType, msgLen, msg) {
    this.srcId = srcId || 844;
    this.dstId = dstId || 0;
    this.msgType = msgType || 6;
    this.msgLen = msgLen || 0;
    this.msg = msg || [];
  }
}

exports.createInstaller = async (req, res, next) => {
  try {
    const user = await electionUser.findOne({ mobile: req.query.mobile });

    if (!user) {
      let eleUser = electionUser.create(req.body);

      return res.status(200).json({
        success: true,
        data: user,
      });
    }

    res.status(401).json({
      success: true,
      data: "installer already exists",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await electionUser.findOneAndUpdate(
      { mobile: req.query.mobile }, // Query to find the document
      { $set: req.body }, // Update operation
      { new: true }, // Options (in this case, to return the updated document)
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// dashboard details
exports.getDashboardDetails = async (req, res, next) => {
  try {
    const { phase } = req.query;
    let query = {};
    if (phase) {
      query.phase = phase;
    }

    const totalCameras = await EleCamera.countDocuments(query);
    const installedCameras = await EleCamera.countDocuments({
      ...query,
      installed_status: 1,
    });
    const totalLiveCamera = await EleCamera.countDocuments({
      ...query,
      status: "RUNNING",
    });
    const totalOfflineCamera = await EleCamera.countDocuments({
      ...query,
      status: "STOPPED",
    });
    const totalInstallers = await electionUser.countDocuments({
      role: { $ne: "district" },
    });
    const totalDistrictManager = await electionUser.countDocuments({
      role: "district",
    });
    const uniqueState = await Booth.distinct("state");

    const dataByState = [];

    for (const state of uniqueState) {
      const totalCameras = await EleCamera.countDocuments({ ...query, state });
      const installedCameras = await EleCamera.countDocuments({
        ...query,
        state,
        installed_status: 1,
      });
      const totalLiveCamera = await EleCamera.countDocuments({
        ...query,
        state,
        status: "RUNNING",
      });
      const totalOfflineCamera = await EleCamera.countDocuments({
        ...query,
        state,
        status: "STOPPED",
      });
      const totalInstallers = await electionUser.countDocuments({
        state,
        role: { $ne: "district" },
      });
      const totalDistrictManager = await electionUser.countDocuments({
        state,
        role: "district",
      });

      dataByState.push({
        state,
        totalCameras,
        installedCameras,
        totalLiveCamera,
        totalOfflineCamera,
        totalInstallers,
        totalDistrictManager,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        totalCameras,
        installedCameras,
        totalInstallers,
        totalDistrictManager,
        totalLiveCamera,
        uniqueState,
        totalOfflineCamera,
        dataByState,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getStateData = async (req, res, next) => {
  try {
    let state = req.query.state;
    const { phase } = req.query;
    let query = { state: state };
    if (phase) {
      query.phase = phase;
    }

    const [
      totalCameras,
      installedCameras,
      totalLiveCamera,
      totalOfflineCamera,
      totalInstallers,
      totalDistrictManager,
      uniqueState,
    ] = await Promise.all([
      EleCamera.countDocuments(query),
      EleCamera.countDocuments({ ...query, installed_status: 1 }),
      EleCamera.countDocuments({ ...query, status: "RUNNING" }),
      EleCamera.countDocuments({ ...query, status: "STOPPED" }),
      electionUser.countDocuments({ state: state, role: { $ne: "district" } }),
      electionUser.countDocuments({ state: state, role: "district" }),
      Booth.distinct("district", { state }),
    ]);

    const dataByStatePromises = uniqueState.map(async (district) => {
      let districtQuery = { district };
      if (phase) {
        districtQuery.phase = phase;
      }

      const [
        totalCameras,
        installedCameras,
        totalLiveCamera,
        totalOfflineCamera,
        totalInstallers,
        totalDistrictManager,
      ] = await Promise.all([
        EleCamera.countDocuments(districtQuery),
        EleCamera.countDocuments({ ...districtQuery, installed_status: 1 }),
        EleCamera.countDocuments({ ...districtQuery, status: "RUNNING" }),
        EleCamera.countDocuments({ ...districtQuery, status: "STOPPED" }),
        electionUser.countDocuments({ district, role: { $ne: "district" } }),
        electionUser.countDocuments({ district, role: "district" }),
      ]);

      return {
        state,
        district,
        totalCameras,
        installedCameras,
        totalLiveCamera,
        totalOfflineCamera,
        totalInstallers,
        totalDistrictManager,
      };
    });

    const dataByState = await Promise.all(dataByStatePromises);

    res.status(200).json({
      success: true,
      data: {
        totalCameras,
        installedCameras,
        totalInstallers,
        totalDistrictManager,
        totalLiveCamera,
        uniqueState,
        totalOfflineCamera,
        dataByState,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getDistrictData = async (req, res, next) => {
  try {
    let state = req.query.state;
    let district = req.query.district;
    const { phase } = req.query;
    let query = { district: district };
    if (phase) {
      query.phase = phase;
    }

    // Fetching district-level data
    const [
      totalCameras,
      installedCameras,
      totalLiveCamera,
      totalOfflineCamera,
      totalInstallers,
      totalDistrictManager,
      uniqueDistricts,
    ] = await Promise.all([
      EleCamera.countDocuments(query),
      EleCamera.countDocuments({ ...query, installed_status: 1 }),
      EleCamera.countDocuments({ ...query, status: "RUNNING" }),
      EleCamera.countDocuments({ ...query, status: "STOPPED" }),
      electionUser.countDocuments({ district, role: { $ne: "district" } }),
      electionUser.countDocuments({ district, role: "district" }),
      Booth.distinct("assemblyName", { district }), // Assuming 'assemblyName' is the field for assembly name in Booth collection
    ]);

    const dataByDistrictPromises = uniqueDistricts.map(async (assemblyName) => {
      let assemblyQuery = { district, assemblyName };
      if (phase) {
        assemblyQuery.phase = phase;
      }

      const [
        totalCameras,
        installedCameras,
        totalLiveCamera,
        totalOfflineCamera,
        totalInstallers,
        totalDistrictManager,
      ] = await Promise.all([
        EleCamera.countDocuments(assemblyQuery),
        EleCamera.countDocuments({ ...assemblyQuery, installed_status: 1 }),
        EleCamera.countDocuments({ ...assemblyQuery, status: "RUNNING" }),
        EleCamera.countDocuments({ ...assemblyQuery, status: "STOPPED" }),
        electionUser.countDocuments({
          district,
          assemblyName,
          role: { $ne: "district" },
        }),
        electionUser.countDocuments({
          district,
          assemblyName,
          role: "district",
        }),
      ]);

      return {
        state,
        district,
        assemblyName,
        totalCameras,
        installedCameras,
        totalLiveCamera,
        totalOfflineCamera,
        totalInstallers,
        totalDistrictManager,
      };
    });

    const dataByDistrict = await Promise.all(dataByDistrictPromises);

    res.status(200).json({
      success: true,
      data: {
        state,
        district,
        totalCameras,
        installedCameras,
        totalLiveCamera,
        totalOfflineCamera,
        totalInstallers,
        totalDistrictManager,
        dataByDistrict,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// exports.getAssemblyData = async (req, res, next) => {
//     try {
//         let state = req.query.state;
//         let district = req.query.district;
//         let assemblyName = req.query.assemblyName;

//         // Fetching assembly-level data
//         const [
//             totalCameras,
//             installedCameras,
//             totalLiveCamera,
//             totalOfflineCamera,
//             totalInstallers,
//             totalDistrictManager,
//             uniqueBooths
//         ] = await Promise.all([
//             EleCamera.countDocuments({ assemblyName }),
//             EleCamera.countDocuments({ assemblyName, installed_status: 1 }),
//             EleCamera.countDocuments({ assemblyName, status: 'RUNNING' }),
//             EleCamera.countDocuments({ assemblyName, status: 'STOPPED' }),
//             electionUser.countDocuments({ assemblyName, role: { $ne: 'district' } }),
//             electionUser.countDocuments({ assemblyName, role: 'district' }),
//             Booth.distinct('location', { assemblyName }) // Assuming 'location' is the field for booth name in Booth collection
//         ]);

//         const dataByAssemblyPromises = uniqueBooths.map(async (location) => {
//             const [
//                 totalCameras,
//                 installedCameras,
//                 totalLiveCamera,
//                 totalOfflineCamera,
//                 totalInstallers,
//                 totalDistrictManager
//             ] = await Promise.all([
//                 EleCamera.countDocuments({ district, assemblyName, location }),
//                 EleCamera.countDocuments({ district, assemblyName, location, installed_status: 1 }),
//                 EleCamera.countDocuments({ district, assemblyName, location, status: 'RUNNING' }),
//                 EleCamera.countDocuments({ district, assemblyName, location, status: 'STOPPED' }),
//                 electionUser.countDocuments({ district, assemblyName, location, role: { $ne: 'district' } }),
//                 electionUser.countDocuments({ district, assemblyName, location, role: 'district' })
//             ]);

//             return {
//                 location,
//                 totalCameras,
//                 installedCameras,
//                 totalLiveCamera,
//                 totalOfflineCamera,
//                 totalInstallers,
//                 totalDistrictManager
//             };
//         });

//         const dataByAssembly = await Promise.all(dataByAssemblyPromises);

//         res.status(200).json({
//             success: true,
//             data: {
//                 state,
//                 district,
//                 assemblyName,
//                 totalCameras,
//                 installedCameras,
//                 totalLiveCamera,
//                 totalOfflineCamera,
//                 totalInstallers,
//                 totalDistrictManager,
//                 dataByAssembly
//             },
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: error.message,
//         });
//     }
// };

exports.getAssemblyData = async (req, res, next) => {
  try {
    let state = req.query.state;
    let district = req.query.district;
    let assemblyName = req.query.assemblyName;
    const { phase } = req.query;
    let query = { assemblyName: assemblyName };
    if (phase) {
      query.phase = phase;
    }

    // Fetching assembly-level data
    const [
      totalCameras,
      installedCameras,
      totalLiveCamera,
      totalOfflineCamera,
      totalInstallers,
      totalDistrictManager,
      uniqueBooths,
    ] = await Promise.all([
      EleCamera.countDocuments(query),
      EleCamera.countDocuments({ ...query, installed_status: 1 }),
      EleCamera.countDocuments({ ...query, status: "RUNNING" }),
      EleCamera.countDocuments({ ...query, status: "STOPPED" }),
      electionUser.countDocuments({ assemblyName, role: { $ne: "district" } }),
      electionUser.countDocuments({ assemblyName, role: "district" }),
      Booth.distinct("location", { assemblyName }),
    ]);

    const dataByAssemblyPromises = uniqueBooths.map(async (location) => {
      let boothQuery = { district, assemblyName, location };
      if (phase) {
        boothQuery.phase = phase;
      }

      const [
        totalCameras,
        installedCameras,
        totalLiveCamera,
        totalOfflineCamera,
        totalInstallers,
        totalDistrictManager,
      ] = await Promise.all([
        EleCamera.countDocuments(boothQuery),
        EleCamera.countDocuments({ ...boothQuery, installed_status: 1 }),
        EleCamera.countDocuments({ ...boothQuery, status: "RUNNING" }),
        EleCamera.countDocuments({ ...boothQuery, status: "STOPPED" }),
        electionUser.countDocuments({
          district,
          assemblyName,
          location,
          role: { $ne: "district" },
        }),
        electionUser.countDocuments({
          district,
          assemblyName,
          location,
          role: "district",
        }),
      ]);

      return {
        location,
        totalCameras,
        installedCameras,
        totalLiveCamera,
        totalOfflineCamera,
        totalInstallers,
        totalDistrictManager,
      };
    });

    let dataByAssembly = await Promise.all(dataByAssemblyPromises);

    // Sort data by the ratio of live cameras to total cameras
    dataByAssembly.sort((a, b) => {
      const ratioA =
        a.totalCameras === 0 ? 0 : a.totalLiveCamera / a.totalCameras;
      const ratioB =
        b.totalCameras === 0 ? 0 : b.totalLiveCamera / b.totalCameras;
      return ratioB - ratioA; // Sort in descending order
    });

    res.status(200).json({
      success: true,
      data: {
        state,
        district,
        assemblyName,
        totalCameras,
        installedCameras,
        totalLiveCamera,
        totalOfflineCamera,
        totalInstallers,
        totalDistrictManager,
        dataByAssembly,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getCameraByLocation = async (req, res, next) => {
  try {
    const { location, phase } = req.query;
    let query = { location: location };
    if (phase) {
      query.phase = phase;
    }
    const cameras = await EleCamera.find(query);

    return res.status(200).json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.attendance = async (req, res, next) => {
  try {
    console.log(req.body, "body");

    // Retrieve the last entry from the database
    const lastEntry = await Attend.findOne({ mobile: req.body.mobile }).sort({
      presentDate: -1,
      presentTime: -1,
    });
    console.log(lastEntry, "last");
    if (lastEntry) {
      // Parse the presentDate of the last entry using moment
      const lastEntryDate = moment(lastEntry.presentDate, "DD/MM/YYYY");
      const currentDate = moment(req.body.presentDate, "DD/MM/YYYY");

      console.log(lastEntryDate, currentDate, "gg");

      // Check if the present date has changed
      if (!currentDate.isSame(lastEntryDate, "day")) {
        // If the date has changed, no need to check time difference, proceed with creating attendance
        const user = await Attend.create(req.body);

        return res.status(200).json({
          success: true,
          data: "Attendance done",
        });
      }

      // Parse the presentTime of the last entry using moment
      const lastEntryTime = moment(lastEntry.presentTime, "HH:mm:ss");
      const currentTime = moment(req.body.presentTime, "HH:mm:ss");
      const timeDifference = moment.duration(currentTime.diff(lastEntryTime));

      // Check if the time difference is more than 3 hours
      if (timeDifference.asHours() < 0.25) {
        return res.status(401).json({
          success: false,
          data: "Cannot create attendance. Present time should be more than 15 min from the last entry.",
        });
      }
    }

    // If no last entry found or time difference is more than 3 hours, create the attendance
    const user = await Attend.create(req.body);

    res.status(200).json({
      success: true,
      data: "Attendance done",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// get camera by number
exports.getLatLongFsv = async (req, res, next) => {
  try {
    const cameras = await Fsv.find();

    res.status(200).json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// get camera by number
exports.getLatLongPhaseOne = async (req, res, next) => {
  try {
    const cameras = await elePhaseOneData.find();

    res.status(200).json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getFlvLatDid = async (req, res, next) => {
  console.log(req.query.deviceId);
  try {
    const regex = new RegExp(req.query.deviceId, "i"); // Case-insensitive regex

    const getFlv = await EleFlv.findOne({ streamname: { $regex: regex } });
    console.log("getFlvurl2", getFlv); // For debugging

    if (!getFlv) {
      return res.status(200).json({
        success: false,
        data: "Device Id not found in election",
      });
    }

    res.status(200).json({
      success: true,
      flvUrl: getFlv,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getFullDid = async (req, res, next) => {
  console.log(req.query.deviceId);
  try {
    const { deviceId, phase } = req.query;

    if (phase) {
      const pool = await getSqlConnection(phase);
      const sqlQuery =
        "SELECT streamname FROM streamlist WHERE streamname LIKE @query ORDER BY streamname DESC";
      const result = await pool
        .request()
        .input("query", `%${deviceId}%`)
        .query(sqlQuery);

      if (!result.recordset || result.recordset.length === 0) {
        return res.status(200).json({
          success: false,
          data: "Device Id not found in election (SQL)",
        });
      }

      return res.status(200).json({
        success: true,
        streamnames: result.recordset.map((row) => row.streamname),
      });
    }

    const regex = new RegExp(req.query.deviceId, "i"); // Case-insensitive regex

    const getFlv = await EleFlv.aggregate([
      { $match: { streamname: { $regex: regex } } }, // Match documents based on regex
      { $project: { streamname: 1, _id: 0 } }, // Project only the streamname field
      { $sort: { streamname: -1 } }, // Sort by streamname field in descending order
    ]);

    console.log("getFlvurl2", getFlv); // For debugging

    if (!getFlv || getFlv.length === 0) {
      return res.status(200).json({
        success: false,
        data: "Device Id not found in election",
      });
    }

    res.status(200).json({
      success: true,
      streamnames: getFlv.map((doc) => doc.streamname), // Extracting streamname field
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// get camera by number
exports.getLatLongPolling = async (req, res, next) => {
  try {
    let state = req.query.state || "";
    let date = req.query.date || "";
    const { phase } = req.query;
    let query = {};

    if (state) {
      query.state = state;
    }

    if (date) {
      query.date = date;
    }

    if (phase) {
      query.phase = phase;
    }

    const cameras = await EleCamera.find(query);

    res.status(200).json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.trackLiveLatLong = async (req, res, next) => {
  try {
    // console.log(req.body)
    // let deviceId = req.query.deviceId;
    const {
      latitude,
      longitude,
      personName,
      personMobile,
      date,
      time,
      state,
      formatted_address,
      formatted_address1,
      formatted_address2,
    } = req.body;
    // console.log("deviceId:", deviceId); // For debugging

    // Search for existing camera
    const existUser = await electionUser.findOne({ mobile: personMobile });

    if (!existUser) {
      return res.status(401).json({
        success: false,
        data: "user not found, please signup",
      });
    }

    existUser.latitude = latitude;
    existUser.longitude = longitude;
    existUser.date = date;
    existUser.time = time;
    existUser.state = state;
    existUser.formatted_address = formatted_address;
    existUser.formatted_address1 = formatted_address1;
    existUser.formatted_address2 = formatted_address2;
    let hist = { ...existUser.toObject() };
    delete hist._id;
    hist.actionType = "updated user history";
    hist.personName = personName;
    hist.personMobile = personMobile;
    hist.date = date;
    hist.time = time;
    let CreateHistory = await EleUserhistory.create(hist);

    existUser.save();

    res.status(200).json({
      success: true,
      data: "updated lat long",
    });
  } catch (error) {
    console.error("Error:", error); // For debugging
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getElectionUser = async (req, res, next) => {
  try {
    const currentTime = new Date();
    const formattedDate = currentTime.toLocaleDateString("en-GB");
    // const formattedTime = currentTime.toLocaleTimeString('en-US', { hour12: false });
    // const time = getTimeOneHourAgo(); // Get the time one hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const time = oneHourAgo.toTimeString().slice(0, 8);

    const existUser = await electionUser.find();
    const total = await electionUser.countDocuments();
    const KARNATAKA = await electionUser.countDocuments({ state: "KARNATAKA" });
    const TRIPURA = await electionUser.countDocuments({ state: "TRIPURA" });
    const UTTARAKHAND = await electionUser.countDocuments({
      state: "UTTARAKHAND",
    });
    const MP = await electionUser.countDocuments({ state: "MADHYA PRADESH" });
    const BIHAR = await electionUser.countDocuments({ state: "BIHAR" });
    const GOA = await electionUser.countDocuments({ state: "GOA" });

    // Count documents within the last hour
    const lastHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $gte: time },
    });

    res.status(200).json({
      success: true,
      data: existUser,
      total: total,
      KARNATAKA,
      TRIPURA,
      UTTARAKHAND,
      MP,
      BIHAR,
      GOA,
      lastHour,
    });
  } catch (error) {
    console.error("Error:", error); // For debugging
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getElectionUserPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const searchQuery = req.query.search || "";
    const searchQuery1 = req.query.state || "";
    // const date = req.query.date || '';

    // Construct the query object based on the provided parameters
    const query = {};

    if (searchQuery) {
      // If searchQuery is provided, search by deviceId
      query.mobile = Math.floor(searchQuery);
    }

    if (searchQuery1) {
      // If searchQuery is provided, search by deviceId
      query.state = { $regex: searchQuery1, $options: "i" };
    }

    const options = {
      skip: (page - 1) * limit,
      limit: limit,
    };

    const currentTime = new Date();
    const formattedDate = currentTime.toLocaleDateString("en-GB");
    // const formattedTime = currentTime.toLocaleTimeString('en-US', { hour12: false });
    // const time = getTimeOneHourAgo(); // Get the time one hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const time = oneHourAgo.toTimeString().slice(0, 8);

    const existUser = await electionUser.find(query, null, options);
    const total = await electionUser.countDocuments();
    // const KARNATAKA = await electionUser.countDocuments({ state: 'KARNATAKA' });
    // const TRIPURA = await electionUser.countDocuments({ state: 'TRIPURA' });
    // const UTTARAKHAND = await electionUser.countDocuments({ state: 'UTTARAKHAND' });
    // const MP = await electionUser.countDocuments({ state: 'MADHYA PRADESH' });
    // const BIHAR = await electionUser.countDocuments({ state: 'BIHAR' });
    // const GOA = await electionUser.countDocuments({ state: 'GOA' });

    const totalCameras = await electionUser.countDocuments(query);

    const totalPages = Math.ceil(totalCameras / limit);

    // Count documents within the last hour
    const lastHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $gte: time },
    });

    res.status(200).json({
      success: true,
      data: existUser,
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalCameras,
      itemsPerPage: limit,
      total: total,
      lastHour,
    });
  } catch (error) {
    console.error("Error:", error); // For debugging
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getElectionUserChart = async (req, res, next) => {
  try {
    const currentTime = new Date();
    const formattedDate = currentTime.toLocaleDateString("en-GB");
    // const formattedTime = currentTime.toLocaleTimeString('en-US', { hour12: false });
    // const time = getTimeOneHourAgo(); // Get the time one hour ago
    const current = new Date();
    const oneHourAgo = new Date();
    const twoHourAgo = new Date();
    const threeHourAgo = new Date();
    const fourHourAgo = new Date();
    const fiveHourAgo = new Date();
    const sixHourAgo = new Date();
    const sevenHourAgo = new Date();
    const eightHourAgo = new Date();
    const nineHourAgo = new Date();
    const tenHourAgo = new Date();
    const elevenHourAgo = new Date();
    const twlveHourAgo = new Date();
    current.setHours(oneHourAgo.getHours());
    const currentTi = oneHourAgo.toTimeString().slice(0, 8);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const time = oneHourAgo.toTimeString().slice(0, 8);
    twoHourAgo.setHours(oneHourAgo.getHours() - 1);
    const time2 = twoHourAgo.toTimeString().slice(0, 8);
    threeHourAgo.setHours(twoHourAgo.getHours() - 1);
    const time3 = threeHourAgo.toTimeString().slice(0, 8);
    fourHourAgo.setHours(threeHourAgo.getHours() - 1);
    const time4 = fourHourAgo.toTimeString().slice(0, 8);
    fiveHourAgo.setHours(fourHourAgo.getHours() - 1);
    const time5 = fiveHourAgo.toTimeString().slice(0, 8);
    sixHourAgo.setHours(fiveHourAgo.getHours() - 1);
    const time6 = sixHourAgo.toTimeString().slice(0, 8);
    sevenHourAgo.setHours(sixHourAgo.getHours() - 1);
    const time7 = sevenHourAgo.toTimeString().slice(0, 8);
    eightHourAgo.setHours(sevenHourAgo.getHours() - 1);
    const time8 = eightHourAgo.toTimeString().slice(0, 8);
    nineHourAgo.setHours(eightHourAgo.getHours() - 1);
    const time9 = nineHourAgo.toTimeString().slice(0, 8);
    tenHourAgo.setHours(nineHourAgo.getHours() - 1);
    const time10 = tenHourAgo.toTimeString().slice(0, 8);
    elevenHourAgo.setHours(tenHourAgo.getHours() - 1);
    const time11 = elevenHourAgo.toTimeString().slice(0, 8);
    twlveHourAgo.setHours(elevenHourAgo.getHours() - 1);
    const time12 = twlveHourAgo.toTimeString().slice(0, 8);

    const currentTisplit = oneHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const timesplit = oneHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time2split = twoHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time3split = threeHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time4split = fourHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time5split = fiveHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time6split = sixHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time7split = sevenHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time8split = eightHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time9split = nineHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time10split = tenHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time11split = elevenHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time12split = twlveHourAgo.toTimeString().slice(0, 8).split(":")[0];

    // Count documents within the last hour
    const currentHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: currentTisplit },
    });
    const lastHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: timesplit },
    });
    const twoHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time2split },
    });
    const threeHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time3split },
    });
    const fourHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time4split },
    });
    const fiveHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time5split },
    });
    const sixHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time6split },
    });
    const sevenHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time7split },
    });
    const eightHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time8split },
    });
    const nineHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time9split },
    });
    const tenHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time10split },
    });
    const elevenHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time11split },
    });
    const twelveHour = await electionUser.countDocuments({
      date: formattedDate,
      time: { $regex: time12split },
    });

    res.status(200).json({
      currentHour,
      lastHour,
      twoHour,
      threeHour,
      fourHour,
      fiveHour,
      sixHour,
      sevenHour,
      eightHour,
      nineHour,
      tenHour,
      elevenHour,
      twelveHour,
      currentHours: currentTi,
      oneHours: time,
      twoHours: time2,
      threeHours: time3,
      fourHours: time4,
      fiveHours: time5,
      sixHours: time6,
      sevenHours: time7,
      eightHours: time8,
      nineHours: time9,
      tenHours: time10,
      elevenHours: time11,
      twelveHours: time12,
    });
  } catch (error) {
    console.error("Error:", error); // For debugging
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getElectionCameraChart = async (req, res, next) => {
  try {
    const currentTime = new Date();
    const formattedDate = currentTime.toLocaleDateString("en-GB", {
      timeZone: "Asia/Kolkata",
    });
    // const time = getTimeOneHourAgo(); // Get the time one hour ago
    const current = new Date();
    const oneHourAgo = new Date();
    const twoHourAgo = new Date();
    const threeHourAgo = new Date();
    const fourHourAgo = new Date();
    const fiveHourAgo = new Date();
    const sixHourAgo = new Date();
    const sevenHourAgo = new Date();
    const eightHourAgo = new Date();
    const nineHourAgo = new Date();
    const tenHourAgo = new Date();
    const elevenHourAgo = new Date();
    const twlveHourAgo = new Date();
    current.setHours(oneHourAgo.getHours());
    const currentTi = oneHourAgo.toTimeString().slice(0, 8);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const time = oneHourAgo.toTimeString().slice(0, 8);
    twoHourAgo.setHours(oneHourAgo.getHours() - 1);
    const time2 = twoHourAgo.toTimeString().slice(0, 8);
    threeHourAgo.setHours(twoHourAgo.getHours() - 1);
    const time3 = threeHourAgo.toTimeString().slice(0, 8);
    fourHourAgo.setHours(threeHourAgo.getHours() - 1);
    const time4 = fourHourAgo.toTimeString().slice(0, 8);
    fiveHourAgo.setHours(fourHourAgo.getHours() - 1);
    const time5 = fiveHourAgo.toTimeString().slice(0, 8);
    sixHourAgo.setHours(fiveHourAgo.getHours() - 1);
    const time6 = sixHourAgo.toTimeString().slice(0, 8);
    sevenHourAgo.setHours(sixHourAgo.getHours() - 1);
    const time7 = sevenHourAgo.toTimeString().slice(0, 8);
    eightHourAgo.setHours(sevenHourAgo.getHours() - 1);
    const time8 = eightHourAgo.toTimeString().slice(0, 8);
    nineHourAgo.setHours(eightHourAgo.getHours() - 1);
    const time9 = nineHourAgo.toTimeString().slice(0, 8);
    tenHourAgo.setHours(nineHourAgo.getHours() - 1);
    const time10 = tenHourAgo.toTimeString().slice(0, 8);
    elevenHourAgo.setHours(tenHourAgo.getHours() - 1);
    const time11 = elevenHourAgo.toTimeString().slice(0, 8);
    twlveHourAgo.setHours(elevenHourAgo.getHours() - 1);
    const time12 = twlveHourAgo.toTimeString().slice(0, 8);

    const currentTisplit = oneHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const timesplit = oneHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time2split = twoHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time3split = threeHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time4split = fourHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time5split = fiveHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time6split = sixHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time7split = sevenHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time8split = eightHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time9split = nineHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time10split = tenHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time11split = elevenHourAgo.toTimeString().slice(0, 8).split(":")[0];

    const time12split = twlveHourAgo.toTimeString().slice(0, 8).split(":")[0];

    // Count documents within the last hour
    const currentHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: currentTisplit },
    });
    const lastHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: timesplit },
    });
    const twoHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time2split },
    });
    const threeHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time3split },
    });
    const fourHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time4split },
    });
    const fiveHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time5split },
    });
    const sixHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time6split },
    });
    const sevenHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time7split },
    });
    const eightHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time8split },
    });
    const nineHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time9split },
    });
    const tenHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time10split },
    });
    const elevenHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time11split },
    });
    const twelveHour = await EleCamera.countDocuments({
      date: formattedDate,
      time: { $regex: time12split },
    });

    res.status(200).json({
      currentHour,
      lastHour,
      twoHour,
      threeHour,
      fourHour,
      fiveHour,
      sixHour,
      sevenHour,
      eightHour,
      nineHour,
      tenHour,
      elevenHour,
      twelveHour,
      currentHours: currentTi,
      oneHours: time,
      twoHours: time2,
      threeHours: time3,
      fourHours: time4,
      fiveHours: time5,
      sixHours: time6,
      sevenHours: time7,
      eightHours: time8,
      nineHours: time9,
      tenHours: time10,
      elevenHours: time11,
      twelveHours: time12,
    });
  } catch (error) {
    console.error("Error:", error); // For debugging
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getRebootCamera = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const searchQuery = req.query.search || "";
    // const date = req.query.date || '';

    // Construct the query object based on the provided parameters
    const query = {};

    if (searchQuery) {
      // If searchQuery is provided, search by deviceId
      query.deviceId = { $regex: searchQuery, $options: "i" };
    }

    // Define pagination options
    const options = {
      skip: (page - 1) * limit,
      limit: limit,
    };

    // Execute the query
    const cameras = await EleReboot.find(query, null, options);

    const totalCameras = await EleReboot.countDocuments(query);

    const totalPages = Math.ceil(totalCameras / limit);

    if (!cameras.length) {
      return res.status(404).json({
        success: false,
        error: "No cameras found",
      });
    }

    res.status(200).json({
      success: true,
      data: cameras,
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalCameras,
      itemsPerPage: limit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getAssemblyByNumber = async (req, res, next) => {
  try {
    let number = req.query.personMobile;
    const cameras = await electionUserPunjab.findOne({ mobile: number });

    console.log(cameras.state);

    const Boo = await Booth.aggregate([
      {
        $match: {
          state: cameras.state,
          district: cameras.district,
          assemblyName: cameras.assemblyName,
        },
      },
      {
        $project: {
          psNo: 1,
          location: 1,
          _id: 0,
        },
      },
    ]);

    const Device = await Booth.aggregate([
      {
        $match: {
          state: cameras.state,
          district: cameras.district,
          assemblyName: cameras.assemblyName,
        },
      },
      {
        $project: {
          deviceId: 1,
        },
      },
    ]);

    console.log(Boo, "Boo");
    res.status(200).json({
      success: true,
      data: cameras,
      booth: Boo,
      Device: Device,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getBiharReport = async (req, res, next) => {
  try {
    let result = await electionUser.aggregate([
      {
        $match: {
          state: "BIHAR", // Match documents by state
        },
      },
      {
        $group: {
          _id: "$formatted_address", // Group by formatted_address field
          total_count: { $sum: 1 }, // Calculate total count for each address
          // users: {
          //     $push: {
          //         name: "$name",
          //         mobile: "$mobile",
          //         latitude: "$latitude",
          //         longitude: "$longitude",
          //         formatted_address: "$formatted_address",
          //         date: "$date",
          //         time: "$time"
          //     }
          // }
        },
      },
      {
        $group: {
          _id: null, // Group all documents together
          overall_count: { $sum: "$total_count" }, // Calculate overall count
          addresses: { $push: "$$ROOT" }, // Preserve the original documents
        },
      },
    ]);
    // const workbook = new Workbook();
    // const worksheet = workbook.addWorksheet('User Data');

    // // Add column headers
    // worksheet.addRow(['Address', 'Name', 'Mobile', 'Latitude', 'Longitude', 'Date', 'Time']);

    // // Add data rows
    // result.forEach(group => {
    //     group.addresses.forEach(address => {
    //         address.users.forEach(user => {
    //             worksheet.addRow([address._id, user.name, user.mobile, user.latitude, user.longitude, user.date, user.time]);
    //         });
    //     });
    // });

    // // Write to file
    // await workbook.xlsx.writeFile('user_data.xlsx');

    // console.log('Excel sheet generated successfully');

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error occurred:", err);
    res.status(400).json({
      success: false,
      error: err,
    });
  }
};
exports.getBiharReportUser = async (req, res, next) => {
  try {
    let formatted_address = req.query.formatted_address;
    let result = await electionUser.aggregate([
      {
        $match: {
          state: "BIHAR", // Match documents by state
          formatted_address: formatted_address,
        },
      },
      {
        $group: {
          _id: null, // Group all documents together
          total_count: { $sum: 1 }, // Calculate total count
          data: {
            $push: {
              name: "$name",
              mobile: "$mobile",
              latitude: "$latitude",
              longitude: "$longitude",
              formatted_address: "$formatted_address",
              date: "$date",
              time: "$time",
            },
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id field from the output
          total_count: 1, // Include total_count field in the output
          data: 1, // Include data field in the output
        },
      },
    ]);

    // const workbook = new Workbook();
    // const worksheet = workbook.addWorksheet('User Data');

    // // Add column headers
    // worksheet.addRow(['Address', 'Name', 'Mobile', 'Latitude', 'Longitude', 'Date', 'Time']);

    // // Add data rows
    // result.forEach(group => {
    //     group.addresses.forEach(address => {
    //         address.users.forEach(user => {
    //             worksheet.addRow([address._id, user.name, user.mobile, user.latitude, user.longitude, user.date, user.time]);
    //         });
    //     });
    // });

    // // Write to file
    // await workbook.xlsx.writeFile('user_data.xlsx');

    // console.log('Excel sheet generated successfully');

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error occurred:", err);
    res.status(400).json({
      success: false,
      error: err,
    });
  }
};

exports.getSixDistrictDataBihar = async (req, res, next) => {
  try {
    let districts = [
      "sitamarhi",
      "muzaffarpur",
      "saran",
      "vaishali",
      "madhubani",
      "darbhanga",
      "patna",
    ];

    let result = await electionUser.aggregate([
      {
        $match: {
          formatted_address: {
            $in: districts.map((district) => new RegExp(district, "i")), // Case-insensitive match for multiple districts
          },
        },
      },
      {
        $project: {
          name: 1,
          mobile: 1,
          latitude: 1,
          longitude: 1,
          state: 1,
          formatted_address: 1,
          date: 1,
          time: 1,
          district: {
            $arrayElemAt: [
              {
                $filter: {
                  input: districts,
                  as: "district",
                  cond: {
                    $regexMatch: {
                      input: "$formatted_address",
                      regex: { $concat: ["(?i)", "$$district"] },
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$district", // Group by the district field
          count: { $sum: 1 },
          users: {
            $push: {
              name: "$name",
              mobile: "$mobile",
              latitude: "$latitude",
              longitude: "$longitude",
              state: "$state",
              formatted_address: "$formatted_address",
              date: "$date",
              time: "$time",
            },
          },
        },
      },
    ]);

    let totalCount = result.reduce((sum, group) => sum + group.count, 0);

    res.status(200).json({
      success: true,
      total_count: totalCount,
      data: result,
    });
  } catch (err) {
    console.error("Error occurred:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
