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
  'Dica: Prestem atenção ao seu redor! quem sabe o que podem achar né?',
  'Lembrete não tão amigável: Posso matar vocês se eu quisesse >.<',
  'Rain check, como estão equipe Ômega?... Que bom!',
  'Não esqueçam de dar uma nota de 0 a 10 após sua experiência. >///<',
  'Dica: Alguns quartos podem ter camas, dormir nelas é confortável!',
  'Dica: Após 15 salas, coisas novas vão acontecer!',
  'Lembre-se!... Do que? não sei, vocês eram para lembrar, não eu. >:P',
  'Não se esqueçam! Bajular a dona do labirinto pode haver resultados favoráveis! (Me elogiem, eu mereço >:3)',
  'Após me ouvirem cantando por tanto tempo, pergunto-lhes: Eu canto bem? Papai diz que sim... mas ele sempre gosta do que eu faço >:3',
  'Papai está fazendo isso por todos, ainda não entendo o motivo de estarmos brigando. :/',
  'Ruarez, Sanchez, Murilo, Victor, Virgulino, Fabrício, Stephany... Só gente da pesada ein? Brutal...',
  'O paranormal não vem de forma fácil para o nosso lado, mas quando ele se manifesta.. é uma DESGRAÇA >:(',
  'Dica: Todas as salas contêem pelo menos 1 loot, se não achou nenhum, pode ser que deixaram algo passar... :P',
  'Gente, Ordo Realitas é um nome tão.. cafona, irônico... precisa de um toque feminino.',
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
