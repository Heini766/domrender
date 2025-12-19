export default utils = {

getDistance: (pos1, pos2) => {
  const dx = pos2[0] - pos1[0]; // Difference in x-coordinates
  const dy = pos2[1] - pos1[1]; // Difference in y-coordinates
  const euclideanD = Math.sqrt(dx * dx + dy * dy);  // Euclidean distance
  return {
    euclideanDistance: euclideanD,
    dxy: [dx, dy]
  };
}, // Returns the distance between two points

getPointAlongPath: (element, offset) => {
  const pathLength = element.getTotalLength();
  const pos = element.getPointAtLength(offset * pathLength)
  return [pos.x, pos.y];
},

getPointAngle: (element, offset) => {

  const p1 = getPointAlongPath(element, offset - .005);
  const p2 = getPointAlongPath(element, offset + .005);

  return calcLineAngle(p1, p2);
  
},// Returns the angle of a point on a curve

getPosOnLine: (pos1, pos2, offset) => {
  const dx = (pos2.x - pos1.x) * offset; // Difference in x-coordinates
  const dy = (pos2.y - pos1.y) * offset; // Difference in y-coordinates
  const offsetX = pos1.x + dx;
  const offsetY = pos1.y + dy;
  return {x: offsetX, y: offsetY};
}, // Returns a position along a line

getRelativePosition: (event, object) => {

  const { x, y, width, height } = object.getBoundingClientRect();
  const [vbX, vbY, vbWidth, vbHeight] = extNumbers(object.getAttribute('viewBox'));
  
  return [
    (event.clientX - x) / width * vbWidth + vbX,
    (event.clientY - y) / height * vbHeight + vbY
  ];

}, // Returns the relative position of the cursor to a SVG node object

getRandomPos: (size, ratio) => {
  return {
    x: (Math.random() * (ratio.x - 2 * size) + size) - ratio.x / 2,
    y: (Math.random() * (ratio.y - 2 * size) + size) - ratio.y / 2
  };
},
/* Return a random x and y cordinate in side the give ratio
size = The dimensions of the element that spawns in
ratio = The ratio of the shape where the object is spawning in
*/

gerRelativeRPos: (r, cords) => {

  if (!cords) {
    cords = {x: 0, y: 0};
  }
  
  const cordX = Math.random()*r - r/2 + cords.x;
  const cordY = Math.random()*r - r/2 + cords.y;
  const rPos = {x: cordX, y: cordY};
  return rPos
  
}, // Finds a random position around a given position

clamp: (number, min, max) => {
    return Math.min(Math.max(number, min), max);
}, // Clamps the result of a calculation.

createCustomProp: (data) => {

  const propNames = Object.keys(data);
  const propValues = Object.values(data);
  let i = 0;

  propNames.forEach((element) => {
    document.documentElement.style.setProperty(`--${element}`, `${propValues[i]}`);
    i += 1;
  })

  return data
  
}, // Can be used to create css custom properties.

getRadPoints: (offset, length, cords) => {

  const angleRad = offset * 2 * Math.PI;
  const angleDeg = angleRad * (180/Math.PI);

  const cordX = length * Math.cos(angleRad);
  const cordY = length * Math.sin(angleRad);

  if (cords) {
    return {x: cordX + cords.x, y: cordY + cords.y, angleRad: angleRad, angleDeg: angleDeg}
  } else {
    return {x: cordX, y: cordY, angleRad: angleRad, angleDeg: angleDeg}
  };
  
}, // Calculates the cords along the edge of a circle

calcLineAngle: (point1, point2) => {
  const deltaX = point2[0] - point1[0];
  const deltaY = point2[1] - point1[1];

  const angleRadians =  Math.atan2(deltaY, deltaX);
  const angleDegrees = angleRadians * (180 / Math.PI);
  const normalisedAngle  = (angleDegrees + 360) % 360;

  return {rad: angleRadians, deg: angleDegrees, degNor: normalisedAngle};
}, // Returns the angle (radians, degrees, normalised degrees) based on two points. 

extNumbers: (string) => {
  if (typeof string !== 'string') return []; // Handle non-string input
  const nums = string.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  return nums.filter(n => !isNaN(n)); // Remove NaN entries (invalid numbers)
}, // Returns an array containing the numbers in a string

getRandomItems: (array, count) => {
    const shuffled = [...array]; // Create a copy
    
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled.slice(0, count);
}, // Takes an array and returns a given number of random values from the array.

isMobileDevice: () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
},

mix: (a, b, t) => {
  // Handle numbers
  if (typeof a === 'number' && typeof b === 'number') {
      return a * (1 - t) + b * t;
  }
  
  // Handle arrays (vectors)
  if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
          throw new Error('Arrays must have the same length');
      }
      return a.map((val, i) => mix(val, b[i], t));
  }
  
  throw new Error('Parameters must be both numbers or both arrays');
},

getRelPos: (e) => {

  const curPos = [e.clientX, e.clientY];
  const nodeData = e.target.getBBox();
  return [curPos[0] - nodeData.x, curPos[1] - nodeData.y]
  
}

}