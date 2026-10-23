// Which roles may open which screen of the signed-in app.
const SEEKER = 'GENERAL_USER';
const COUNSELOR = 'COUNSELOR';
const THERAPIST = 'THERAPIST';

// Which roles may open which screen (first path segment inside (app)).
// A screen that is not listed is open to any signed-in user.
export const SCREEN_ROLES = {
  therapist: [THERAPIST],
  schedule: [THERAPIST],
  'counselor-chats': [COUNSELOR],
  'counselor-profile': [COUNSELOR],
  compliance: [COUNSELOR],
  mentorship: [COUNSELOR],
  'mentorship-chat': [COUNSELOR, THERAPIST],
  backchannel: [COUNSELOR, THERAPIST],
  triage: [SEEKER],
  mood: [SEEKER],
  breathing: [SEEKER],
};
