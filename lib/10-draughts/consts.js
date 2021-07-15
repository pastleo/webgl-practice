import { degToRad } from '../utils.js';

export const pieceTeamDiffuseMap = {
  y: [215/255, 147/255, 57/255, 1],
  g: [57/255, 215/255, 94/255, 1],
  b: [57/255, 132/255, 215/255, 1],
};
export const locationTeamDiffuseMap = {
  y: [217/255, 169/255, 106/255, 1],
  g: [113/255, 217/255, 137/255, 1],
  b: [121/255, 165/255, 215/255, 1],
  n: [1, 1, 1, 1],
};

export const skyTeamBgMap = {
  y: [37/255, 26/255, 12/255],
  g: [13/255, 39/255, 25/255],
  b: [23/255, 12/255, 35/255],
  //y: [60/255, 42/255, 20/255],
  //g: [20/255, 60/255, 38/255],
  //b: [39/255, 20/255, 60/255],
}
export const skyTeamStarColorMap = {
  y: [1, 0.5, 0.2],
  g: [0.4, 1, 0.4],
  b: [0.4, 0.4, 1],
  n: [1, 1, 1],
}

export const cameraMaxAngle = degToRad(-5);
export const cameraMinAngle = degToRad(-60);

export const nextTurnMap = {
  y: 'g', g: 'b', b: 'y',
}
