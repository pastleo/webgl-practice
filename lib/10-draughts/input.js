import { renderAndGetPointingObjectId } from './pointing-object.js';

import {
  moveCameraAngle, moveViewing, adjCameraDistance,
  pointingObjectId, chooseObjectId,
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

  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('mousedown', event => {
    event.preventDefault();
    if (input.mousedown) return;

    input.mousedown = event.button === 0 ? 'left' : 'else';
    input.mouseCoord = [event.offsetX, event.offsetY];
  });
  canvas.addEventListener('mouseup', () => {
    if (input.mousedown && !input.mousemove) {
      if (input.mousedown === 'left') {
        chooseObjectId(
          game, renderAndGetPointingObjectId(game, input.mouseCoord),
        );
      } else return;
    }

    input.mousedown = false;
    input.mousemove = false;
  });

  canvas.addEventListener('touchstart', event => {
    input.touched = true;
    input.touchCoord = pointerOffset(event.touches[0], canvas);
  });
  canvas.addEventListener('touchend', event => {
    event.preventDefault();

    if (input.touched && !input.touchmove) {
      chooseObjectId(
        game, renderAndGetPointingObjectId(game, input.touchCoord),
      );
    }
    input.touched = false;
    input.touchmove = false;
    delete input.pitchSq;
  });

  canvas.addEventListener('mousemove', event => {
    if (input.mousedown) {
      const { offsetX, offsetY } = event;
      const [preOffsetX, preOffsetY] = input.mouseCoord;

      if (
        input.mousemove ||
        ((offsetX - preOffsetX) * (offsetX - preOffsetX) + (offsetY - preOffsetY) * (offsetY - preOffsetY)) > 48
      ) {
        input.mousemove = true;
        if (input.mousedown === 'left') {
          moveViewing(game, [(preOffsetX - offsetX) / 100, (preOffsetY - offsetY) / 100]);
        } else {
          moveCameraAngle(game, [(preOffsetY - offsetY) / 100, (preOffsetX - offsetX) / 100])
        }

        input.mouseCoord = [offsetX, offsetY];
      }
    } else {
      pointingObjectId(
        game, renderAndGetPointingObjectId(game, [event.offsetX, event.offsetY]),
      );
    }
  })

  canvas.addEventListener('touchmove', event => {
    if (!input.touched) return;

    const [offsetX, offsetY] = multiTouchOffset(event.touches, canvas);
    const [preOffsetX, preOffsetY] = input.touchCoord;
    input.touchCoord = [offsetX, offsetY];

    if (event.touches.length >= 2) {
      input.touchmove = true;

      if (input.touched !== 'multi') {
        input.touched = 'multi';
      } else {
        moveCameraAngle(game, [(preOffsetY - offsetY) / 100, (preOffsetX - offsetX) / 100])

        if (event.touches.length === 2) {
          const offsets = [pointerOffset(event.touches[0], canvas), pointerOffset(event.touches[1], canvas)];
          const pitchSq = (offsets[0][0] - offsets[1][0]) * (offsets[0][0] - offsets[1][0]) +
            (offsets[0][1] - offsets[1][1]) * (offsets[0][1] - offsets[1][1]);

          if (input.pitchSq) {
            const prePicthSq = input.pitchSq;
            adjCameraDistance(game, (prePicthSq - pitchSq) / 2000);
          }
          input.pitchSq = pitchSq;
        }
      }
    } else if (
      input.touchmove ||
      ((offsetX - preOffsetX) * (offsetX - preOffsetX) + (offsetY - preOffsetY) * (offsetY - preOffsetY)) > 48
    ) {
      input.touchmove = true;

      moveViewing(game, [(preOffsetX - offsetX) / 100, (preOffsetY - offsetY) / 100]);
    }
  });

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  canvas.addEventListener('wheel', event => {
    event.preventDefault();

    if (isMac) {
      const absDeltaY = Math.abs(event.deltaY);
      if (!input.touchpadDetected) {
        if (absDeltaY > 0) {
          input.wheelMinDeltaY = Math.min(absDeltaY, input.wheelMinDeltaY || Infinity);
        }
        if (input.wheelMinDeltaY) {
          const mouseWheelSteps = absDeltaY / input.wheelMinDeltaY;
          if (input.wheelMinDeltaY === 1 || mouseWheelSteps % 1 > 0) {
            input.touchpadDetected = true;
          }
        }
      }
    }

    let distanceDelta = 0, angleDelta = [0, 0];

    if (event.ctrlKey) {
      // touchpad pinch-to-zoom, on chrome, firefox, edge
      // https://kenneth.io/post/detecting-multi-touch-trackpad-gestures-in-javascript
      distanceDelta += event.deltaY / 2;
    } else if (input.touchpadDetected) {
      angleDelta[0] += event.deltaY / 200;
      angleDelta[1] += event.deltaX / 200;
    } else {
      distanceDelta += event.deltaY / 50;
      angleDelta[1] += event.deltaX / 100;
    }

    adjCameraDistance(game, distanceDelta);
    moveCameraAngle(game, angleDelta);
  })

  // non-standard gesture events, only supported in Safari
  // https://kenneth.io/post/detecting-multi-touch-trackpad-gestures-in-javascript
  canvas.addEventListener('gesturestart', event => {
    event.preventDefault();
    input.gestureRotation = event.rotation;
    input.gestureScale = event.scale;
  });
  canvas.addEventListener('gesturechange', event => {
    event.preventDefault();

    if (input.touched) return;

    const preRotation = input.gestureRotation;
    const preScale = input.gestureScale;
    input.gestureRotation = event.rotation;
    input.gestureScale = event.scale;

    moveCameraAngle(game,
      [0, (input.gestureRotation - preRotation) * Math.PI / 180],
    );
    adjCameraDistance(game, (preScale - input.gestureScale) * 20);
  });

  return input;
}

function updateViewingVelocity(keyboard, game) {
  if (keyboard.KeyA || keyboard.ArrowLeft) {
    game.viewingVelocity[0] = -0.1;
  } else if (keyboard.KeyD || keyboard.ArrowRight) {
    game.viewingVelocity[0] = 0.1;
  } else {
    game.viewingVelocity[0] = 0;
  }
  if (keyboard.KeyW || keyboard.ArrowUp) {
    game.viewingVelocity[1] = -0.1;
  } else if (keyboard.KeyS || keyboard.ArrowDown) {
    game.viewingVelocity[1] = 0.1;
  } else {
    game.viewingVelocity[1] = 0;
  }
}

function pointerOffset(touchOrEvent, canvas) {
  return [touchOrEvent.pageX - canvas.offsetLeft, touchOrEvent.pageY - canvas.offsetTop];
}

function multiTouchOffset(touches, canvas) {
  return Array(touches.length).fill().map(
    (_, i) => pointerOffset(touches[i], canvas)
  ).reduce(
    ([cx, cy], [x, y]) => ([cx + x, cy + y]),
    [0, 0]
  ).map(d => d / touches.length);
}
