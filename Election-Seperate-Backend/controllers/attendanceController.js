const Attendance = require("../models/Attendance");
const electionUser = require("../models/election-user");
const { logAction } = require("../utils/auditLogger");
const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const XLSX = require("xlsx");

const AZURE_STORAGE_CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = "attendance-photos";

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

// Punch In
exports.punchIn = async (req, res) => {
  try {
    const { userId, userName, userMobile, latitude, longitude } = req.body;
    const file = req.file;

    if (!userId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "UserId, latitude, and longitude are required",
      });
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];

    // Check if already punched in today
    const existingAttendance = await Attendance.findOne({
      userId,
      date: dateString,
      status: "punched-in",
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Already punched in today",
      });
    }

    // Upload photo to Azure
    let photoUrl = null;
    if (file) {
      const blobName = `punch-in/${userId}/${dateString}-${uuidv4()}${path.extname(file.originalname)}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });
      photoUrl = blockBlobClient.url;
    }

    // Create attendance record
    const attendance = await Attendance.create({
      userId,
      userName,
      userMobile,
      date: dateString,
      punchInTime: new Date(),
      punchInLatitude: parseFloat(latitude),
      punchInLongitude: parseFloat(longitude),
      punchInPhotoUrl: photoUrl,
      status: "punched-in",
    });

    // Audit Log
    if (userId) {
      const user = await electionUser.findOne({ mobile: parseInt(userId) });
      if (user) {
        await logAction(
          user,
          "PUNCH_IN",
          "Attendance",
          attendance._id.toString(),
          { latitude, longitude, date: dateString },
          req.ip,
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Punched in successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("Punch in error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Punch Out
exports.punchOut = async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    const file = req.file;

    if (!userId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "UserId, latitude, and longitude are required",
      });
    }

    // Get today's date
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];

    // Find today's punch-in record
    const attendance = await Attendance.findOne({
      userId,
      date: dateString,
      status: "punched-in",
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: "No punch-in record found for today",
      });
    }

    // Upload punch-out photo to Azure
    let photoUrl = null;
    if (file) {
      const blobName = `punch-out/${userId}/${dateString}-${uuidv4()}${path.extname(file.originalname)}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });
      photoUrl = blockBlobClient.url;
    }

    // Calculate work duration
    // const punchOutTime = new Date();
    // const duration = Math.floor((punchOutTime - attendance.punchInTime) / 60000); // minutes
    const punchOutTime = new Date();
    const diffSeconds = Math.floor(
      (punchOutTime - attendance.punchInTime) / 1000,
    );

    let duration;

    if (diffSeconds < 60) {
      duration = diffSeconds + " sec";
    } else if (diffSeconds < 3600) {
      duration = Math.floor(diffSeconds / 60) + " min";
    } else {
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      duration = hours + " hr " + minutes + " min";
    }

    // Update attendance record
    attendance.punchOutTime = punchOutTime;
    attendance.punchOutLatitude = parseFloat(latitude);
    attendance.punchOutLongitude = parseFloat(longitude);
    attendance.punchOutPhotoUrl = photoUrl;
    attendance.status = "punched-out";
    attendance.workDuration = duration;

    await attendance.save();

    // Audit Log
    if (userId) {
      const user = await electionUser.findOne({ mobile: parseInt(userId) });
      if (user) {
        await logAction(
          user,
          "PUNCH_OUT",
          "Attendance",
          attendance._id.toString(),
          { latitude, longitude, duration },
          req.ip,
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Punched out successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("Punch out error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get Attendance List with Pagination and Filters
exports.getAttendanceList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      userId,
      startDate,
      endDate,
      status,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (userId && userId.trim() !== "") {
      // Search by userId (phone number) or userName
      query.$or = [
        { userId: { $regex: userId.trim(), $options: "i" } },
        { userName: { $regex: userId.trim(), $options: "i" } },
        { userMobile: { $regex: userId.trim(), $options: "i" } },
      ];
    }

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Get total count
    const totalRecords = await Attendance.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / parseInt(limit));

    // Get attendance records
    const attendanceRecords = await Attendance.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: attendanceRecords,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching attendance list:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Today's Status
exports.getTodayStatus = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "UserId is required",
      });
    }

    const today = new Date().toISOString().split("T")[0];

    const attendance = await Attendance.findOne({
      userId,
      date: today,
    });

    res.status(200).json({
      success: true,
      data: attendance,
      isPunchedIn: attendance ? attendance.status === "punched-in" : false,
      isPunchedOut: attendance ? attendance.status === "punched-out" : false,
    });
  } catch (error) {
    console.error("Error fetching today status:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Generate Attendance Report
exports.generateReport = async (req, res) => {
  try {
    const { userId, startDate, endDate, status, format = "json" } = req.query;

    // Build query
    const query = {};

    if (userId) {
      query.userId = userId;
    }

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (status) {
      query.status = status;
    }

    // Get all matching records
    const attendanceRecords = await Attendance.find(query).sort({ date: -1 });

    // Calculate statistics
    const stats = {
      totalDays: attendanceRecords.length,
      punchedIn: attendanceRecords.filter((r) => r.status === "punched-in")
        .length,
      punchedOut: attendanceRecords.filter((r) => r.status === "punched-out")
        .length,
      totalWorkHours:
        attendanceRecords.reduce((sum, r) => sum + (r.workDuration || 0), 0) /
        60,
      averageWorkHours: 0,
    };

    if (stats.punchedOut > 0) {
      stats.averageWorkHours = stats.totalWorkHours / stats.punchedOut;
    }

    // Return JSON format
    if (format === "json") {
      return res.status(200).json({
        success: true,
        data: attendanceRecords,
        statistics: stats,
      });
    }

    // Generate Excel/CSV
    if (format === "excel" || format === "csv") {
      const worksheetData = attendanceRecords.map((record) => ({
        "User ID": record.userId,
        "User Name": record.userName || "",
        Date: record.date,
        "Punch In Time": record.punchInTime
          ? new Date(record.punchInTime).toLocaleString()
          : "",
        "Punch Out Time": record.punchOutTime
          ? new Date(record.punchOutTime).toLocaleString()
          : "",
        "Punch In Location": `${record.punchInLatitude}, ${record.punchInLongitude}`,
        "Punch Out Location": record.punchOutLatitude
          ? `${record.punchOutLatitude}, ${record.punchOutLongitude}`
          : "",
        "Work Duration (min)": record.workDuration || 0,
        Status: record.status,
        "Photo URL": record.punchInPhotoUrl || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: format === "csv" ? "csv" : "xlsx",
      });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=attendance-report.${format === "csv" ? "csv" : "xlsx"}`,
      );
      res.setHeader(
        "Content-Type",
        format === "csv"
          ? "text/csv"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      return res.send(buffer);
    }

    res.status(400).json({
      success: false,
      message: "Invalid format. Use 'json', 'excel', or 'csv'",
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Attendance Record
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    // Delete from database
    await Attendance.findByIdAndDelete(id);

    // Audit Log
    const user = await electionUser.findOne({
      mobile: parseInt(attendance.userId),
    });
    if (user) {
      await logAction(
        user,
        "DELETE",
        "Attendance",
        id,
        { date: attendance.date },
        req.ip,
      );
    }

    res.status(200).json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
