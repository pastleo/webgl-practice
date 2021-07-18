import { degToRad } from '../utils.js';

export const pieceTeamDiffuseMap = {
  y: [247/255, 221/255, 65/255, 1],
  g: [57/255, 215/255, 94/255, 1],
  b: [57/255, 132/255, 215/255, 1],
};
export const locationTeamDiffuseMap = {
  y: [213/255, 198/255, 112/255, 1],
  g: [113/255, 217/255, 137/255, 1],
  b: [121/255, 165/255, 215/255, 1],
  n: [1, 1, 1, 1],
};

export const skyTeamBgMap = {
  y: [38/255, 35/255, 18/255],
  g: [13/255, 39/255, 25/255],
  b: [23/255, 12/255, 35/255],
}
export const skyTeamStarColorMap = {
  y: [1, 0.5, 0.1],
  g: [0.3, 1, 0.3],
  b: [0.3, 0.3, 1],
  n: [1, 1, 1],
}

export const cameraMaxAngle = degToRad(-5);
export const cameraMinAngle = degToRad(-85);

export const nextTurnMap = {
  y: 'g', g: 'b', b: 'y',
}

export const demoCameraVelocityDeg = 0.1;

export const teamText = { y: '黃色', b: '藍色', g: '綠色' };
