import { EmbedBuilder } from 'discord.js';

const EMBED_DESCRIPTION_LIMIT = 3700;
const DEFAULT_COLOR = 0xB9A0FF;

function splitLyrics(text, limit = EMBED_DESCRIPTION_LIMIT) {
  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
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
    .setTitle(
      `♫ ${song.title}${total > 1 ? ` — Parte ${index + 1}` : ''}`
    )
    .setDescription(
      index === 0 && song.artist
        ? `*${song.artist}*\n\n${chunk}`
        : chunk
    )
    .setFooter({
      text: total > 1
        ? `CELESTE • Arquivo musical • ${index + 1}/${total}`
        : 'CELESTE • Arquivo musical',
    });

  if (song.cover && index === 0) {
    embed.setThumbnail(song.cover);
  }

  return embed;
}

export async function publishSongLyrics(channel, song) {
  const chunks = splitLyrics(song.lyrics);

  const embeds = chunks.map((chunk, index) =>
    createLyricsEmbed(song, chunk, index, chunks.length)
  );

  // O Discord permite até 10 embeds por mensagem.
  for (let i = 0; i < embeds.length; i += 10) {
    await channel.send({
      embeds: embeds.slice(i, i + 10),
      allowedMentions: { parse: [] },
    });
  }
}
