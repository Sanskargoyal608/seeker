# Seeker Platform — Feature Status Tracker
### Last Updated: September 18, 2026

---

## 1. What Is DONE ✅

### Completed in Polish Phase
- [x] Forgot password dynamic endpoints
- [x] Booking provider dynamic header
- [x] Chat AI sentiment scoring (OpenAI connected)
- [x] Compliance docs upload to MinIO
- [x] Counselor dynamic profile fields
- [x] Public profile dynamic fields
- [x] Settings financial data & notification toggles
- [x] Mentorship apply & accept workflow with chat
- [x] Therapist dashboard backchannel
- [x] Counselor availability toggle persistence
- [x] Daily Practice: 4-7-8 Breathing timer
- [x] Daily Practice: Mood Check-in with history

### Authentication & User Management
- [x] 3-step Email OTP registration (request → verify → complete)
- [x] Role-based registration (General User, Counselor, Therapist)
- [x] Login with email/password
- [x] JWT access + refresh tokens with Redis device tracking
- [x] Silent token refresh via Axios interceptor
- [x] Forgot password (OTP-based reset)
- [x] Logout (single device)
- [x] Logout all devices (backend)
- [x] Account deletion (soft delete)
- [x] Profile editing (all roles)
- [x] MinIO file upload for credentials/licenses
- [x] Admin verification workflow for counselors/therapists
- [x] Auth rehydration on web page refresh (localStorage → Redux)
- [x] Emergency contact management (≥2 contacts for general users)

### AI Triage System
- [x] 4-phase conversational triage (OPENING → EXPLORATION → DEEPENING → CLOSING)
- [x] OpenAI GPT-4o-mini integration with structured JSON output
- [x] RAG context injection from clinical research documents
- [x] Clinical vs Life-Stress distinction logic (hardcoded tag sets)
- [x] Multi-phase jump state machine (skip phases if data is rich)
- [x] Python-controlled severity scoring (not trusting AI decisions blindly)
- [x] Crisis protocol (auto-flag suicidal ideation, self-harm)
- [x] Automatic session creation on triage completion
- [x] Clinical intake summary auto-attached as SessionNote
- [x] Auto-withdraw stale waiting sessions (60 min timeout)

### Real-Time Chat
- [x] WebSocket chat via Django Channels + Daphne
- [x] Message persistence to PostgreSQL (ChatMessage model)
- [x] Sender attribution on messages
- [x] Session timer (15-min freemium countdown)
- [x] Payment gate (message hold when timer expires)
- [x] Crisis keyword scanning during chat
- [x] Crisis alert generation + admin email notification
- [x] WhatsApp-style bubble alignment (left/right)
- [x] Typing indicator animation
- [x] Chat history on reconnect/reload

### Counselor Features
- [x] Live FIFO waiting queue with Accept/Decline
- [x] Horizontal auto-scrolling queue widget (new dashboard)
- [x] Atomic session acceptance (select_for_update prevents race conditions)
- [x] Private clinical notes (per session)
- [x] Session escalation to licensed therapist
- [x] Chat rate slider (per-minute billing)
- [x] Earnings & payout tracking
- [x] "Chats" inbox (all accepted/scheduled sessions)
- [x] Mentorship directory (therapist search)

### Therapist Features
- [x] Escalation queue (live polling every 10s)
- [x] Accept/decline escalation requests
- [x] Private backchannel chat (therapist ↔ counselor, hidden from patient)
- [x] Client roster with grouped session history
- [x] Calendar view (14-day timeline)
- [x] Availability slot management (CRUD + bulk)
- [x] Blocked date management
- [x] Bookable slot calculator
- [x] Booking engine (intake → slot → confirmation)
- [x] Earnings wallet with withdrawal
- [x] Follow-up session initiation (therapist-initiated)
- [x] Client intake data viewing

### Discovery & Scheduling
- [x] Typesense search integration (therapist profiles)
- [x] Search by specialty, language, modality, max price
- [x] Django signal-based Typesense sync on profile save/delete
- [x] Public profile pages (by slug)
- [x] 14-day slot availability calculator
- [x] Booking with intake data
- [x] Scheduled session reminders (24h + 1h via Celery)

