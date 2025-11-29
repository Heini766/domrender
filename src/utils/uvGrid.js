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
    this.#archive.set(`Map_${this.#archive.size}`, newGrid)
    return newGrid
  }
  
}

get(key) {

  if (this.#archive.size < 1) {
    console.warn('No uv grids werre created yet')
    return
  }

  if (key) return this.#archive.get(key)
  else return this.#archive.get(`Map_${this.#archive.size - 1}`)
  
}
  
}

// Helper class

class Grid {

  #uvs

  constructor(gridSize) {
    this.#uvs = generateUVCords(gridSize)
  }

  process(callBack) {

    this.#uvs.forEach((v, i) => {

      callBack(v, i)
      
    })
    
  }

  edit(config = {}) {

    if (config && config.include) {

      let newArray = [];

      this.#uvs.forEach((v, i) => {

        if (config.include(v, i)) {
          newArray.push(v)
        }
        
      })

      this.#uvs = newArray
      
    }
    
  }

  modify(config) {

    if (!config) return

    const data = {
      distance: 1/Math.sqrt(this.#uvs.length)
    }

    let newArray = []
    let X = true;
    let Y = true;

      if (typeof(config.x) !== 'function') X = undefined;
      if (typeof(config.y) !== 'function') Y = undefined;

    this.#uvs.forEach((uv, i) => {

      let x, y

      if (X) x = config.x(uv[0], data, i);
      if (Y) y = config.y(uv[1], data, i);

      newArray.push([x || uv[0], y || uv[1]])
    })

    this.#uvs = newArray
  }
  
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