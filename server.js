import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";
import cors from "cors";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: "mediqueue_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "public")));

// Firebase initialization
let db = null;
try {
  const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://final-958ad-default-rtdb.firebaseio.com",
  });
  db = admin.firestore();
  console.log("Firebase connected successfully.");
} catch (err) {
  console.warn("WARNING: Firebase disabled -", err.message);
}

// Helper
const getHospitalData = async (email) => {
  if (!db) return null;
  const snapshot = await db.collection("Hospitals").where("email", "==", email).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
};

// ─── Page Routes ────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "t1.html"));
});

app.post("/hospital", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "t2.html"));
});

app.post("/patient123", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "patientqueue.html"));
});

app.post("/startqueue", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "options2.html"));
});

app.post("/patient", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "patient1.html"));
});

app.post("/record", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "department.html"));
});

app.post("/camp", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "camp.html"));
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).send(`<script>alert("Email and password are required"); history.back();</script>`);

    if (!db)
      return res.status(503).send(`<script>alert("Database not connected"); history.back();</script>`);

    const hospitalData = await getHospitalData(email);
    if (!hospitalData || hospitalData.password !== password)
      return res.status(401).send(`<script>alert("Invalid email or password"); history.back();</script>`);

    req.session.hospitalEmail = email;
    req.session.hospitalName = hospitalData.Hospital || hospitalData.hospital || hospitalData.hospitalName || email;
    res.sendFile(path.join(__dirname, "public", "startqueue.html"));
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send(`<script>alert("Server error: ${error.message}"); history.back();</script>`);
  }
});

