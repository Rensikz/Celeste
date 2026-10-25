
import { SlashCommandBuilder } from 'discord.js';
import { startSession, isSessionActive } from '../../utils/celesteSession.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sessao-iniciar')
    .setDescription('Inicia as interações da Celeste nesta sessão.'),

  category: 'Utility',

  async execute(interaction) {
    const ownerId = process.env.CELESTE_OWNER_ID;

    if (!ownerId || interaction.user.id !== ownerId) {
      await interaction.reply({
        content: ownerId
          ? 'Você não tem permissão para iniciar uma sessão.'
          : 'Configure CELESTE_OWNER_ID no arquivo .env primeiro.',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Este comando só pode ser usado dentro de um servidor.',
        ephemeral: true,
      });
      return;
    }

    if (isSessionActive(interaction.guildId)) {
      await interaction.reply({
        content: 'A Celeste já está ativa nesta sessão. 👁️',
        ephemeral: true,
      });
      return;
    }

    const started = startSession(
      interaction.guildId,
      interaction.channel
    );

    if (!started) {
      await interaction.reply({
        content: 'Não consegui iniciar a sessão. Tente novamente.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content:
        '📺 **Sessão iniciada.**\n' +
        'A Celeste agora está observando e poderá comentar periodicamente. :D',
      allowedMentions: { parse: [] },
    });
  },
};
