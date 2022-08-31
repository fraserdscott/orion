import { useRef } from "react";
import { useState } from "react";
import { useEffect } from "react";

const ZOOM = 20;
const PRECISION = 10 ** 18;

const POLLING_INTERVAL = 100;

const keyToDirection = { w: 0, d: 1, s: 2, a: 3 };

function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  // Return a object with the x and y coordinates of the intersection
  let x = x1 + ua * (x2 - x1);
  let y = y1 + ua * (y2 - y1);

  return [x, y];
}

const Move = ({ readContracts, writeContracts }) => {
  const [position, setPosition] = useState([0, 0]);
  const [pointer, setPointer] = useState([0, 0]);
  const [objects, setObjects] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // BACKGROUND
    context.fillStyle = "#000000";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    // OBJECTS
    context.fillStyle = "#FFFFFF";
    objects.map(o =>
      context.fillRect(
        (o[0] - 0.5) * ZOOM + context.canvas.width / 2,
        context.canvas.height - (o[1] + 0.5) * ZOOM - context.canvas.height / 2,
        ZOOM,
        ZOOM,
      ),
    );

    // PLAYER
    context.fillStyle = "#FF0000";
    context.fillRect(
      (position[0] - 0.5) * ZOOM + context.canvas.width / 2,
      context.canvas.height - (position[1] + 0.5) * ZOOM - context.canvas.height / 2,
      ZOOM,
      ZOOM,
    );

    // POINTER
    const x = Math.round((pointer[0] - context.canvas.width / 2) / ZOOM);
    const y = Math.round((context.canvas.height - pointer[1] - context.canvas.height / 2) / ZOOM);
    const a = position[0];
    const b = position[1];
    const c = x;
    const d = y;

    const points = objects.flatMap(o => {
      // Top left corner to top right
      const topLeftX = o[0] - 0.5;
      const topLeftY = o[1] - 0.5;
      const topRightX = o[0] + 0.5;
      const topRightY = o[1] - 0.5;
      const bottomRightX = o[0] + 0.5;
      const bottomRightY = o[1] + 0.5;
      const bottomLeftX = o[0] - 0.5;
      const bottomLeftY = o[1] + 0.5;

      return [
        intersect(a, b, c, d, topLeftX, topLeftY, topRightX, topRightY),
        intersect(a, b, c, d, topRightX, topRightY, bottomRightX, bottomRightY),
        intersect(a, b, c, d, bottomRightX, bottomRightY, bottomLeftX, bottomLeftY),
        intersect(a, b, c, d, bottomLeftX, bottomLeftY, topLeftX, topLeftY),
      ].filter(i => i);
    });

    const dist = (a, b) => Math.sqrt(a * a + b * b);

    points.sort(
      (t1, t2) => dist(t1[0] - position[0], t1[1] - position[1]) - dist(t2[0] - position[0], t2[1] - position[1]),
    );
    const closest = points.find(t => t);

    context.strokeStyle = "#00FF00";
    context.beginPath();
    context.moveTo(
      position[0] * ZOOM + context.canvas.width / 2,
      context.canvas.height - position[1] * ZOOM - context.canvas.height / 2,
    );

    if (closest) {
      context.lineTo(
        closest[0] * ZOOM + context.canvas.width / 2,
        context.canvas.height - closest[1] * ZOOM - context.canvas.height / 2,
      );
    } else {
      context.lineTo(pointer[0], pointer[1]);
    }
    context.stroke();
  }, [objects, position, pointer]);

  useEffect(() => {
    if (writeContracts.YourContract) {
      window.addEventListener("keydown", e => {
        const d = keyToDirection[e.key];
        if ([0, 1, 2, 3].includes(d)) {
          writeContracts.YourContract.move(d);
        }
      });
    }
  }, [writeContracts.YourContract]);

  useEffect(() => {
    if (readContracts.YourContract) {
      readContracts.YourContract.provider.pollingInterval = POLLING_INTERVAL;

      readContracts.YourContract.getObjects().then(os =>
        setObjects(os.map(o => [o[1][0] / PRECISION, o[1][1] / PRECISION])),
      );

      const positionFilter = readContracts.YourContract.filters.NewPosition();
      readContracts.YourContract.provider.on(positionFilter, log => {
        const x = parseInt(log.data.slice(100, -64), 16);
        const y = parseInt(log.data.slice(-64), 16);

        setPosition([x / PRECISION, y / PRECISION]);
      });

      const destroyFilter = readContracts.YourContract.filters.Destroy();
      readContracts.YourContract.provider.on(destroyFilter, () => {
        readContracts.YourContract.getObjects().then(os =>
          setObjects(os.map(o => [o[1][0] / PRECISION, o[1][1] / PRECISION])),
        );
      });
    }
  }, [readContracts.YourContract]);

  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();

    const pointerX = evt.clientX - rect.left;
    const pointerY = evt.clientY - rect.top;

    setPointer([pointerX, pointerY]);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onMouseMove={e => getMousePos(canvasRef.current, e)}
        onClick={() => {
          const canvas = canvasRef.current;
          const context = canvas.getContext("2d");

          const x = Math.round(((pointer[0] - context.canvas.width / 2) * PRECISION) / ZOOM);
          const y = Math.round(((context.canvas.height - pointer[1] - context.canvas.height / 2) * PRECISION) / ZOOM);

          writeContracts.YourContract.shoot([x.toString(), y.toString()]);
        }}
      />
    </div>
  );
}

export default Move;
