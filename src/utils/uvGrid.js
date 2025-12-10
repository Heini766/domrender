export default class UVGrid {

#archive = new Map()

new(gridSize = [], name) {

    if (gridSize.length <= 1) {
    throw new Error('gridSize must be an array of x and y value');
  }

  if (name && typeof(name) === 'string') {
    const newGrid = new Grid(gridSize)
    this.#archive.set(name, newGrid)
    return newGrid
  } else {
    const newGrid = new Grid(gridSize)
    this.#archive.set(`map_${this.#archive.size}`, newGrid)
    return newGrid
  }
  
}

get(target, config) {

  if (!this.#archive) return

  if (!target) return undefined

  if (typeof(config) === 'number') {
    const find = this.#archive.get(target + `_${config}`);
    if (find) return find
  }

  if (Array.isArray(config)) {
    let objs = [];
    config.forEach(item => {

      if (Number(item) || item === 0) {
        const obj = this.#archive.get(target + `_${item}`);
        if (obj) objs.push(obj)
      }
      
    })
    if (objs.length === 1) return objs[0]
    return objs
  } // When the config passed is an array of numers

  if (typeof(config) === 'object' && !Array.isArray(config)) {

    if (config.range && typeof(config.range) === 'string') {

      return findRanges(config.range, this.#archive, target)
      
    }

    if (Array.isArray(config.range)) {

      let objs = [];

      config.range.forEach(item => {

        objs = [ ...objs , ...findRanges(item, this.#archive, target)]

      })
      return objs
    }
    
  }

  return this.#archive.get(target + '_0')
  
}
  
}

// Helper class

class Grid {

uvs
#data

constructor(gridSize) {
  this.uvs = generateUVCords(gridSize)
  this.#data = {
    distance: 1/Math.sqrt(this.uvs.length)
  }
}

process(callBack) {

  let output = [];
  this.uvs.forEach((v, i) => {

    const value = callBack(v, this.#data, i);

    if (value) output.push(value)
    
  })

  return output
  
} // Loops through each uv and makes a callback

edit(callBack) {

let newArray = [];

this.uvs.forEach((v, i) => {

  if (callBack(v, i)) {
    newArray.push(v)
  }
  
})

this.uvs = newArray
    
return this
  
} // Loops through the current uvs and makes a callback. The boolean value returned from the callback determines if the uv is discarded

modify(config) {

  if (!config) return

  let newArray = []
  let X = true;
  let Y = true;

    if (typeof(config.x) !== 'function') X = undefined;
    if (typeof(config.y) !== 'function') Y = undefined;

  this.uvs.forEach((uv, i) => {

    let x, y

    if (X) x = config.x(uv[0], this.#data, i);
    if (Y) y = config.y(uv[1], this.#data, i);

    newArray.push([x || uv[0], y || uv[1]])
  })

  this.uvs = newArray
} // Take an object of x and y values and makes a callback for each where the return value becomes the new x and y for the current uv
  
}

// Helper functions

function generateUVCords(gridSize) {

  let uvs = []
  
  for (let y = 0; y <= gridSize[1]; y += 1) {
    for (let x = 0; x <= gridSize[0]; x += 1) {
      uvs.push([x / gridSize[0], y / gridSize[1]]);
    }
  }

  return uvs
  
}