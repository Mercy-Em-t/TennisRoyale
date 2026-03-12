// Valid state transitions for each entity type

const PLAYER_STATES = {
  REGISTERED: 'registered',
  ACTIVE: 'active',
  ELIMINATED: 'eliminated',
};

const MATCH_STATES = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
};

const TOURNAMENT_STATES = {
  REGISTRATION_OPEN: 'registration_open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

const VALID_PLAYER_TRANSITIONS = {
  [PLAYER_STATES.REGISTERED]: [PLAYER_STATES.ACTIVE, PLAYER_STATES.ELIMINATED],
  [PLAYER_STATES.ACTIVE]: [PLAYER_STATES.REGISTERED, PLAYER_STATES.ELIMINATED],
  [PLAYER_STATES.ELIMINATED]: [],
};

const VALID_MATCH_TRANSITIONS = {
  [MATCH_STATES.SCHEDULED]: [MATCH_STATES.IN_PROGRESS, MATCH_STATES.CANCELED],
  [MATCH_STATES.IN_PROGRESS]: [MATCH_STATES.COMPLETED, MATCH_STATES.CANCELED],
  [MATCH_STATES.COMPLETED]: [],
  [MATCH_STATES.CANCELED]: [MATCH_STATES.SCHEDULED],
};

const VALID_TOURNAMENT_TRANSITIONS = {
  [TOURNAMENT_STATES.REGISTRATION_OPEN]: [TOURNAMENT_STATES.IN_PROGRESS],
  [TOURNAMENT_STATES.IN_PROGRESS]: [TOURNAMENT_STATES.COMPLETED],
  [TOURNAMENT_STATES.COMPLETED]: [],
};

function canTransition(validTransitions, currentState, newState) {
  const allowed = validTransitions[currentState];
  if (!allowed) return false;
  return allowed.includes(newState);
}

function canTransitionPlayer(currentState, newState) {
  return canTransition(VALID_PLAYER_TRANSITIONS, currentState, newState);
}

function canTransitionMatch(currentState, newState) {
  return canTransition(VALID_MATCH_TRANSITIONS, currentState, newState);
}

function canTransitionTournament(currentState, newState) {
  return canTransition(VALID_TOURNAMENT_TRANSITIONS, currentState, newState);
}

module.exports = {
  PLAYER_STATES,
  MATCH_STATES,
  TOURNAMENT_STATES,
  VALID_PLAYER_TRANSITIONS,
  VALID_MATCH_TRANSITIONS,
  VALID_TOURNAMENT_TRANSITIONS,
  canTransitionPlayer,
  canTransitionMatch,
  canTransitionTournament,
};
