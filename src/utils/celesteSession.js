const sessions = new Map();

const MIN_INTERVAL_MS = 10 * 60 * 1_000;
const MAX_INTERVAL_MS = 20 * 60 * 1_000;

const spontaneousMessages = [
  'Ah é, vocês ainda estão aí. Verdade. :P',
  'Não se esqueçam: sorriam! Vocês estão sendo filmados! :D',
  'Dica: cicatrizantes curam e não te envelhecem! Uma das poucas coisas que funcionam como anunciado.',
  'Dica de sobrevivência: se algo parece uma péssima ideia, provavelmente vocês vão fazer mesmo assim.',
  'Continuo monitorando. Não precisam agradecer. Quer dizer... podem agradecer. ♡',
  'Loading tip: tomar decisões melhores aumenta suas chances de continuar respirando. Estatística fascinante!',
  'Status da equipe: ainda viva. Estou tão orgulhosa. Quase.',
  'Lembrete amigável: eu tenho registros de tudo. Absolutamente tudo. :3',
  'Vocês chamam isso de plano? Interessante. Eu chamaria de documentação para um desastre.',
  'Não se preocupem, estou aqui para ajudar! Os resultados dessa ajuda podem variar. :D',
];

function scheduleNextMessage(guildId) {
  const session = sessions.get(guildId);

  if (!session) return;

  const interval =
    MIN_INTERVAL_MS +
    Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);

  session.timeout = setTimeout(async () => {
    // A sessão pode ter sido encerrada enquanto aguardávamos.
    if (sessions.get(guildId) !== session) return;

    try {
      const message = spontaneousMessages[
        Math.floor(Math.random() * spontaneousMessages.length)
      ];

      await session.channel.send({
        content: `💬 **Celeste:** ${message}`,
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.error('[Celeste] Erro ao enviar mensagem espontânea:', error);
    }

    // Agenda a próxima mensagem somente se esta sessão ainda estiver ativa.
    if (sessions.get(guildId) === session) {
      scheduleNextMessage(guildId);
    }
  }, interval);
}

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
  scheduleNextMessage(guildId);

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
