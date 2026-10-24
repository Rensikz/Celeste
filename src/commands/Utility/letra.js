import { SlashCommandBuilder } from 'discord.js';
import musicLyrics from '../../data/musicLyrics.js';
import { publishSongLyrics } from '../../utils/lyricsPublisher.js';

export default {
  data: new SlashCommandBuilder()
    .setName('letra')
    .setDescription('Publica uma música no canal configurado.')
    .addStringOption(option =>
      option
        .setName('musica')
        .setDescription('Escolha a música que deseja publicar.')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options
      .getFocused()
      .toLowerCase();

    const choices = Object.entries(musicLyrics)
      .filter(([key, song]) =>
        key.toLowerCase().includes(focused) ||
        song.title.toLowerCase().includes(focused)
      )
      .slice(0, 25)
      .map(([key, song]) => ({
        name: song.title.slice(0, 100),
        value: key,
      }));

    await interaction.respond(choices);
  },

  async execute(interaction, guildConfig, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const songKey = interaction.options.getString('musica');
      const song = musicLyrics[songKey];

      if (!song) {
        await interaction.editReply(
          'Não encontrei essa música no catálogo.'
        );
        return;
      }

      const channelId = process.env.LETRA_CHANNEL_ID;

      if (!channelId) {
        await interaction.editReply(
          'O canal de destino não foi configurado.'
        );
        return;
      }

      const channel = await client.channels.fetch(channelId);

      if (!channel?.isTextBased() || !channel.send) {
        await interaction.editReply(
          'O canal configurado não permite enviar mensagens.'
        );
        return;
      }

      await publishSongLyrics(channel, song);

      await interaction.editReply(
        `♫ **${song.title}** foi publicada em ${channel}.`
      );
    } catch (error) {
      console.error('Erro ao publicar música:', error);

      await interaction.editReply(
        'Não consegui publicar a música. Verifique as permissões do bot e os logs.'
      );
    }
  },
};
