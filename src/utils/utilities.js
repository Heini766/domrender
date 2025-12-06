export const utils = {

getDistance: (pos1, pos2) => {
  const dx = pos2[0] - pos1[0]; // Difference in x-coordinates
  const dy = pos2[1] - pos1[1]; // Difference in y-coordinates
  const euclideanD = Math.sqrt(dx * dx + dy * dy);  // Euclidean distance
  return {
    euclideanDistance: euclideanD,
    dxy: [dx, dy]
  };
}
  
}