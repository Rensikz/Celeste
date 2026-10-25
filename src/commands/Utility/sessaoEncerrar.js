import { SlashCommandBuilder } from 'discord.js';
import { endSession, isSessionActive } from '../../utils/celesteSession.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sessao-encerrar')
    .setDescription('Encerra as interações da Celeste nesta sessão.'),

  category: 'Utility',

  async execute(interaction) {
    const ownerId = process.env.CELESTE_OWNER_ID;

    if (!ownerId || interaction.user.id !== ownerId) {
      await interaction.reply({
        content: ownerId
          ? 'Você não tem permissão para encerrar uma sessão.'
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

    if (!isSessionActive(interaction.guildId)) {
      await interaction.reply({
        content: 'Não há nenhuma sessão ativa neste servidor.',
        ephemeral: true,
      });
      return;
    }

    endSession(interaction.guildId);

    await interaction.reply({
      content:
        '📴 **Sessão encerrada.**\n' +
        'A Celeste voltará a ficar quieta. Até a próxima! :P',
      allowedMentions: { parse: [] },
    });
  },
};
