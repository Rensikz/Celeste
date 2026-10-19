
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import musicLyrics from '../../data/musicLyrics.js';

const EMBED_DESCRIPTION_LIMIT = 3900;
const DEFAULT_COLOR = 0xB9A0FF;

function splitLyrics(text, limit = EMBED_DESCRIPTION_LIMIT) {
  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
    // Divide versos individuais que ultrapassem o limite.
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
      if (current) chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);

  return chunks.length ? chunks : ['*Nenhuma letra cadastrada.*'];
}

function createLyricsEmbed(song, chunk, index, total) {
  const embed = new EmbedBuilder()
    .setColor(song.color ?? DEFAULT_COLOR)
    .setAuthor({
      name: 'CELESTE  •  ARQUIVO MUSICAL',
    })
    .setTitle(`♫ ${song.title}${total > 1 ? ` — Parte ${index + 1}` : ''}`)
    .setDescription(chunk)
    .setFooter({
      text: total > 1
        ? `CELESTE • Arquivo musical • ${index + 1}/${total}`
        : 'CELESTE • Arquivo musical',
    });

  // Capa opcional definida no catálogo da música.
  if (song.cover && index === 0) {
    embed.setThumbnail(song.cover);
  }

  // Descrição opcional abaixo do título.
  if (song.artist && index === 0) {
    embed.setDescription(
      `*${song.artist}*\n\n${chunk}`
    );
  }

  return embed;
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

      const chunks = splitLyrics(song.lyrics);
      const embeds = chunks.map((chunk, index) =>
        createLyricsEmbed(song, chunk, index, chunks.length)
      );

      // O Discord aceita até 10 embeds por mensagem.
      // Enviamos em grupos para suportar letras extensas.
      for (let i = 0; i < embeds.length; i += 10) {
        await channel.send({
          embeds: embeds.slice(i, i + 10),
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