### Notifications
- [x] Firebase FCM push notifications (Android)
- [x] In-app notification list with mark-as-read
- [x] Notification deep-links to relevant screens
- [x] Push for: new messages, escalations, session requests, reminders, payouts
- [x] Email notifications via SMTP (Mailhog for local testing)
- [x] Web push stub (no-op on web)

### Session Lifecycle
- [x] State machine: WAITING → MATCHED → SCHEDULED → ACTIVE → PAYMENT_PENDING → PAID → ENDED
- [x] Graceful session end with duration calculation
- [x] Automatic earnings calculation (20% platform fee)
- [x] Post-session 4-question qualitative feedback
- [x] Feedback prompt (Celery task, 5 min delay after session end)

### Web Conversion (Phases 1-3)
- [x] react-native-web integration
- [x] Platform-specific shims (storage, documentPicker, pushNotifications, DateTimePicker)
- [x] Responsive breakpoint hook (useResponsive)
- [x] Desktop sidebar navigation (collapsible, role-based)
- [x] PageContainer max-width constraint
- [x] Two-column desktop chat layout

### Crisis & Safety
- [x] Panic button (user-facing emergency trigger)
- [x] Crisis keyword detection in chat messages
- [x] CrisisAlert model + automatic admin notification
- [x] Helpline directory with native phone dialer
- [x] Crisis banner in triage (when flags detected)
- [x] Admin session termination + user suspension

### Infrastructure
- [x] Docker Compose (10 services)
- [x] PostgreSQL 16 with persistent volumes
- [x] Redis 7 for caching, Celery broker, Channels layer
- [x] Celery Worker + Beat scheduler
- [x] Flower monitoring
- [x] MinIO S3-compatible storage
- [x] Mailhog local email testing
- [x] Typesense search engine
- [x] CORS configured (allow all origins)

---

## 2. What Is PARTIALLY DONE ⚠️

| Feature | What Works | What's Missing |
|---|---|---|
| **Web Conversion Phase 4** | Phases 1-3 done | Screen-by-screen polish for 26 screens still needed |
| **Web Conversion Phase 5** | — | Nginx deployment + Docker config not done |
| **Payment Integration** | Mock verify endpoint works | Razorpay SDK webhook verification not integrated |

---
|---|---|
| **Forgot Password** | UI + OTP flow | Frontend calls `/forgot-password/request/` instead of `/forgot-password/` — endpoint path mismatch |
| **Booking Provider Card** | Slot selection + booking API | Header hardcodes "Dr. Sarah Chen" instead of loading therapist name |
| **Chat AI Emotion Bar** | Chat itself works fully | "AI Support: Anxiety score: 0.72" is static hardcoded text |
| **Compliance Docs Upload** | File picker works | Only saves filename string — no actual MinIO binary upload from frontend |
| **Counselor Profile** | Rate slider, balance, sessions | Bio, education, specialties are hardcoded placeholders |
| **Public Profile** | Loads by slug from API | Education & practicum are static text; "Free Chat" button unhandled |
| **Settings Financial Card** | Password change, account delete work | \$1,420.50 financial summary is hardcoded; notification toggles aren't saved |
| **Mentorship** | Therapist search works | "Personalized Match" and "Apply" buttons have no handlers |
| **Therapist Dashboard** | Escalation queue + accept work | Backchannel button shows Alert instead of navigating |
| **Therapist Client Detail** | Profile loads from API | Clinical notes save is stubbed; video call button unhandled |
| **Web Conversion Phase 4** | Phases 1-3 done | Screen-by-screen polish for 26 screens still needed |
| **Web Conversion Phase 5** | — | Nginx deployment + Docker config not done |
| **Payment Integration** | Mock verify endpoint works | Razorpay SDK webhook verification not integrated |
| **Counselor Availability Toggle** | UI toggle works | State is local only — not persisted to CounselorAvailability model |

---

## 3. What Is LEFT TO DO ❌

