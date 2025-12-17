export function getDistance(pos1, pos2) {
  const dx = pos2[0] - pos1[0]; // Difference in x-coordinates
  const dy = pos2[1] - pos1[1]; // Difference in y-coordinates
  const euclideanD = Math.sqrt(dx * dx + dy * dy);  // Euclidean distance
  return {
    euclideanDistance: euclideanD,
    dxy: [dx, dy]
  };
}

export function mix(a, b, t) {
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
}

export function getRelPos(e) {

  const curPos = [e.clientX, e.clientY];
  const nodeData = e.target.getBBox();
  return [curPos[0] - nodeData.x, curPos[1] - nodeData.y]
  
}
