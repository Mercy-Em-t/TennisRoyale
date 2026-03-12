const {
  PLAYER_STATES,
  MATCH_STATES,
  TOURNAMENT_STATES,
  canTransitionPlayer,
  canTransitionMatch,
  canTransitionTournament,
} = require('../src/models/states');

describe('State Machine', () => {
  describe('Player state transitions', () => {
    test('registered → active is valid', () => {
      expect(canTransitionPlayer('registered', 'active')).toBe(true);
    });

    test('registered → eliminated is valid', () => {
      expect(canTransitionPlayer('registered', 'eliminated')).toBe(true);
    });

    test('active → registered is valid (ready for next match)', () => {
      expect(canTransitionPlayer('active', 'registered')).toBe(true);
    });

    test('active → eliminated is valid', () => {
      expect(canTransitionPlayer('active', 'eliminated')).toBe(true);
    });

    test('eliminated → active is invalid', () => {
      expect(canTransitionPlayer('eliminated', 'active')).toBe(false);
    });

    test('eliminated → registered is invalid', () => {
      expect(canTransitionPlayer('eliminated', 'registered')).toBe(false);
    });
  });

  describe('Match state transitions', () => {
    test('scheduled → in_progress is valid', () => {
      expect(canTransitionMatch('scheduled', 'in_progress')).toBe(true);
    });

    test('scheduled → canceled is valid', () => {
      expect(canTransitionMatch('scheduled', 'canceled')).toBe(true);
    });

    test('in_progress → completed is valid', () => {
      expect(canTransitionMatch('in_progress', 'completed')).toBe(true);
    });

    test('in_progress → canceled is valid', () => {
      expect(canTransitionMatch('in_progress', 'canceled')).toBe(true);
    });

    test('completed → scheduled is invalid', () => {
      expect(canTransitionMatch('completed', 'scheduled')).toBe(false);
    });

    test('canceled → scheduled is valid (reschedule)', () => {
      expect(canTransitionMatch('canceled', 'scheduled')).toBe(true);
    });
  });

  describe('Tournament state transitions', () => {
    test('registration_open → in_progress is valid', () => {
      expect(canTransitionTournament('registration_open', 'in_progress')).toBe(true);
    });

    test('in_progress → completed is valid', () => {
      expect(canTransitionTournament('in_progress', 'completed')).toBe(true);
    });

    test('completed → registration_open is invalid', () => {
      expect(canTransitionTournament('completed', 'registration_open')).toBe(false);
    });

    test('registration_open → completed is invalid (must go through in_progress)', () => {
      expect(canTransitionTournament('registration_open', 'completed')).toBe(false);
    });
  });

  describe('State constants', () => {
    test('PLAYER_STATES has correct values', () => {
      expect(PLAYER_STATES).toEqual({
        REGISTERED: 'registered',
        ACTIVE: 'active',
        ELIMINATED: 'eliminated',
      });
    });

    test('MATCH_STATES has correct values', () => {
      expect(MATCH_STATES).toEqual({
        SCHEDULED: 'scheduled',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELED: 'canceled',
      });
    });

    test('TOURNAMENT_STATES has correct values', () => {
      expect(TOURNAMENT_STATES).toEqual({
        REGISTRATION_OPEN: 'registration_open',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
      });
    });
  });
});
