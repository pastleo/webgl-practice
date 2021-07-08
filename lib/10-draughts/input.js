import { degToRad } from '../utils.js';

export default function listenToInputs(canvas, game) {
  const input = {};

  document.addEventListener('keydown', event => {
    input[event.code] = true;
  })
  document.addEventListener('keyup', event => {
    input[event.code] = false;
  })
  document.addEventListener('keyup', event => {
    input[event.code] = false;
  })
  canvas.addEventListener('mousedown', event => {
    if (event.button === 0) {
      input.mousedown = true;
      input.mouseCoord = [event.offsetX, event.offsetY];
    }
  })
  canvas.addEventListener('mouseup', () => {
    input.mousedown = false;
  })
  canvas.addEventListener('touchstart', event => {
    input.touched = true;
    input.touchCoord = [event.touches[0].clientX, event.touches[0].clientY];
  })
  canvas.addEventListener('touchend', () => {
    input.touched = false;
    delete input.multiTouchClient;
    delete input.touchCoord;
  })

  const maxAngle = degToRad(-5);
  const minAngle = degToRad(-60);

  input.moveCameraAngle = (offsetX, offsetY, preOffsetX, preOffsetY) => {
    game.cameraAngle[0] += (preOffsetY - offsetY) / 100;
    if (game.cameraAngle[0] > maxAngle) {
      game.cameraAngle[0] = maxAngle;
    } else if (game.cameraAngle[0] < minAngle) {
      game.cameraAngle[0] = minAngle;
    }
    game.cameraAngle[1] += (preOffsetX - offsetX) / (100 * window.devicePixelRatio);
  };
  input.moveViewing = viewingMove => {
    const dx = viewingMove[0] * Math.cos(-game.cameraAngle[1]) - viewingMove[1] * Math.sin(-game.cameraAngle[1]);
    const dz = viewingMove[0] * Math.sin(-game.cameraAngle[1]) + viewingMove[1] * Math.cos(-game.cameraAngle[1]);
    game.cameraViewing[0] += dx * game.cameraDistance / 10;
    game.cameraViewing[2] += dz * game.cameraDistance / 10;
  };
  input.adjCameraDistance = delta => {
    game.cameraDistance += delta;
    if (game.cameraDistance > 100) game.cameraDistance = 100;
    else if (game.cameraDistance < 4) game.cameraDistance = 4;
  }

  canvas.addEventListener('mousemove', event => {
    if (input.mousedown) {
      const { offsetX, offsetY } = event;
      const [preOffsetX, preOffsetY] = input.mouseCoord;

      input.moveCameraAngle(offsetX, offsetY, preOffsetX, preOffsetY);

      input.mouseCoord = [offsetX, offsetY];
    }

    game.pointing = [event.offsetX, event.offsetY];
  })
  canvas.addEventListener('touchmove', event => {
    if (input.touched) {
      if (input.touched === 2 || event.touches.length >= 2) {
        const clientX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const clientY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
        const pitchSq = (event.touches[0].clientX - event.touches[1].clientX) * (event.touches[0].clientX - event.touches[1].clientX) + (event.touches[0].clientY - event.touches[1].clientY) * (event.touches[0].clientY - event.touches[1].clientY)

        if (input.touched === 2) {
          const [preClientX, preClientY] = input.touchCoord;
          input.moveCameraAngle(clientX, clientY, preClientX, preClientY);

          const prePicthSq = input.pitchSq;
          input.adjCameraDistance((prePicthSq - pitchSq) / 2000);
        }
        input.touched = 2;
        input.touchCoord = [clientX, clientY];
        input.pitchSq = pitchSq;
      } else {
        const { clientX, clientY } = event.touches[0];
        const [preClientX, preClientY] = input.touchCoord;

        input.moveViewing([(preClientX - clientX) / 100, (preClientY - clientY) / 100]);

        input.touchCoord = [clientX, clientY];
      }
    }
  });

  canvas.addEventListener('wheel', event => {
    input.adjCameraDistance(event.deltaY / 50);
    event.preventDefault();
  })

  return input;
}
