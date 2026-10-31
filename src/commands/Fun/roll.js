
import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import celesteReactions from '../../data/celesteReactions.js';
import celestePlayerReactions from '../../data/celestePlayerReactions.js';
import celesteGifs from '../../data/celesteGifs.js';
import { isSessionActive } from '../../utils/celesteSession.js';
import { sendCelesteGif } from '../../utils/celesteGifSender.js';

const NORMAL_COMMENT_CHANCE = 0.15;
const NORMAL_COMMENT_COOLDOWN = 60_000;
const AFFECTION_CHANCE = 0.03;
const GIF_CHANCE = 0.40;
const PERSONAL_REACTION_CHANCE = 0.50;

// Cooldown em memória, separado por jogador.
const lastNormalComment = new Map();

function pickRandom(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return null;
  }

  return array[Math.floor(Math.random() * array.length)];
}

// Escolhe entre a lista geral e a personalizada.
function getReaction(category, userId) {
  const generalReactions = (
    celesteReactions[category] || []
  ).filter(Boolean);

  const personalReactions = (
    celestePlayerReactions[userId]?.[category] || []
  ).filter(Boolean);

  // Sem reações personalizadas: utiliza a lista geral.
  if (personalReactions.length === 0) {
    return pickRandom(generalReactions);
  }

  // Sem reações gerais: utiliza a lista personalizada.
  if (generalReactions.length === 0) {
    return pickRandom(personalReactions);
  }

  // Ambas existem: 50% geral / 50% personalizada.
  if (Math.random() < PERSONAL_REACTION_CHANCE) {
    return pickRandom(personalReactions);
  }

  return pickRandom(generalReactions);
}

function getCelesteComment({ numSides, rolls, userId }) {
  // Reações especiais para dados de 20 faces.
  if (numSides === 20) {
    // A falha tem prioridade se houver 1 e 20 na mesma rolagem.
    if (rolls.includes(1)) {
      return {
        text: getReaction('criticalFailure', userId),
        category: 'criticalFailure',
      };
    }

    if (rolls.includes(20)) {
      return {
        text: getReaction('criticalSuccess', userId),
        category: 'criticalSuccess',
      };
    }
  }

  // Cooldown individual para comentários comuns e afetuosos.
  const now = Date.now();
  const lastComment = lastNormalComment.get(userId) ?? 0;

  if (now - lastComment < NORMAL_COMMENT_COOLDOWN) {
    return null;
  }

  if (Math.random() < AFFECTION_CHANCE) {
    const text = getReaction('affection', userId);

    if (text) {
      lastNormalComment.set(userId, now);

      return {
        text,
        category: 'affection',
      };
    }
  }

  if (Math.random() < NORMAL_COMMENT_CHANCE) {
    const text = getReaction('normal', userId);

    if (text) {
      lastNormalComment.set(userId, now);

      return {
        text,
        category: 'normal',
      };
    }
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

    const celesteResponse = getCelesteComment({
      numSides,
      rolls,
      userId: interaction.user.id,
    });

    if (celesteResponse?.text) {
      description += `\n\n💬 **Celeste:** ${celesteResponse.text}`;
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
      const category = celesteResponse?.category;
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
