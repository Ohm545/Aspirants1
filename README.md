# Aspirants - Hospital Queue Management System

A web-based system to manage hospital appointment wait times, reducing overcrowding and uncertainty for patients.

## Problem Statement

Managing appointment wait times is a major challenge. Outdated systems force patients to arrive early and endure long, uncertain waits in overcrowded, unhygienic areas.

## Features

- Hospital login & signup
- Live patient queue management
- Token-based appointment system
- Queue swap requests between patients
- Medical camp registration & listing
- Department-wise patient routing
- Patient record management

## Project Structure

```
├── public/              # Frontend (HTML, CSS, JS, images)
│   ├── t1.html          # Landing / home page
│   ├── t2.html          # Hospital dashboard
│   ├── startqueue.html  # Queue management
│   ├── patientqueue.html
│   ├── patient1.html
│   ├── department.html
│   ├── camp.html        # Medical camps
│   └── ...
├── server.js            # Express + Firebase backend
├── package.json
├── .env.example         # Environment variable template
└── serviceAccountKey.json  # (NOT committed) Firebase service account
```

## Setup & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add Firebase service account:
   - Download `serviceAccountKey.json` from your Firebase project settings
   - Place it in the project root

3. Configure environment:
   ```bash
   cp .env.example .env
   # Fill in your values
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open `http://localhost:5000`

## Tech Stack

- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js + Express
- Database: Firebase Firestore
- Auth/Notifications: Twilio

## Demo

[Watch the demo video](https://youtu.be/M7jW0xxSXDQ)

> Note: The Firebase API keys in the public repo may be revoked. You'll need your own Firebase project to run this locally.
