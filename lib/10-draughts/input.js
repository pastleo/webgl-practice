import renderAndGetPointingObjectId from './pointing-object.js';

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
    input.mousedown = false;

    if (!input.mousemove) {
      chooseObjectId(
        game, renderAndGetPointingObjectId(game, input.mouseCoord),
      );
    }
    input.mousemove = false;
  });

  canvas.addEventListener('touchstart', event => {
    input.touched = true;
    input.touchCoord = touchOffset(event.touches[0], canvas);
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
          moveCameraAngle(game, offsetX, offsetY, preOffsetX, preOffsetY);
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
        moveCameraAngle(game, offsetX, offsetY, preOffsetX, preOffsetY);

        if (event.touches.length === 2) {
          const offsets = [touchOffset(event.touches[0], canvas), touchOffset(event.touches[1], canvas)];
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

  canvas.addEventListener('wheel', event => {
    adjCameraDistance(game, event.deltaY / 50);
    event.preventDefault();
  })

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

function touchOffset(touch, canvas) {
  return [touch.pageX - canvas.offsetLeft, touch.pageY - canvas.offsetTop];
}

function multiTouchOffset(touches, canvas) {
  return Array(touches.length).fill().map(
    (_, i) => touchOffset(touches[i], canvas)
  ).reduce(
    ([cx, cy], [x, y]) => ([cx + x, cy + y]),
    [0, 0]
  ).map(d => d / touches.length);
}
