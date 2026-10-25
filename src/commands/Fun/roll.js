
import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import celesteReactions from '../../data/celesteReactions.js';
import celesteGifs from '../../data/celesteGifs.js';
import { isSessionActive } from '../../utils/celesteSession.js';
import { sendCelesteGif } from '../../utils/celesteGifSender.js';

const NORMAL_COMMENT_CHANCE = 0.15;
const NORMAL_COMMENT_COOLDOWN = 60_000;
const AFFECTION_CHANCE = 0.03;
const GIF_CHANCE = 0.40;

// Cooldown em memória, separado por jogador.
const lastNormalComment = new Map();

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getGifCategory({ numSides, rolls, celesteComment }) {
  if (!celesteComment) return null;

  if (numSides === 20 && rolls.includes(1)) {
    return 'criticalFailure';
  }

  if (numSides === 20 && rolls.includes(20)) {
    return 'criticalSuccess';
  }

  if (celesteReactions.affection.includes(celesteComment)) {
    return 'affection';
  }

  return 'normal';
}

function getCelesteComment({ numSides, rolls, userId }) {
  // Reações especiais para dados de 20 faces.
  if (numSides === 20) {
    // A falha tem prioridade se houver 1 e 20 na mesma rolagem.
    if (rolls.includes(1)) {
      return pickRandom(celesteReactions.criticalFailure);
    }

    if (rolls.includes(20)) {
      return pickRandom(celesteReactions.criticalSuccess);
    }
  }

  // Cooldown individual para comentários comuns e afetuosos.
  const now = Date.now();
  const lastComment = lastNormalComment.get(userId) ?? 0;

  if (now - lastComment < NORMAL_COMMENT_COOLDOWN) {
    return null;
  }

  if (Math.random() < AFFECTION_CHANCE) {
    lastNormalComment.set(userId, now);
    return pickRandom(celesteReactions.affection);
  }

  if (Math.random() < NORMAL_COMMENT_CHANCE) {
    lastNormalComment.set(userId, now);
    return pickRandom(celesteReactions.normal);
  }

  return null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription(
      'Rolls dice using standard notation (e.g., 2d20, 1d6 + 4).'
    )
    .addStringOption(option =>
      option
        .setName('notation')
        .setDescription('The dice notation (e.g., 2d6, 1d20 + 4)')
        .setRequired(true)
        .setMaxLength(50)
    ),

  category: 'Fun',

  async execute(interaction, config, client) {
    await InteractionHelper.safeDefer(interaction);

    const notation = interaction.options
      .getString('notation')
      .toLowerCase()
      .replace(/\s/g, '');

    const match = notation.match(/^(\d*)d(\d+)([\+\-]\d+)?$/);

    if (!match) {
      throw new TitanBotError(
        `Invalid dice notation: ${notation}`,
        ErrorTypes.USER_INPUT,
        'Invalid notation. Use format like `1d20` or `3d6+5`.'
      );
    }

    const numDice = parseInt(match[1] || '1', 10);
    const numSides = parseInt(match[2], 10);
    const modifier = parseInt(match[3] || '0', 10);

    if (numDice < 1 || numDice > 20) {
      throw new TitanBotError(
        `Too many dice requested: ${numDice}`,
        ErrorTypes.VALIDATION,
        'Please keep the number of dice between 1 and 20.'
      );
    }

    if (numSides < 1 || numSides > 1000) {
      throw new TitanBotError(
        `Invalid number of sides: ${numSides}`,
        ErrorTypes.VALIDATION,
        'Please keep the number of sides between 1 and 1000.'
      );
    }

    const rolls = [];
    let totalRoll = 0;

    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * numSides) + 1;
      rolls.push(roll);
      totalRoll += roll;
    }

    const finalTotal = totalRoll + modifier;

    const resultsDetail =
      numDice > 1 ? `**Rolls:** ${rolls.join(' + ')}\n` : '';

    const modifierText = modifier !== 0
      ? `+ (${modifier})`
      : '';

    let description =
      `${resultsDetail}**Total Roll:** ${totalRoll}${modifierText} = **${finalTotal}**`;

    const celesteComment = getCelesteComment({
      numSides,
      rolls,
      userId: interaction.user.id,
    });

    if (celesteComment) {
      description += `\n\n💬 **Celeste:** ${celesteComment}`;
    }

    const embed = successEmbed(
      `🎲 Rolling ${numDice}d${numSides}${modifier !== 0 ? match[3] : ''}`,
      description
    );

    await InteractionHelper.safeEditReply(interaction, {
      embeds: [embed],
    });

    // GIFs só são enviados durante uma sessão ativa.
    if (
      interaction.guildId &&
      isSessionActive(interaction.guildId) &&
      Math.random() < GIF_CHANCE
    ) {
      const category = getGifCategory({
        numSides,
        rolls,
        celesteComment,
      });

      const gifs = category ? celesteGifs[category] : [];

      if (gifs?.length) {
        try {
          await sendCelesteGif(
            interaction.channel,
            pickRandom(gifs)
          );
        } catch (error) {
          logger.debug(
            `Falha ao enviar GIF da Celeste: ${error.message}`
          );
        }
      }
    }

    logger.debug(
      `Roll command executed by user ${interaction.user.id} with notation ${notation} in guild ${interaction.guildId}`
    );
  },
};
