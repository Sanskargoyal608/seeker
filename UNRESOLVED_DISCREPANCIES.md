# Frontend vs Backend Discrepancy & Placeholder Report

This document outlines the current discrepancies between the frontend UI (based on the new "Buddy Wellness" design system) and the Django backend. Specifically, it lists all the features that are currently mocked or placed as placeholders in the frontend UI, which still require backend models, API endpoints, or integration.

## 1. Home Dashboard (`BuddyDashboard.js`)
*   **Daily Practice / Exercises:** 
    *   **Current State:** The "Daily Practice" section (Daily Meditation, Mood Check-in, Breathing Exercise) is fully hardcoded in the UI. 
    *   **Action Needed:** Requires a backend model (e.g., `WellnessExercise`) to store available exercises, track completion, and an API endpoint to fetch recommended exercises for the current day.
*   **Recommended for You (Therapist Match):** 
    *   **Current State:** The recommended therapist card ("Dr. Sarah Chen", "98% Match", "$120/session") is hardcoded.
    *   **Action Needed:** Needs to be wired up to a matching algorithm endpoint (e.g., `/api/therapists/recommendations/`) that calculates match percentage based on the user's profile and triage results.

## 2. Settings & Profile (`settings.js`)
*   **Financial Summary:** 
    *   **Current State:** The billing card showing "$1,420.50 Total Invested", "$185.00 This Month", and "4 Credits Left" is entirely static.
    *   **Action Needed:** Although the `SeekerBillingRecord` model was created in the backend, the frontend `settings.js` is not yet fetching this data. An API endpoint needs to aggregate these totals and feed them to the UI.
*   **Profile Context & Badges:**
    *   **Current State:** "Premium Member" and "Daily Goal: Mindful Breath" are static badges.
    *   **Action Needed:** The user model needs fields for `subscription_tier` and `daily_goal`.

## 3. Discover Support / Match Quiz
*   **Personalized Match Program:**
    *   **Current State:** The onboarding quiz UI is in place but acts as a visual placeholder.
    *   **Action Needed:** The backend quiz engine (scoring mechanism and routing logic) needs to be implemented to dynamically process quiz answers and output a recommended therapist list.

## 4. Features present in Backend, but missing/incomplete in Frontend
*   **Crisis Keywords & Triage Messages:** 
    *   **Backend:** Robust logic for `CrisisKeyword` parsing and `CrisisAlert` generation exists.
    *   **Frontend:** The UI has an AI triage chat, but lacks a specific visual "Crisis Mode" state if the backend detects severe distress.
*   **Therapy Modalities:**
    *   **Backend:** Therapists have detailed `TherapyModality` fields.
    *   **Frontend:** The therapist profile/search UI currently simplifies or omits detailed filtering by modalities.