### Critical (Must Have)
- [ ] **Video/Audio Calling** — WebRTC or Twilio/Agora integration
- [ ] **Real Payment Gateway** — Razorpay webhook verification replacing mock endpoint
- [ ] **Root README.md** — Project setup/onboarding documentation
- [ ] **Automated test suite** — Phase 2 Sprint 10 was deferred; >90% coverage target unmet

### High Priority
- [ ] **Mood Tracking** — Daily mood check-in with emoji/slider + trend visualization
- [ ] **Journaling** — Freeform text/voice journal entries with AI-tagged emotions
- [ ] **CBT/DBT Exercises** — Interactive thought records, behavioral activation, breathing tools
- [ ] **Async Messaging Thread** — Between-session messaging (not real-time WebSocket)
- [ ] **Recurring Assessments** — PHQ-9/GAD-7 every 14-30 days with progress charts
- [ ] **AI Session Notes** — Auto-generate SOAP/DAP notes from chat transcripts
- [ ] **Multi-Language Support** — i18n + Hindi/regional language content
- [ ] **Calendar Sync** — Google Calendar / Apple Calendar API integration
- [ ] **Therapist Matching Algorithm** — Weighted scoring beyond basic Typesense search
- [ ] **Therapist Introduction Videos** — 30-sec video bios for better matching
- [ ] **Google OAuth2 / Social Login** — Originally planned in Info.md, dropped, still useful
- [ ] **HIPAA/GDPR Compliance Documentation** — Required for any healthcare app
- [ ] **End-to-End Encryption** — Chat messages encrypted at rest and in transit

### Medium Priority
- [ ] **Group Therapy / Support Groups** — Moderated group sessions
- [ ] **Wearable Integration** — Apple Health / Google Fit HRV and sleep data
- [ ] **AI Emotion Analysis (Real)** — Replace hardcoded "Anxiety score: 0.72" with actual NLP
- [ ] **Gamified Wellness** — Streaks, achievements, daily goals (without guilt-tripping)
- [ ] **Offline Mode** — Cache recent messages and allow offline journaling
- [ ] **Dark Mode** — Theme toggle with dark color palette
- [ ] **Rate Limiting UI Feedback** — Show user when they hit API rate limits
- [ ] **Admin Dashboard** — Web-based admin panel beyond Django admin
- [ ] **Analytics Dashboard** — Usage stats, session trends, clinician performance
- [ ] **Superbill Generation** — ICD-10/CPT coded receipts for insurance claims
- [ ] **CHANGELOG.md + CONTRIBUTING.md** — Project documentation hygiene

### Future / Post-MVP
- [ ] **"Therapist-Aligned AI Copilot"** — Between-session AI trained on therapist's treatment plan
- [ ] **"Care Graduation" Pathways** — Milestone-based 12-week programs
- [ ] **Biometric Panic Detection** — Smartwatch-triggered anxiety interventions
- [ ] **"Circle of Support"** — Privacy-preserved family integration
- [ ] **Precision Psychiatry** — Pharmacogenomics-informed medication matching
- [ ] **AWS/Kubernetes Deployment** — Cloud infrastructure scaling
- [ ] **CI/CD Pipeline** — GitHub Actions automated testing and deployment

---

## 4. Roadmap Phase Status

### Phase 1: Foundation & Local Environment (Weeks 1-8)
| Task | Status |
|---|---|
| T1-T3: Docker, Git, Infrastructure | ✅ Complete |
| T4-T5: Django scaffold, 25+ models | ✅ Complete |
| T6-T7: OTP auth, Redis JWT | ✅ Complete |
| T8-T11: Admin, MinIO, Verification | ✅ Complete |
| T12-T13: React Native, Redux, Axios | ✅ Complete |
| T14: CI/CD (GitHub Actions) | ⚠️ Deferred |

