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
  f: [1, 1, 1, 1],
};

export const cameraMaxAngle = degToRad(-5);
export const cameraMinAngle = degToRad(-60);

export const nextTurnMap = {
  y: 'b', b: 'g', g: 'y',
}
