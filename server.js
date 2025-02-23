import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";
import cors from "cors";
import twilio from "twilio";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express app setup
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// Firebase initialization
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://final-959ad.firebaseio.com",
});

const db = admin.firestore();
var notify = "";
// Helper function to fetch hospital data
const getHospitalData = async (email) => {
  const snapshot = await db.collection("Hospitals").where("email", "==", email).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
};

// Route to render the page with token cards

// Login Route
app.post("/login", async (req, res) => {
  try {
    console.log("Received login request:", req.body);

    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const hospitalData = await getHospitalData(email);

    if (!hospitalData || hospitalData.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Redirect to the /tokens route after successful login
    // res.redirect("/tokens");
    res.sendFile(path.join(__dirname,"public","startqueue.html"));

  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

// Other routes (keep your existing routes here)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "t1.html"));
  if(notify)
  {
    alert(notify);
  }
});

app.post("/final", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "camp.html"));
});

app.post("/hospital", (req, res) => {
  console.log("Hospital Page Requested via POST");
  res.sendFile(path.join(__dirname, "public", "t2.html"));
});

app.post("/record", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "department.html"));
});

app.post("/camp", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "camp.html"));
});

app.post("/startqueue", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "options2.html"));
});

app.post("/patient", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "patient1.html"));
});

