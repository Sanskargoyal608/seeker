# Seeker: Android → Web Conversion Plan

> **Goal:** Ship a fully-featured web version of the Seeker mental health platform that runs alongside the existing Android app, sharing a single codebase and backend.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Snapshot](#2-current-architecture-snapshot)
3. [Web Conversion Strategy](#3-web-conversion-strategy)
4. [Phase 1 — Foundation & Compilation](#phase-1--foundation--compilation-2-3-days)
5. [Phase 2 — Platform Compatibility Layer](#phase-2--platform-compatibility-layer-3-4-days)
6. [Phase 3 — Responsive / Adaptive Layout](#phase-3--responsive--adaptive-layout-5-7-days)
7. [Phase 4 — Feature Parity & Polish](#phase-4--feature-parity--polish-5-7-days)
8. [Phase 5 — Testing, Security & Deployment](#phase-5--testing-security--deployment-3-4-days)
9. [Backend Changes Required](#backend-changes-required)
10. [Risk Register](#risk-register)
11. [File-by-File Impact Matrix](#file-by-file-impact-matrix)
12. [Estimated Timeline](#estimated-timeline)

---

## 1. Executive Summary

The Seeker frontend is built with **Expo SDK 57 + React Native 0.86 + Expo Router**. This stack already supports web compilation via `react-native-web`. The conversion strategy is:

1. **Install web dependencies** (`react-dom`, `react-native-web`, `@expo/metro-runtime`)
2. **Create platform shims** for native-only packages (SecureStore, Notifications, Device)
3. **Build an adaptive layout system** (sidebar on desktop, bottom tabs on mobile)
4. **Polish every screen** for mouse/keyboard interaction and responsive widths
5. **Deploy** the web build via the existing Docker infrastructure

> **IMPORTANT:** No backend code changes are needed for basic operation. CORS is already configured (`CORS_ALLOW_ALL_ORIGINS = True`), WebSockets already accept JWT tokens via query parameters (browser-compatible), and Daphne (ASGI) already serves both HTTP and WebSocket traffic.

---

## 2. Current Architecture Snapshot

### Frontend Stack
| Layer | Technology | Web-Ready? |
|-------|-----------|------------|
| Framework | Expo SDK 57 | ✅ Yes |
| UI | React Native 0.86 | ✅ via `react-native-web` |
| Routing | Expo Router (file-based) | ✅ Maps to web URLs |
| State | Redux Toolkit + React Query | ✅ Platform-agnostic |
| HTTP | Axios | ✅ Platform-agnostic |
| WebSockets | Native `WebSocket` API | ✅ Browser-native |
| Storage | `expo-secure-store` | ❌ Native-only — needs web shim |
| Notifications | `expo-notifications` | ❌ Native-only — needs web shim |
| Device Info | `expo-device` | ❌ Native-only — needs web shim |

### Screens (26 total)
| Category | Screens | Count |
|----------|---------|-------|
| Auth | login, register, request-otp, verify-otp, forgot-password | 5 |
| User (General) | dashboard, triage, chat/[id], profile, edit-profile, settings, therapist-search, book/[therapist_id], schedule, notifications, feedback/[id], helpline, mentorship, compliance, escalation, public-profile | 16 |
| Therapist Portal | dashboard, calendar, clients, client/[id], earnings, manage-schedule, notifications, profile | 8 |
| Backchannel | backchannel/[id] | 1 |

> (Some screens are shared across roles via conditional rendering)

### Components (7 shared)
`BottomNav`, `BuddyDashboard`, `CounselorDashboard`, `EmergencyContactForm`, `OTPInput`, `PanicButton`, `RoleSelector`

### Backend (No changes needed for MVP)
- Django 4.x + DRF + Django Channels (Daphne ASGI)
- JWT auth via `Authorization: Bearer` header (no cookies)
- WebSocket auth via `?token=<jwt>` query parameter (already browser-compatible)
- CORS: `CORS_ALLOW_ALL_ORIGINS = True` with `django-cors-headers`
- Docker Compose with PostgreSQL, Redis, Celery, MinIO, Typesense, MailHog

---

## 3. Web Conversion Strategy

### Approach: Single Codebase, Platform Shims

We will **NOT** create a separate web app (no Next.js, no separate React app). Instead, we extend the existing Expo/React Native codebase to also compile for web. This means:

- **~90% of code is shared** between Android and Web
- **Platform-specific files** use the `.web.js` / `.native.js` convention (Expo resolves these automatically)
- **One `npm run web`** command starts the web dev server
- **One build command** produces the static web bundle for deployment

### Why Not Next.js?

| Factor | Expo Web (chosen) | Next.js (rejected) |
|--------|-------------------|---------------------|
| Code sharing | ~90% shared with mobile | ~30% shared (rewrite most screens) |
| Maintenance | 1 codebase | 2 separate codebases |
| Time to ship | 3-4 weeks | 8-12 weeks |
| Routing | Already done (Expo Router) | Must rebuild from scratch |
| SSR/SEO | Not needed (authenticated app) | Overkill for our use case |

---

## Phase 1 — Foundation & Compilation (2-3 days)

### 1.1 Install Web Dependencies

```bash
npx expo install react-dom react-native-web @expo/metro-runtime
```

These three packages are all that's needed to enable web compilation in Expo.

### 1.2 Update `app.json` Web Configuration

```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/favicon.png",
      "name": "Seeker - Mental Wellness Platform",
      "shortName": "Seeker",
      "description": "Connect with counselors and therapists for mental health support",
      "backgroundColor": "#fbf9f8",
      "themeColor": "#104356"
    }
  }
}
```

### 1.3 Create Web Entry HTML

Create `web/index.html` in the `frontend/` directory (Expo uses this as the web shell):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
  <title>Seeker</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

### 1.4 Verify Compilation

```bash
npx expo start --web
```

At this point, the app will likely crash due to native-only imports. That's expected — Phase 2 handles these.

### 1.5 Files Changed
| File | Action |
|------|--------|
| `package.json` | Add `react-dom`, `react-native-web`, `@expo/metro-runtime` |
| `app.json` | Add `web` configuration block |

---

## Phase 2 — Platform Compatibility Layer (3-4 days)

### 2.1 Storage Shim: `expo-secure-store` → `localStorage`

`expo-secure-store` is used in `api/axios.js` for storing JWT tokens. On web, we'll fall back to `localStorage`.

#### [NEW] `frontend/utils/storage.web.js`
```javascript
// Web: Use localStorage (tokens are not "secure" in browser context anyway)
export const storage = {
  getItemAsync: async (key) => localStorage.getItem(key),
  setItemAsync: async (key, value) => localStorage.setItem(key, value),
  deleteItemAsync: async (key) => localStorage.removeItem(key),
};
```

#### [NEW] `frontend/utils/storage.native.js`
```javascript
// Native: Use expo-secure-store (encrypted storage)
import * as SecureStore from 'expo-secure-store';
export const storage = {
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: SecureStore.setItemAsync,
  deleteItemAsync: SecureStore.deleteItemAsync,
};
```

#### [MODIFY] `frontend/api/axios.js`
Replace all `import * as SecureStore from 'expo-secure-store'` with:
```javascript
import { storage } from '../utils/storage';
```
Replace all `SecureStore.getItemAsync(...)` → `storage.getItemAsync(...)`, etc.

### 2.2 Notifications Shim

`expo-notifications` and `expo-device` are used in push notification registration. On web, these should gracefully no-op.

#### [NEW] `frontend/hooks/usePushNotifications.web.js`
```javascript
// Web: No-op for push notifications (Phase 5 can add browser Web Push API)
export default function usePushNotifications() {
  return { expoPushToken: null, notification: null };
}
```

The existing `usePushNotifications.js` should be renamed to `usePushNotifications.native.js`.

### 2.3 DateTimePicker Shim

`@react-native-community/datetimepicker` is native-only. On web, we use the browser's native `<input type="date">` / `<input type="time">`.

#### [NEW] `frontend/components/DateTimePicker.web.js`
A simple wrapper around HTML `<input type="date" />` styled to match the app theme.

#### [NEW] `frontend/components/DateTimePicker.native.js`
Re-exports `@react-native-community/datetimepicker`.

#### [MODIFY] All screens using the picker
Import from `../components/DateTimePicker` instead of `@react-native-community/datetimepicker`.

### 2.4 Document Picker Shim

`expo-document-picker` is used in `compliance.js`. On web, we use the browser's native `<input type="file">`.

#### [NEW] `frontend/utils/documentPicker.web.js`
```javascript
export const pickDocument = () => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) resolve({ type: 'success', assets: [{ uri: URL.createObjectURL(file), name: file.name, size: file.size, file }] });
      else resolve({ type: 'cancel' });
    };
    input.click();
  });
};
```

#### [NEW] `frontend/utils/documentPicker.native.js`
```javascript
import * as DocumentPicker from 'expo-document-picker';
export const pickDocument = () => DocumentPicker.getDocumentAsync({ type: '*/*' });
```

### 2.5 Already Web-Compatible (No Changes Needed)

| Package | Why It Works |
|---------|-------------|
| `expo-linear-gradient` | Compiles to CSS gradients on web |
| `react-native-gesture-handler` | Has built-in web support |
| `react-native-safe-area-context` | Returns zero insets on browsers |
| `@expo/vector-icons` | Uses web fonts on web |

### 2.6 Summary of Platform Shims

| Package | Native | Web Replacement |
|---------|--------|-----------------|
| `expo-secure-store` | Encrypted keychain | `localStorage` |
| `expo-notifications` | APNs/FCM | No-op (Web Push later) |
| `expo-device` | Device info | No-op / `navigator.userAgent` |
| `@react-native-community/datetimepicker` | Native picker | HTML `<input type="date">` |
| `expo-document-picker` | Native file picker | HTML `<input type="file">` |

---

## Phase 3 — Responsive / Adaptive Layout (5-7 days)

This is the most significant phase. The goal is to make the app look great on both mobile browsers and desktop monitors.

### 3.1 Create Responsive Hook

#### [NEW] `frontend/hooks/useResponsive.js`
```javascript
import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    width,
    contentMaxWidth: width >= 1024 ? 1200 : width >= 768 ? 720 : width,
  };
}
```

### 3.2 Create Adaptive Shell Layout

On **mobile web / Android**: Keep the existing bottom tabs + full-screen stack navigation.

On **desktop web**: Replace bottom tabs with a permanent **sidebar** on the left, and render screen content in the main area.

#### [NEW] `frontend/components/WebSidebar.js`
A vertical sidebar component with navigation links, rendered only on `isDesktop`. Contains:
- Logo/brand at top
- Navigation links (Home, Discovery/Mentorship, Chat, Profile, Settings)
- Role-aware links (Counselor: Waiting Queue; Therapist: Calendar, Clients, Earnings)
- User avatar + logout at bottom

#### [MODIFY] `frontend/components/BottomNav.js`
Add a web guard: if `isDesktop`, return `null` (hide bottom nav on desktop web, since the sidebar replaces it).

#### [MODIFY] `frontend/app/(app)/_layout.js`
Wrap the `<Stack>` in a flex row layout:
```jsx
const { isDesktop } = useResponsive();
return (
  <View style={{ flex: 1, flexDirection: 'row' }}>
    {isDesktop && <WebSidebar />}
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  </View>
);
```

### 3.3 Content Width Constraint

On wide monitors, content shouldn't stretch to 2000px. Add a max-width container.

#### [NEW] `frontend/components/PageContainer.js`
```javascript
export function PageContainer({ children, style }) {
  const { contentMaxWidth } = useResponsive();
  return (
    <View style={[{ flex: 1, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }, style]}>
      {children}
    </View>
  );
}
```

Each screen wraps its content in `<PageContainer>` to constrain width on desktop.

### 3.4 Chat Screen Desktop Layout

The chat screen (`chat/[id].js`) is the most complex screen. On desktop:
- Chat messages panel takes ~65% width
- Session notes / clinical info panel takes ~35% width (sidebar)
- Input bar is wider and more spacious

#### [MODIFY] `frontend/app/(app)/chat/[id].js`
Add a two-column layout when `isDesktop`:
```jsx
<View style={{ flexDirection: isDesktop ? 'row' : 'column', flex: 1 }}>
  <View style={{ flex: isDesktop ? 0.65 : 1 }}>
    {/* Chat messages + input */}
  </View>
  {isDesktop && (
    <View style={{ flex: 0.35, borderLeftWidth: 1, borderColor: COLORS.surfaceDim }}>
      {/* Session notes, intake summary, escalation tools */}
    </View>
  )}
</View>
```

### 3.5 Dashboard Desktop Layout

On desktop, the dashboard can show cards in a grid instead of a vertical scroll:

#### [MODIFY] `frontend/components/BuddyDashboard.js`
Use `flexWrap: 'wrap'` for the cards container on desktop, showing 2-3 cards per row.

#### [MODIFY] `frontend/components/CounselorDashboard.js`
Same grid treatment. Waiting queue and active sessions can be side by side.

### 3.6 Auth Screens Desktop Layout

Login/Register screens should be centered with a max width of ~450px on desktop, with a branded sidebar or background illustration.

#### [MODIFY] `frontend/app/(auth)/_layout.js`
On desktop, render a two-column layout:
- Left: Brand illustration / app info (50%)
- Right: Auth form centered (50%, max 450px)

### 3.7 Therapist Portal Desktop Layout

The therapist section already uses a tab navigator (`Tabs`). On desktop, this should become a sidebar-based layout similar to admin dashboards.

#### [MODIFY] `frontend/app/(app)/therapist/_layout.js`
On desktop, render tabs as a vertical sidebar instead of bottom tabs.

### 3.8 Keyboard & Mouse Interactions

- Add `:hover` states to all `Pressable` components (Expo supports `hovered` via `Pressable` callback)
- Add `cursor: 'pointer'` to clickable elements
- Support `Enter` key to submit forms (chat input, login, etc.)
- Add `Tab` key navigation focus styles

### 3.9 Scrollbar Styling

#### [NEW] `frontend/global.css`
```css
/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #a1a1a1; }

/* Remove default outline, add custom focus styles */
*:focus { outline: none; }
```

### 3.10 Files Changed Summary

| File | Action | Effort |
|------|--------|--------|
| `hooks/useResponsive.js` | [NEW] Responsive breakpoint hook | Small |
| `components/WebSidebar.js` | [NEW] Desktop sidebar navigation | Medium |
| `components/PageContainer.js` | [NEW] Max-width content wrapper | Small |
| `components/BottomNav.js` | [MODIFY] Hide on desktop | Small |
| `app/(app)/_layout.js` | [MODIFY] Add sidebar shell | Medium |
| `app/(app)/chat/[id].js` | [MODIFY] Two-column desktop layout | Large |
| `components/BuddyDashboard.js` | [MODIFY] Grid layout on desktop | Medium |
| `components/CounselorDashboard.js` | [MODIFY] Grid layout on desktop | Medium |
| `app/(auth)/_layout.js` | [MODIFY] Centered form + brand panel | Medium |
| `app/(app)/therapist/_layout.js` | [MODIFY] Sidebar tabs on desktop | Medium |
| `global.css` | [NEW] Scrollbar + focus styles | Small |

---

## Phase 4 — Feature Parity & Polish (5-7 days)

### 4.1 Screen-by-Screen Polish

Every screen needs to be tested and polished for web. Here's what each screen needs:

| Screen | Web Adjustments Needed |
|--------|----------------------|
| `login.js` | Center form, `Enter` key submit, autofocus email field |
| `register.js` | Multi-step form centering, role selector grid on desktop |
| `request-otp.js` | Center form, auto-focus |
| `verify-otp.js` | OTP input keyboard handling (paste support on web) |
| `forgot-password.js` | Center form |
| `dashboard.js` | Already role-switching; wrap in PageContainer |
| `triage.js` | Chat-like UI works; add Enter-to-send |
| `chat/[id].js` | Two-column layout, Enter-to-send, hover on messages |
| `profile.js` | Card grid on desktop |
| `edit-profile.js` | Form max-width, file upload for avatar |
| `settings.js` | Settings list max-width, proper form inputs |
| `therapist-search.js` | Grid cards on desktop (3 per row) |
| `book/[therapist_id].js` | DateTimePicker web shim, form centering |
| `schedule.js` | Calendar component web compat, grid view |
| `notifications.js` | List max-width |
| `feedback/[id].js` | Star rating mouse interaction, form centering |
| `helpline.js` | Card grid, click-to-call links (`tel:` scheme) |
| `mentorship.js` | Card grid |
| `compliance.js` | Document picker web shim, form centering |
| `escalation.js` | Form centering |
| `public-profile.js` | Card layout, centered content |
| `backchannel/[id].js` | Same as chat - Enter-to-send |
| `therapist/dashboard.js` | Grid cards |
| `therapist/calendar.js` | Calendar web compat |
| `therapist/clients.js` | Table layout on desktop |
| `therapist/client/[id].js` | Two-column (info + notes) |
| `therapist/earnings.js` | Charts/tables |
| `therapist/manage-schedule.js` | Time slot grid |
| `therapist/notifications.js` | List max-width |
| `therapist/profile.js` | Form max-width |
| `counselor-profile.js` | Form max-width, earnings grid |

### 4.2 OTP Input Web Compatibility

The `OTPInput.js` component uses `TextInput` refs for auto-focus between digits. This should work on web but needs:
- Clipboard paste support (detect paste event, distribute digits across fields)
- `inputMode="numeric"` for mobile web keyboards

### 4.3 WebSocket Reconnection

On Android, the app lifecycle (background/foreground) handles WebSocket reconnection. On web, browser tabs can go idle. Add:
- `visibilitychange` event listener to reconnect WebSocket when tab regains focus
- Exponential backoff reconnection logic

### 4.4 Image/Avatar Upload

If any screens use `expo-image-picker` for avatar uploads, create a web shim using `<input type="file" accept="image/*">`.

### 4.5 Slider Component

`@react-native-community/slider` is used (likely in feedback). Check if it supports web — if not, create a web shim using HTML `<input type="range">`.

### 4.6 Browser Tab Title

Update the page title dynamically based on the current route:

```javascript
// In _layout.js or a custom hook
useEffect(() => {
  if (Platform.OS === 'web') {
    document.title = `Seeker - ${currentScreenName}`;
  }
}, [currentScreenName]);
```

### 4.7 Deep Linking / URL Handling

Expo Router automatically maps routes to URLs. Verify:
- `/(app)/chat/123` → `http://localhost:3000/chat/123`
- `/(auth)/login` → `http://localhost:3000/login`
- Browser back/forward buttons work correctly

### 4.8 Loading States & Skeleton Screens

Web users expect faster visual feedback. Add skeleton loading states for:
- Dashboard cards
- Chat message list
- Therapist search results

---

## Phase 5 — Testing, Security & Deployment (3-4 days)

### 5.1 Cross-Browser Testing

| Browser | Priority |
|---------|----------|
| Chrome (Desktop) | P0 — Primary |
| Safari (macOS) | P1 |
| Firefox | P1 |
| Edge | P2 |
| Chrome Mobile (Android) | P0 |
| Safari Mobile (iOS) | P1 |

### 5.2 Security: Token Storage on Web

> **WARNING:** Storing JWT tokens in `localStorage` is vulnerable to XSS attacks. For the MVP this is acceptable (same approach as most SPAs), but for production hardening consider:
> - Using `httpOnly` cookies via a BFF (Backend For Frontend) proxy
> - Adding CSP (Content Security Policy) headers
> - Implementing token rotation

### 5.3 Build the Static Web Bundle

```bash
npx expo export --platform web
```

This produces a `dist/` folder with static HTML/CSS/JS files.

### 5.4 Docker Deployment

#### [MODIFY] `docker-compose.yml`

Update the existing `seeker-nextjs` service (which is currently a placeholder) to serve the Expo web build:

```yaml
seeker-web:
  image: nginx:alpine
  ports:
    - "3000:80"
  volumes:
    - ./frontend/dist:/usr/share/nginx/html:ro
    - ./frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro
  depends_on:
    - seeker-django
```

#### [NEW] `frontend/nginx.conf`
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to Django
    location /api/ {
        proxy_pass http://seeker-django:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy WebSocket connections
    location /ws/ {
        proxy_pass http://seeker-django:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 5.5 API Base URL Configuration

The web app needs to point to the correct API URL. Update `app.json`:

```json
{
  "extra": {
    "API_BASE_URL_MOBILE": "http://192.168.52.110:8000",
    "API_BASE_URL_WEB": "/api"
  }
}
```

Modify `api/axios.js` to pick the right URL:
```javascript
import { Platform } from 'react-native';
const baseURL = Platform.OS === 'web'
  ? (Constants.expoConfig?.extra?.API_BASE_URL_WEB || '/api')
  : (Constants.expoConfig?.extra?.API_BASE_URL_MOBILE || 'http://localhost:8000');
```

When deployed behind nginx, web requests to `/api/*` are proxied to Django, avoiding CORS entirely.

### 5.6 Build & Deploy Script

#### [NEW] `scripts/deploy-web.sh`
```bash
#!/bin/bash
cd frontend
npx expo export --platform web
cd ..
docker compose up -d seeker-web
echo "Web app deployed at http://localhost:3000"
```

---

## Backend Changes Required

> **For the MVP, ZERO backend code changes are required.**

| Concern | Current State | Action Needed |
|---------|--------------|---------------|
| CORS | `CORS_ALLOW_ALL_ORIGINS = True` | ✅ Already configured |
| WebSocket Auth | JWT via `?token=` query param | ✅ Browser-compatible |
| REST Auth | JWT via `Authorization: Bearer` | ✅ Works from browser |
| Device Hash | `User-Agent` based | ✅ Browser sends consistent UA |
| Static Files | WhiteNoise middleware | ✅ Already configured |

### Production Hardening (Post-MVP)

For production deployment, tighten CORS:

```python
# config/settings.py
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://app.seekerplatform.com",  # production domain
]
```

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| `expo-secure-store` web fallback security | Medium | Low | Use `localStorage` for MVP; migrate to httpOnly cookies post-launch |
| Native package with no web support | High | Medium | Create `.web.js` shim files for each affected package |
| Chat WebSocket drops on tab switch | Medium | High | Add `visibilitychange` listener + auto-reconnect |
| CSS styling differences between RN and web | Low | High | Test each screen; use `Platform.select()` for edge cases |
| Performance on low-end web devices | Low | Low | Lazy-load heavy screens; use `React.memo` aggressively |
| `@react-native-community/slider` web compat | Medium | Medium | Create HTML range input shim |

---

## File-by-File Impact Matrix

### New Files (13)

| File | Purpose |
|------|---------|
| `utils/storage.web.js` | localStorage wrapper |
| `utils/storage.native.js` | SecureStore wrapper |
| `utils/documentPicker.web.js` | HTML file input |
| `utils/documentPicker.native.js` | expo-document-picker wrapper |
| `hooks/usePushNotifications.web.js` | No-op notifications |
| `hooks/useResponsive.js` | Responsive breakpoints |
| `components/WebSidebar.js` | Desktop sidebar nav |
| `components/PageContainer.js` | Max-width container |
| `components/DateTimePicker.web.js` | HTML date input |
| `components/DateTimePicker.native.js` | Native picker wrapper |
| `global.css` | Web-specific styles |
| `nginx.conf` | Web deployment config |
| `scripts/deploy-web.sh` | Build + deploy script |

### Modified Files (15+)

| File | Change |
|------|--------|
| `package.json` | Add web deps |
| `app.json` | Web config + favicon |
| `api/axios.js` | Use storage shim, platform-aware base URL |
| `app/_layout.js` | Import global.css on web |
| `app/(app)/_layout.js` | Add sidebar shell |
| `app/(auth)/_layout.js` | Desktop brand panel |
| `app/(app)/therapist/_layout.js` | Desktop sidebar tabs |
| `components/BottomNav.js` | Hide on desktop |
| `components/BuddyDashboard.js` | Grid layout |
| `components/CounselorDashboard.js` | Grid layout |
| `app/(app)/chat/[id].js` | Two-column layout, Enter-to-send |
| `app/(app)/triage.js` | Enter-to-send |
| `app/(app)/compliance.js` | Use document picker shim |
| `app/(app)/book/[therapist_id].js` | Use DateTimePicker shim |
| `docker-compose.yml` | Replace placeholder nextjs service |

### Unchanged Files (Everything Else)

All Redux slices, API service files, theme constants, and pure business logic remain **100% unchanged**.

---

## Estimated Timeline

| Phase | Duration | What |
|-------|----------|------|
| **Phase 1** — Foundation | 2-3 days | Install deps, compile, fix showstoppers |
| **Phase 2** — Platform Shims | 3-4 days | Create all `.web.js` / `.native.js` files |
| **Phase 3** — Responsive Layout | 5-7 days | Sidebar, PageContainer, desktop layouts |
| **Phase 4** — Feature Parity | 5-7 days | Polish all 26 screens for web |
| **Phase 5** — Deploy & Test | 3-4 days | Docker, nginx, cross-browser testing |
| **Total** | **~18-25 working days** | (~3.5 to 5 weeks) |

> **TIP:** Phases 1-2 can be done in a single sprint. Phase 3 is the heaviest lift. Phase 4 can be parallelized across screens. Phase 5 is lightweight if we test incrementally.

---

## Verification Plan

### Automated
- Run `npx expo export --platform web` to verify the build completes without errors
- Run existing unit tests (if any) to ensure no regressions

### Manual Testing Checklist (Per Screen)
- [ ] Screen loads without errors on Chrome desktop
- [ ] Screen loads without errors on Chrome mobile
- [ ] All interactive elements (buttons, inputs, links) respond to click
- [ ] Forms submit on Enter key
- [ ] Layout adapts correctly at 375px, 768px, and 1440px widths
- [ ] WebSocket connections establish and messages flow in real-time
- [ ] Auth flow (login → dashboard → logout) works end-to-end
- [ ] Token refresh works transparently in background
- [ ] Browser back/forward navigation works correctly
- [ ] No console errors or warnings
