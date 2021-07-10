import { degToRad } from '../utils.js';

export const pieceTeamDiffuseMap = {
  y: [215/255, 147/255, 57/255, 1],
  g: [57/255, 215/255, 94/255, 1],
  b: [57/255, 132/255, 215/255, 1],
};

export const cameraMaxAngle = degToRad(-5);
export const cameraMinAngle = degToRad(-60);

export const glowColor = [0.1, 0.1, 0.1];