### Phase 2: AI Triage, Real-Time Chat & Session Core (10 Sprints)
| Sprint | Feature | Status |
|---|---|---|
| Sprint 1 | WebSocket Foundation | ✅ Complete |
| Sprint 2 | Session State Machine | ✅ Complete |
| Sprint 3 | Gemini/OpenAI AI Triage | ✅ Complete |
| Sprint 4 | Crisis Detection | ✅ Complete |
| Sprint 5 | Payment & Timer | ⚠️ Mock only |
| Sprint 6 | Counselor Live Queue | ✅ Complete |
| Sprint 7 | Notes & Escalation | ✅ Complete |
| Sprint 8 | Firebase FCM Push | ✅ Complete |
| Sprint 9 | Feedback & Earnings | ✅ Complete |
| Sprint 10 | Testing & Validation | ❌ Not Done |

### Phase 3: Therapist Portal, Scheduling & Discovery (4 Sprints)
| Sprint | Feature | Status |
|---|---|---|
| Sprint 1 | Availability & Booking Engine | ✅ Complete |
| Sprint 2 | Typesense Discovery Engine | ✅ Complete |
| Sprint 3 | Escalation Backchannel (was: Next.js Web Portal) | ✅ Complete |
| Sprint 4 | Advanced Clinical Chat & Dashboard | ✅ Complete |

### Web Conversion Plan (5 Phases)
| Phase | Feature | Status |
|---|---|---|
| Phase 1 | react-native-web + Metro bundler | ✅ Complete |
| Phase 2 | Platform shims (storage, picker, notifications) | ✅ Complete |
| Phase 3 | Responsive layout (sidebar, breakpoints) | ✅ Complete |
| Phase 4 | Screen-by-screen polish (26 screens) | ❌ Not Done |
| Phase 5 | Docker/Nginx deployment | ❌ Not Done |

### Phase 4: Polish & Production (Planned, Not Started)
- [ ] Replace all placeholder UI data
- [ ] Complete web responsive polish
- [ ] Razorpay real payment integration
- [ ] Automated test suite (>90% coverage)
- [ ] Performance optimization
- [ ] Security audit

### Phase 5: Scale & Differentiate (Planned, Not Started)
- [ ] Video/Audio calling
- [ ] Mood tracking & journaling
- [ ] CBT/DBT exercise library
- [ ] AI session notes
- [ ] Multi-language support
- [ ] Wearable integration
- [ ] Cloud deployment (AWS/Kubernetes)

---

## 5. Placeholder vs Real Data Summary

### 🔴 Currently Hardcoded in Frontend (Must Fix)

*All hardcoded UI placeholders have been resolved and wired to backend APIs.*

---|---|---|
| `BuddyDashboard.js` | "Dr. Sarah Chen, 98% Match, \$120/session" | Backend recommendation algorithm |
| `BuddyDashboard.js` | Daily Practice grid (Meditation, Mood Journal, Breathing) | Backend `WellnessExercise` model |
| `settings.js` | "\$1,420.50 Total Invested", "\$185.00 This Month" | `GET /api/core/user/billing/` |
| `settings.js` | "Premium Member", "Daily Goal: Mindful Breath" | Subscription/tier model |
| `counselor-profile.js` | "PhD in Clinical Psychology, Stanford University, 2012" | User's actual education from profile |
| `counselor-profile.js` | Bio text about "cognitive behavioral therapy" | User's actual bio field |
| `counselor-profile.js` | Specialties: Stress, Anxiety, Career Burnout, Relationships | User's actual specialization from profile |
| `public-profile.js` | "M.S. in Counseling... UPenn 2021-2023" | Load from backend profile |
| `public-profile.js` | "Sarah Chen" fallback name | Remove fallback, show "Unknown" |
| `book/[therapist_id].js` | "Dr. Sarah Chen, Licensed Psychotherapist • CBT" | Fetch from therapist profile API |
| `chat/[id].js` | "AI Support: Emotional intensity rising (Anxiety score: 0.72)" | Real AI sentiment analysis or remove |
| `chat/[id].js` | Desktop sidebar "Additional tools and notes will appear here" | Clinical tools panel or remove |
| `escalation.js` | Entire screen (mock therapists, setTimeout) | Delete screen or wire to real API |
| `mentorship.js` | "5.0 (New)" rating badge | Real rating system or remove |
| `CounselorDashboard.js` | Summary bar "Completed Today: 12", "Avg Duration: 24m" | Calculate from real session data |

---
