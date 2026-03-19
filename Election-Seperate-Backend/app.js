// // app.js
// const express = require('express');
// const app = express();
// const port = 7073;
// const cors = require('cors');

// const connectDatabase = require("./config/database");   // Import database configuration



// if (process.env.NODE_ENV !== "PRODUCTION") {
//     require("dotenv").config({ path: "backend/config/config.env" });
// }

// connectDatabase();  // Connect to database

// app.use(express.json());    // Parse JSON bodies in request
// app.use(cors(
//     {
//         origin: '*',
//         credentials: true
//     }
// ));            // Enable CORS



// // Import all routes
// const masterRoutes = require('./routes/masterRoutes');

// // Mount all routes
// app.use('/api', masterRoutes);

// // Start the server
// app.listen(port, () => {
//     console.log(`Server is running at http://localhost:${port}`);
// });




const express = require('express');
if (!global.crypto) {
    try {
        global.crypto = require('isomorphic-crypto');
    } catch (e) {
        console.warn('isomorphic-crypto not found, attempting to use built-in crypto');
        global.crypto = require('crypto').webcrypto || require('crypto');
    }
}

const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const connectDatabase = require('./config/database'); // Import database configuration

const app = express();
const port = 8080;
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
// if (process.env.NODE_ENV !== 'production') {
require('dotenv').config({ path: './config/config.env' });
// }

connectDatabase(); // Connect to the database

app.use(express.json()); // Parse JSON bodies in requests
app.use(cors({
    origin: '*',
    credentials: true
})); // Enable CORS
app.use(morgan('dev')); // Enable logging

// Health check / root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is alive 🚀'
  });
});

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         // Extract shipment number from the request body
//         console.log(req.body.folderName);
//         const shipmentNo = req.query.folderName; // person name
//         const fileType = req.query.fileType;
//         const requirementId = req.query.requirementId;

//         // Create the folder if it doesn't exist
//         const uploadFolder = `pdfs/${fileType}/${shipmentNo}/${requirementId}`;
//         fs.mkdirSync(uploadFolder, { recursive: true });

//         // Set the destination path
//         cb(null, uploadFolder);
//     },
//     filename: function (req, file, cb) {
//         // cb(null, file.originalname);
//         cb(null, `${req.query.requirementId}.${file.originalname.split('.').pop()}`);
//     }
// });

// app.get('/download-pdf/:id', (req, res) => {
//     const { id } = req.params;
//     const { fileExtension, foldername, username } = req.query;

//     const filePath = path.join(__dirname, `pdfs/${foldername}/${username}/${id}/${id}.${fileExtension}`);
//     console.log('path', path);
//     // Check if the file exists
//     fs.access(filePath, fs.constants.F_OK, (err) => {
//       if (err) {
//         // File doesn't exist
//         return res.status(404).send('PDF file not found');
//       }
  
//       // Set response headers
//       res.setHeader('Content-Type', 'application/pdf');
//       res.setHeader('Content-Disposition', 'inline; filename="quotation.pdf"');
  
//       // Stream the file as response
//       const fileStream = fs.createReadStream(filePath);
//       fileStream.pipe(res);
//     });
//   });

// const upload = multer({ storage: storage });

// // File upload route
// app.post('/upload', upload.single('pdfFile'), (req, res) => {
//     try {
//         if (!req.file) {
//             throw new Error('No file uploaded');
//         }

//         // Process the uploaded file if needed

//         res.status(200).json({
//             success: true,
//             message: 'File uploaded successfully'
//         });
//     } catch (error) {
//         res.status(400).json({
//             success: false,
//             error: error.message
//         });
//     }
// });




// Import all routes
const electionRoutes = require('./routes/electionRoute')
const attendanceRoutes = require('./routes/attendanceRoute')

// Mount all routes
app.use('/election', electionRoutes);
app.use('/election/api/attendance', attendanceRoutes);
// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