app.post("/signup", async (req, res) => {
  try {
    // form sends: Hospital, license, email, password, Address, state, city
    const { Hospital, license, email, password, Address, state, city } = req.body;

    if (!Hospital || !email || !password || !Address)
      return res.status(400).send(`<script>alert("All fields are required"); history.back();</script>`);

    if (!db)
      return res.status(503).send(`<script>alert("Database not connected"); history.back();</script>`);

    // Check if already exists
    const existing = await getHospitalData(email);
    if (existing)
      return res.status(409).send(`<script>alert("Hospital with this email already exists"); history.back();</script>`);

    await db.collection("Hospitals").doc(email).set({
      Hospital,
      license,
      email,
      password,
      Address,
      state,
      city,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.send(`<script>alert("Signup successful! Please login."); window.location.href="/hospital";</script>`);
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).send(`<script>alert("Server error: ${error.message}"); history.back();</script>`);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// ─── Token / Queue Routes ─────────────────────────────────────────────────────

// Add token to live queue (called from patient1.html)
app.post("/api/addtoken", async (req, res) => {
  try {
    const { tokenNumber, mobilenum } = req.body;
    if (!tokenNumber || !mobilenum)
      return res.status(400).json({ error: "tokenNumber and mobilenum required" });

    if (!db) return res.status(503).json({ error: "Database not connected" });

    await db.collection("livequeue").doc(String(tokenNumber)).set({
      tokenNumber: String(tokenNumber),
      mobilenum,
      status: "waiting",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "Token added to queue" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete/remove token from queue
app.post("/api/completetoken", async (req, res) => {
  try {
    const { tokenNumber } = req.body;
    if (!db) return res.status(503).json({ error: "Database not connected" });
    await db.collection("livequeue").doc(String(tokenNumber)).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all live queue tokens
app.get("/api/livequeue", async (req, res) => {
  try {
    if (!db) return res.json({ data: [] });
    const snapshot = await db.collection("livequeue").orderBy("createdAt").get();
    const tokens = snapshot.docs.map(doc => doc.data());
    res.json({ data: tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify patient token
app.post("/verify", async (req, res) => {
  try {
    const { mobilenum, tokenNumber } = req.body;
    if (!mobilenum || !tokenNumber)
      return res.status(400).json({ success: false, message: "Mobile number and token number are required" });

    if (!db) return res.status(503).json({ success: false, message: "Database not connected" });

    const snapshot = await db.collection("livequeue")
      .where("mobilenum", "==", mobilenum)
      .where("tokenNumber", "==", String(tokenNumber))
      .get();

    if (snapshot.empty)
      return res.status(401).json({ success: false, message: "Token not found. Please check your details." });

    const allSnapshot = await db.collection("livequeue").orderBy("createdAt").get();
    const allTokens = allSnapshot.docs.map(doc => doc.data().tokenNumber);

    res.json({
      success: true,
      data: {
        verifiedToken: snapshot.docs[0].data(),
        allTokens,
      },
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Swap Routes ──────────────────────────────────────────────────────────────

app.post("/submitSwapRequest", async (req, res) => {
  const { fromToken, toToken, reason, fromMobile } = req.body;
  if (!fromToken || !toToken || !reason || !fromMobile)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    if (!db) return res.status(503).json({ error: "Database not connected" });

    // Auto-decline any previous pending requests from this fromToken
    const oldSnap = await db.collection("swapRequests")
      .where("fromToken", "==", String(fromToken))
      .where("status", "==", "pending")
      .get();
    const batch = db.batch();
    oldSnap.docs.forEach(doc => batch.update(doc.ref, { status: "declined" }));
    await batch.commit();

    // Add new request
    const ref = await db.collection("swapRequests").add({
      fromToken: String(fromToken),
      toToken: String(toToken),
      reason,
      fromMobile,
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: "Swap request submitted successfully!", id: ref.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/getSwapRequests", async (req, res) => {
  const { mobilenum } = req.query;
  if (!mobilenum) return res.status(400).json({ error: "Missing mobile number" });

  try {
    if (!db) return res.json({ data: null });

    const tokenSnap = await db.collection("livequeue").where("mobilenum", "==", mobilenum).get();
    if (tokenSnap.empty) return res.json({ data: null });

    const userToken = tokenSnap.docs[0].data().tokenNumber;

    const swapSnap = await db.collection("swapRequests")
      .where("toToken", "==", userToken)
      .where("status", "==", "pending")
      .get();

    if (swapSnap.empty) return res.json({ data: null });

    // Return the latest pending request with its doc ID
    const doc = swapSnap.docs[swapSnap.docs.length - 1];
    res.json({ data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/processSwap", async (req, res) => {
  const { fromToken, toToken, action, docId } = req.body;
  if (!fromToken || !toToken || !action)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    if (!db) return res.status(503).json({ error: "Database not connected" });

    // Find by docId if provided, else query
    let swapRef;
    if (docId) {
      swapRef = db.collection("swapRequests").doc(docId);
    } else {
      const swapQuery = await db.collection("swapRequests")
        .where("fromToken", "==", String(fromToken))
        .where("toToken", "==", String(toToken))
        .where("status", "==", "pending")
        .get();
      if (swapQuery.empty)
        return res.status(404).json({ error: "Swap request not found" });
      swapRef = swapQuery.docs[0].ref;
    }

    const batch = db.batch();

    if (action === "accept") {
      // Swap mobile numbers in livequeue
      const fromRef = db.collection("livequeue").doc(String(fromToken));
      const toRef = db.collection("livequeue").doc(String(toToken));
      const [fromDoc, toDoc] = await Promise.all([fromRef.get(), toRef.get()]);

      if (fromDoc.exists && toDoc.exists) {
        batch.update(fromRef, { mobilenum: toDoc.data().mobilenum });
        batch.update(toRef, { mobilenum: fromDoc.data().mobilenum });
      }
      batch.update(swapRef, { status: "accepted" });

      // Auto-decline all other pending requests for this toToken
      const othersSnap = await db.collection("swapRequests")
        .where("toToken", "==", String(toToken))
        .where("status", "==", "pending")
        .get();
      othersSnap.docs.forEach(doc => {
        if (doc.ref.id !== swapRef.id) batch.update(doc.ref, { status: "declined" });
      });
    } else {
      batch.update(swapRef, { status: "declined" });
    }

    await batch.commit();
    res.json({ message: `Swap request ${action}ed successfully!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Camp Routes ──────────────────────────────────────────────────────────────

app.post("/coinform", async (req, res) => {
  try {
    const { hospitalName, email, contactPerson, telephoneNumber } = req.body;
    if (!hospitalName || !email || !contactPerson || !telephoneNumber)
      return res.status(400).json({ error: "All fields are required" });

    if (!db) return res.status(503).json({ error: "Database not connected" });

    const ref = await db.collection("CampHospitals").add({
      hospitalName, email, contactPerson, telephoneNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: "Hospital registered successfully", id: ref.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/next", async (req, res) => {
  try {
    const { campTitle, campDate, campEndTime, campType, venue, expectedServicesAttendees, benefits } = req.body;
    if (!campTitle || !campDate || !campEndTime || !venue || !expectedServicesAttendees || !benefits)
      return res.status(400).json({ error: "All fields are required" });

    if (!db) return res.status(503).json({ error: "Database not connected" });

    const ref = await db.collection("camps").add({
      campTitle, campDate, campEndTime, campType, venue,
      expectedServicesAttendees, benefits,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: "Camp details saved successfully", id: ref.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/camps", async (req, res) => {
  try {
    if (!db) return res.json([]);
    const snapshot = await db.collection("camps").orderBy("createdAt", "desc").get();
    if (snapshot.empty) return res.json([]);
    const camps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(camps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Patient Record Route ─────────────────────────────────────────────────────

app.post("/patientupdate", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not connected" });
    await db.collection("patients").add(req.body);
    res.sendFile(path.join(__dirname, "public", "patient1.html"));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
