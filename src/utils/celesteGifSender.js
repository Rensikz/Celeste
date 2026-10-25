export async function sendCelesteGif(channel, gifUrl) {
  const response = await fetch(gifUrl);

  if (!response.ok) {
    throw new Error(`Falha ao baixar GIF: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.startsWith('image/')) {
    throw new Error(
      `O endereço não retornou uma imagem: ${contentType}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  await channel.send({
    files: [{
      attachment: buffer,
      name: 'celeste-reaction.gif',
    }],
    allowedMentions: { parse: [] },
  });
}
