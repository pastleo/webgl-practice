
export function createTextRendering(gl, game) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  drawText(canvas, ctx, game);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  copyCanvasToTexture(gl, canvas);

  return { canvas, ctx, texture };
}

export function updateTextRendering(game) {
  const { canvas, ctx, texture } = game.rendering.text;

  drawText(canvas, ctx, game);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  copyCanvasToTexture(gl, canvas);
}

const teamText = { y: '橘色', b: '藍色', g: '綠色' };
function drawText(canvas, ctx, game) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const center = canvas.width / 2;


  const turnInfoY = 2 * canvas.height / 3;

  //const winners = ['y', 'b', 'g'].slice(0);
  const winners = game.winners;

  if (winners.length < 3) {
    ctx.font = '35px serif';
    ctx.fillText(`現在輪到 ${teamText[game.turn]}`, center, turnInfoY, canvas.width);
  }
  if (game.turnRemainingSecs > 0) {
    ctx.font = '20px serif';
    ctx.fillText(`剩下 ${game.turnRemainingSecs} 秒`, center, (canvas.height + turnInfoY) / 2, canvas.width);
  }

  //const rankBaseY = turnInfoY;
  const rankBaseY = 0;
  const lineHeight = turnInfoY / (winners.length + 1);
  winners.forEach((team, i) => {
    const rank = i + 1;
    ctx.font = `${30 - rank * 5}px serif`;
    const winningEmoji = i === 0 ? (team === 'y' ? '🍓' : '🎉') : '';
    ctx.fillText(
      `第 ${rank} 名：${teamText[team]} ${winningEmoji} (${game.steps[team]} 步)`,
      center, rankBaseY + rank * lineHeight, canvas.width
    );
  });
}

function copyCanvasToTexture(gl, canvas) {
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    canvas, // data
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
}