app.post("/onlineapp", async (req, res) => {
  try {
    const hospitalData = await getHospitalData(emailid);

    if (!hospitalData) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    const mode = hospitalData.modeofdivision;

    if (mode === "Medical Speciality") {
      res.sendFile(path.join(__dirname, "public", "ms.html"));
    } else if (mode === "Doctor") {
      res.sendFile(path.join(__dirname, "public", "doc.html"));
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid mode of division",
      });
    }
  } catch (error) {
    console.error("Error in onlineapp:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.post("/verify", async (req, res) => {
  try {
    const { mobilenum, tokenNumber } = req.body;

    // Input validation
    if (!mobilenum || !tokenNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and token number are required",
      });
    }

    // Query Firestore to check if the mobile number and token exist
    const snapshot = await db
      .collection("livequeue")
      .where("mobilenum", "==", mobilenum)
      .where("tokenNumber", "==", tokenNumber)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Fetch all token numbers from Firestore
    const allTokensSnapshot = await db.collection("livequeue").get();
    const tokens = allTokensSnapshot.docs.map((doc) => doc.data().tokenNumber);

    // Send the verified data and token numbers to the frontend
    res.json({
      success: true,
      message: "Verification successful",
      data: {
        verifiedToken: snapshot.docs[0].data(), // Include verified token details
        allTokens: tokens, // Include all token numbers
      },
    });

  } catch (error) {
    console.error("Error during verification:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});
let tokens = [];
let swapRequests = [];

// Token verification endpoint
app.post('/verify', (req, res) => {
  const { mobilenum, tokenNumber } = req.body;
  
  // Demo verification - add token if not exists
  if (!tokens.some(t => t.tokenNumber === tokenNumber)) {
    tokens.push({ 
      tokenNumber,
      mobilenum,
      createdAt: new Date()
    });
  }

  res.json({
    message: 'Token verified successfully',
    data: {
      verifiedToken: { tokenNumber, mobilenum },
      allTokens: tokens.map(t => t.tokenNumber)
    }
  });
});

// Swap request endpoint
app.post('/submitSwapRequest', (req, res) => {
  try {
    const { fromToken, toToken, reason, fromMobile } = req.body;
    
    // Validate request
    if (!fromToken || !toToken || !reason || !fromMobile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if tokens exist
    const fromTokenExists = tokens.some(t => t.tokenNumber === fromToken);
    const toTokenExists = tokens.some(t => t.tokenNumber === toToken);
    
    if (!fromTokenExists || !toTokenExists) {
      return res.status(404).json({ error: 'One or both tokens not found' });
    }

    // Create swap request
    const newRequest = {
      id: Date.now(),
      fromToken,
      toToken,
      reason,
      fromMobile,
      status: 'pending',
      createdAt: new Date()
    };

    swapRequests.push(newRequest);
    
    res.json({ 
      message: 'Swap request submitted successfully',
      data: newRequest
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get swap requests endpoint
app.get('/getSwapRequests', (req, res) => {
  const { mobilenum } = req.query;
  
  // Find requests where target token belongs to this user
  const userToken = tokens.find(t => t.mobilenum === mobilenum);
  if (!userToken) return res.status(404).json({ error: 'User token not found' });

  const requests = swapRequests.filter(request => 
    request.toToken === userToken.tokenNumber && 
    request.status === 'pending'
  );

  if (requests.length === 0) {
    return res.status(404).json({ error: 'No swap requests found' });
  }

  // Return the latest request for demo purposes
  const latestRequest = requests[requests.length - 1];
  res.json({ 
    message: 'Swap request found',
    data: latestRequest
  });
});

// Process swap endpoint
app.post('/processSwap', (req, res) => {
  try {
    const { fromToken, toToken, action } = req.body;
    
    // Find the swap request
    const request = swapRequests.find(req => 
      req.fromToken === fromToken && 
      req.toToken === toToken &&
      req.status === 'pending'
    );

    if (!request) {
      return res.status(404).json("Sucessfully");
    }

    if (action === 'accept') {
      // Swap the tokens in the database
      const fromTokenIndex = tokens.findIndex(t => t.tokenNumber === fromToken);
      const toTokenIndex = tokens.findIndex(t => t.tokenNumber === toToken);
      
      // Swap mobile numbers
      [tokens[fromTokenIndex].mobilenum, tokens[toTokenIndex].mobilenum] = 
      [tokens[toTokenIndex].mobilenum, tokens[fromTokenIndex].mobilenum];
    }

    // Update request status
    request.status = action === 'accept' ? 'accepted' : 'rejected';
    request.processedAt = new Date();

    res.json({
      message: `Swap request ${action}ed successfully`,
      data: request
    });
  } catch (error) {
    res.status(500).json("Succesfully");
  }
});
app.post("/signup", async (req, res) => {
  try {
    const { hospital, email, password, address, state, city } = req.body;

    if (!hospital || !email || !password || !address) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const userRef = db.collection("Hospitals").doc(email);
    await userRef.set({
      hospital,
      email,
      password,
      address,
      state,
      city,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ success: true, message: "Signup successful!" });
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
app.post('/coinform', async (req, res) => {
  try {
    const { hospitalName, email, contactPerson, telephoneNumber } = req.body;

    // Validate input
    if (!hospitalName || !email || !contactPerson || !telephoneNumber) {
      console.log("Missing fields:", { hospitalName, email, contactPerson, telephoneNumber });
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Save to Firestore
    const hospitalRef = await db.collection('Hospitals').add({
      hospitalName,
      email,
      contactPerson,
      telephoneNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ message: 'Hospital registered successfully', id: hospitalRef.id });
  } catch (error) {
    console.error('Error registering hospital:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Route to handle camp details form submission
app.post('/next', async (req, res) => {
  try {
    const {
      campTitle,
      campDate,
      campEndTime,
      campType,
      venue,
      expectedServicesAttendees,
      benefits,
    } = req.body;

    // Validate input
    if (
      !campTitle ||
      !campDate ||
      !campEndTime ||
      !venue ||
      !expectedServicesAttendees ||
      !benefits
    ) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Save to Firestore
    const campRef = await db.collection('camps').add({
      campTitle,
      campDate,
      campEndTime,
      campType,
      venue,
      expectedServicesAttendees,
      benefits,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    notify="New Camp Has Been Added";
    res.status(201).json({ message: 'Camp details saved successfully', id: campRef.id });
  } catch (error) {
    console.error('Error saving camp details:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
app.get('/api/camps', async (req, res) => {
  try {
      const campsRef = db.collection('camps'); // Reference to the 'camps' collection
      const snapshot = await campsRef.get(); // Fetch all documents in the collection

      if (snapshot.empty) {
          return res.status(404).json({ error: 'No camps found' });
      }

      const camps = [];
      snapshot.forEach(doc => {
          camps.push({
              id: doc.id, // Include the document ID
              ...doc.data(), // Include all fields from the document
          });
      });

      res.json(camps); // Send the camp data as JSON
  } catch (error) {
      console.error('Error fetching camp data:', error);
      res.status(500).json({ error: 'Failed to fetch camp data' });
  }
});

app.post("/patientupdate", async (req, res) => {
  try {
      const patientData = req.body;

      // Add patient data to Firestore
      const docRef = await db.collection("patients").add(patientData);

      // res.status(200).json({
      //     success: true,
      //     message: "Patient data submitted successfully",
      //     id: docRef.id,
      // });
      res.sendFile(path.join(__dirname,"public","patient1.html"));
  } catch (error) {
      console.error("Error submitting patient data:", error);
      res.status(500).json({
          success: false,
          message: "Failed to submit patient data",
      });
  }
});
app.post("/submitSwapRequest", async (req, res) => {
  const { fromToken, toToken, reason, fromMobile } = req.body;

  if (!fromToken || !toToken || !reason || !fromMobile) {
      return res.status(400).json({ error: "Missing required fields" });
  }

  try {
      await db.collection("swapRequests").add({
          fromToken,
          toToken,
          reason,
          fromMobile,
          status: "pending",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`New swap request submitted: ${fromToken} -> ${toToken}`);
      return res.status(200).json({ message: "Swap request submitted successfully!" });
  } catch (error) {
      console.error("Sucessfully");
      return res.status(500).json("Succesfully");
  }
});

// Endpoint to process (accept/decline) swap request
app.post("/processSwap", async (req, res) => {
  const { fromToken, toToken, action } = req.body;

  if (!fromToken || !toToken || !action) {
      return res.status(400).json({ error: "Missing required fields" });
  }

  try {
      // Find the relevant swap request
      const swapQuery = await db.collection("swapRequests")
          .where("fromToken", "==", fromToken)
          .where("toToken", "==", toToken)
          .where("status", "==", "pending")
          .get();

      if (swapQuery.empty) {
          return res.status(404).json({ error: "Swap request not found or already processed" });
      }

      const swapDoc = swapQuery.docs[0]; // Assuming only one request exists
      const swapRef = db.collection("swapRequests").doc(swapDoc.id);

      if (action === "accept") {
          // Swap the tokens in Firestore (update patient tokens)
          await swapRef.update({ status: "accepted" });

          // Assuming you have a "patients" collection where tokens are stored
          const batch = db.batch();

          const fromPatientRef = db.collection("patients").doc(fromToken);
          const toPatientRef = db.collection("patients").doc(toToken);

          batch.update(fromPatientRef, { tokenNumber: toToken });
          batch.update(toPatientRef, { tokenNumber: fromToken });

          await batch.commit();
      } else if (action === "decline") {
          await swapRef.update({ status: "declined" });
      }

      console.log(`Swap request ${action}ed: ${fromToken} -> ${toToken}`);
      return res.status(200).json({ message: `Swap request ${action}ed successfully!` });
  } catch (error) {
      console.error("Error processing swap request:", error);
      return res.status(500).json({ error: "Failed to process swap request" });
  }
});
app.post("/patient123",(req,res)=>{
  res.sendFile(path.join(__dirname,"public","/patientqueue.html"))
})
// Endpoint to get swap requests for a user
app.get("/getSwapRequests", async (req, res) => {
  const { mobilenum } = req.query;

  if (!mobilenum) {
      return res.status(400).json({ error: "Missing mobile number" });
  }

  try {
      const swapRequests = await db.collection("swapRequests")
          .where("toToken", "==", mobilenum)
          .where("status", "==", "pending")
          .get();

      if (swapRequests.empty) {
          return res.status(200).json({ data: null });
      }

      const requestData = swapRequests.docs[0].data();
      return res.status(200).json({ data: requestData });
  } catch (error) {
      console.error("Error fetching swap requests:", error);
      return res.status(500).json({ error: "Failed to fetch swap requests" });
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});