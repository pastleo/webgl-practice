import renderAndGetPointingObjectId from './pointing-object.js';

import {
  moveCameraAngle, moveViewing, adjCameraDistance,
  pointingObjectId,
} from './game.js';

export default function listenToInputs(canvas, game) {
  const input = { keyboard: {} };

  document.addEventListener('keydown', event => {
    input.keyboard[event.code] = true;
    updateViewingVelocity(input.keyboard, game);
  });
  document.addEventListener('keyup', event => {
    delete input.keyboard[event.code];
    updateViewingVelocity(input.keyboard, game);
  });

  canvas.addEventListener('mousedown', event => {
    if (event.button === 0) {
      input.mousedown = true;
      input.mouseCoord = [event.offsetX, event.offsetY];
    }
  });
  canvas.addEventListener('mouseup', () => {
    input.mousedown = false;
  });

  canvas.addEventListener('touchstart', event => {
    input.touched = true;
    input.touchCoord = [event.touches[0].clientX, event.touches[0].clientY];
  });
  canvas.addEventListener('touchend', () => {
    input.touched = false;
    delete input.multiTouchClient;
    delete input.touchCoord;
  });

  canvas.addEventListener('mousemove', event => {
    if (input.mousedown) {
      const { offsetX, offsetY } = event;
      const [preOffsetX, preOffsetY] = input.mouseCoord;

      moveCameraAngle(game, offsetX, offsetY, preOffsetX, preOffsetY);

      input.mouseCoord = [offsetX, offsetY];
    }
    
    pointingObjectId(
      game, renderAndGetPointingObjectId(game, [event.offsetX, event.offsetY]),
    );
  })
  canvas.addEventListener('touchmove', event => {
    if (input.touched) {
      if (input.touched === 2 || event.touches.length >= 2) {
        const clientX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const clientY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
        const pitchSq = (event.touches[0].clientX - event.touches[1].clientX) * (event.touches[0].clientX - event.touches[1].clientX) + (event.touches[0].clientY - event.touches[1].clientY) * (event.touches[0].clientY - event.touches[1].clientY)

        if (input.touched === 2) {
          const [preClientX, preClientY] = input.touchCoord;
          moveCameraAngle(game, clientX, clientY, preClientX, preClientY);

          const prePicthSq = input.pitchSq;
          adjCameraDistance(game, (prePicthSq - pitchSq) / 2000);
        }
        input.touched = 2;
        input.touchCoord = [clientX, clientY];
        input.pitchSq = pitchSq;
      } else {
        const { clientX, clientY } = event.touches[0];
        const [preClientX, preClientY] = input.touchCoord;

        moveViewing(game, [(preClientX - clientX) / 100, (preClientY - clientY) / 100]);

        input.touchCoord = [clientX, clientY];
      }
    }
  });

  canvas.addEventListener('wheel', event => {
    adjCameraDistance(game, event.deltaY / 50);
    event.preventDefault();
  })

  return input;
}

function updateViewingVelocity(keyboard, game) {
  if (keyboard.KeyA) {
    game.viewingVelocity[0] = -0.1;
  } else if (keyboard.KeyD) {
    game.viewingVelocity[0] = 0.1;
  } else {
    game.viewingVelocity[0] = 0;
  }
  if (keyboard.KeyW) {
    game.viewingVelocity[1] = -0.1;
  } else if (keyboard.KeyS) {
    game.viewingVelocity[1] = 0.1;
  } else {
    game.viewingVelocity[1] = 0;
  }
}
