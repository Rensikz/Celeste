
import { SlashCommandBuilder } from 'discord.js';
import musicLyrics from '../../data/musicLyrics.js';
import { publishSongLyrics } from '../../utils/lyricsPublisher.js';

const GAP_MS = 2_000;
let playlistRunning = false;

const PLAYLIST = [
  { key: 'Salvation_exe', duration: '2:00' },
  { key: 'L1K3_Y0U', duration: '3:26' },
  { key: 'CATALOGUE_Var_Antipathy', duration: '4:30' },
  { key: 'R0T', duration: '4:20' },
  { key: 'Cancel', duration: '5:52' },
  { key: 'Silence', duration: '4:18' },
  { key: 'You_make_me_sick', duration: '3:48' },
];

function parseDuration(duration) {
  const [minutes, seconds] = duration.split(':').map(Number);
  return (minutes * 60 + seconds) * 1_000;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPlaylist(channel) {
  try {
    // A primeira faixa já foi publicada pelo comando.
    for (let i = 1; i < PLAYLIST.length; i++) {
      const previousSong = PLAYLIST[i - 1];
      const waitTime = parseDuration(previousSong.duration) + GAP_MS;

      await delay(waitTime);

      const currentSong = musicLyrics[PLAYLIST[i].key];

      await publishSongLyrics(channel, currentSong);

      console.log(
        `[Celeste Playlist] Publicada: ${currentSong.title}`
      );
    }

    // Aguarda a duração da última música antes de encerrar.
    await delay(parseDuration(PLAYLIST.at(-1).duration));

    console.log('[Celeste Playlist] Playlist concluída.');
  } catch (error) {
    console.error('[Celeste Playlist] Erro durante a playlist:', error);
  } finally {
    playlistRunning = false;
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('celesteplaylist')
    .setDescription('Inicia a playlist musical da Celeste.'),

  async execute(interaction, guildConfig, client) {
    const ownerId = process.env.CELESTE_OWNER_ID;

    // Falha de forma segura caso o proprietário não esteja configurado.
    if (!ownerId || interaction.user.id !== ownerId) {
      await interaction.reply({
        content: ownerId
          ? 'Você não tem permissão para iniciar a playlist.'
          : 'O proprietário ainda não foi configurado. Defina CELESTE_OWNER_ID no arquivo .env.',
        ephemeral: true,
      });
      return;
    }

    if (playlistRunning) {
      await interaction.reply({
        content: 'A playlist da Celeste já está em execução.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const channelId = process.env.LETRA_CHANNEL_ID;

      if (!channelId) {
        await interaction.editReply(
          'O canal de destino não foi configurado. Verifique LETRA_CHANNEL_ID no .env.'
        );
        return;
      }

      // Confere o catálogo antes de iniciar.
      for (const track of PLAYLIST) {
        if (!musicLyrics[track.key]) {
          throw new Error(
            `A música "${track.key}" não existe em musicLyrics.js.`
          );
        }
      }

      const channel = await client.channels.fetch(channelId);

      if (!channel?.isTextBased() || !channel.send) {
        await interaction.editReply(
          'O canal configurado não permite enviar mensagens.'
        );
        return;
      }

      // Inicia somente depois de validar o canal e o catálogo.
      playlistRunning = true;

      try {
        const firstSong = musicLyrics[PLAYLIST[0].key];

        await publishSongLyrics(channel, firstSong);

        await interaction.editReply(
          `♫ Playlist da Celeste iniciada!\n` +
          `Primeira faixa: **${firstSong.title}**\n` +
          `Próxima faixa em aproximadamente ${PLAYLIST[0].duration} + 2 segundos.`
        );
      } catch (error) {
        playlistRunning = false;
        throw error;
      }

      // A tarefa continua em segundo plano; o comando não fica
      // aguardando a playlist inteira para terminar.
      void runPlaylist(channel);
    } catch (error) {
      console.error('[Celeste Playlist] Erro ao iniciar:', error);

      await interaction.editReply(
        'Não consegui iniciar a playlist. Verifique as permissões do bot e os logs.'
      );
    }
  },
};
