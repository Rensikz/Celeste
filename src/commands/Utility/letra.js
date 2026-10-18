
import { SlashCommandBuilder } from 'discord.js';
import musicLyrics from '../../data/musicLyrics.js';

const MESSAGE_LIMIT = 1900;

function splitMessage(text, limit = MESSAGE_LIMIT) {
  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
    // Divide linhas individuais que excedam o limite.
    if (line.length > limit) {
      if (current) {
        chunks.push(current);
        current = '';
      }

      for (let i = 0; i < line.length; i += limit) {
        chunks.push(line.slice(i, i + limit));
      }

      continue;
    }

    const candidate = current
      ? `${current}\n${line}`
      : line;

    if (candidate.length > limit) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

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

      const chunks = splitMessage(
        `♫ ${song.title}\n\n${song.lyrics}`
      );

      for (const chunk of chunks) {
        await channel.send({
          content: chunk,
          allowedMentions: { parse: [] },
        });
      }

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

