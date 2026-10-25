const sessions = new Map();

export function isSessionActive(guildId) {
  return sessions.has(guildId);
}

export function startSession(guildId, channel) {
  if (sessions.has(guildId)) {
    return false;
  }

  const session = {
    channel,
    startedAt: Date.now(),
    timeout: null,
  };

  sessions.set(guildId, session);
  return true;
}

export function endSession(guildId) {
  const session = sessions.get(guildId);

  if (!session) {
    return false;
  }

  if (session.timeout) {
    clearTimeout(session.timeout);
  }

  sessions.delete(guildId);
  return true;
}
