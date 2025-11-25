import jsdom from 'jsdom';
const { JSDOM } = jsdom;
const { document } = (new JSDOM(`<!DOCTYPE html><p>Hello world</p>`)).window;

// JSDOM is used for testing purposses

export default class Node {

  #objectType

  constructor(type, tag, config) {

    if (typeof(type) === 'string' && nodeTypes[type]) {

      if (tag) {
        this.node = nodeTypes[type](tag)
        configureElement(this.node, config)
      }

      this.#objectType = nodeTypes[type]
    } else {
      console.warn(type, 'not a valid DOM node type')
    }
  }

  make(tag, config) {

    if (!this.archive) this.archive = new Map();
    const svgEl = new SvgEl(tag, config, this.archive, this.#objectType);
    this.archive.set(svgEl._key, svgEl);

    svgEl.addNodes = this.addNodes.bind(svgEl)

    return svgEl
  }

  addNodes(nodes) {

    if (typeof(nodes) === 'function') nodes = nodes();
    nodes = Array.isArray(nodes) ? nodes : [nodes];
    
    nodes.forEach(item => {
      if (!item || !item.parent) return this
      item.parent = this;
      this.node.appendChild(item.node);
    });

    return this
    
  }

  get(target, config) {
    if (!this.archive) return

    if (!target) return undefined
    
    const evalKey = processKey(target);

    if (typeof(config) === 'number') {
      const find = this.archive.get(target + `_${config}`);
      if (find) return find
    }

    if (Array.isArray(config)) {
      let objs = [];
      config.forEach(item => {

        if (Number(item) || item === 0) {
          const obj = this.archive.get(target + `_${item}`);
          if (obj) objs.push(obj)
        }
        
      })
      if (objs.length === 1) return objs[0]
      return objs
    } // When the config passed is an array of numers

    if (typeof(config) === 'object' && !Array.isArray(config)) {

      if (config.range && typeof(config.range) === 'string') {

        return findRanges(config.range, this.archive, target)
        
      }

      if (Array.isArray(config.range)) {

        let objs = [];

        config.range.forEach(item => {

          objs = [ ...objs , ...findRanges(item, this.archive, target)]

        })
        return objs
      }
      
    }

    if (!evalKey.hadUnderscore) return this.archive.get(target + `_0`)
    return this.archive.get(evalKey.cleaned)
  }

}

const nodeTypes = {
  'svg': (tag) => { return document.createElementNS('http://www.w3.org/2000/svg', tag) },
  'html': (tag) => { return document.createElement(tag) }
}

// Helper functions

class SvgEl {

  #styles = {};
  #archive;

  constructor(tag, config, archive, nodeType) {
    if (!config || typeof(config) !== 'object' || Array.isArray(config)) config = {};

    if (typeof(tag) !== 'string') {
      console.warn(`Tag must be a string: ${tag}`)
      return
    }

    this.#archive = archive;
    
    this.node = nodeType(tag);

    let id = config && config.id ? config.id : tag + 'Element';

    let keyCount = 0;
    archive.forEach(item => {
      const [extKey, extNum] = [processKey(item._key).cleaned, processKey(id).cleaned]
      if (extKey === extNum) keyCount++;
      if (keyCount) id = extKey + `_${keyCount}`
    })
    if (!keyCount)  this._key = id + `_${keyCount}`
    else this._key = id;

    config.id = id;

    configureElement(this.node, config);

  }

  setState(config = {}) {
    // Input validation
    
    if (!config || typeof config !== 'object') {
      console.warn('Invalid config provided');
      return;
    }

    const currentData = this.#styles ? this.#styles : {};
    
    // Merge config with existing data (config takes precedence)
    const mergedData = { ...currentData, ...config };
    this.#styles = mergedData;

    const changedProps = new Set();

    // Find what actually changed
    for (const key in mergedData) {
      if (currentData[key] !== mergedData[key]) {
        changedProps.add(key);
      }
    }

    // Apply changes to DOM
    changedProps.forEach(attr => {
      let value = mergedData[attr];
      
      // Transform values for CSS
      if (Array.isArray(value) && value.length === 2 && attr === 'translate') {
        value = `${value[0]}px ${value[1]}px`;
      } else if (Array.isArray(value) && value.length === 2 && attr === 'scale') {
        value = `${value[0]} ${value[1]}`;
      } else if (attr === 'rotate') {
        value = `${value}deg`;
      }
      
      // Apply to style (with validation)
      if (attr in this.node.style) {
        this.node.style[attr] = value;
      } else {
        console.warn(`Invalid style property: ${attr}`);
      }
    });

    return {
      object: this,
      then: (callBack) => { if (callBack && typeof(callBack) === 'function') callBack(this) }
    }
    
  }

  getState(styles) {

    if (typeof(styles) === 'string' && this.#styles[styles]) return this.#styles[styles]

    if (Array.isArray(styles)) {
      const props = {};
      
      styles.forEach(item => {

        if (typeof(item) !== 'string' || !this.#styles[item]) return
        props[item] = this.#styles[item];

      })

      if (Object.keys(props).length === 1) return props[styles[0]]
      return props
    }
    
    return this.#styles
    
  }

  move(newParent) {
    
    if (newParent) this.parent = newParent;
    else {
      console.warn(newParent, 'not a valid object type')
      return
    }
    
  }

  cut() {
    this.node.remove();
  }

  place() {
    if (!this.parent) document.body.appendChild(this.node)
    else
    this.parent.node.appendChild(this.node)
  }

  purge() {
    this.#archive.delete(this._key);

    let targets = [];
    this.node.childNodes.forEach(item => {
      
      if (typeof(item.data) === 'string') return
      const evalKey = processKey(item.id);
      if (!evalKey.hadUnderscore) targets.push(item.id + `_0`)
      else targets.push(item.id)
      
    })

    targets.forEach(item => {
      this.#archive.delete(item)
    })

    this.node.remove()
  }
  
} // used by SVG.ren to create new node objects

function configureElement(node, config) {

  if (!config || typeof(config) !== 'object' || Array.isArray(config)) return;

  for (const [key, value] of Object.entries(config)) {
    if (key === 'nodes' && Array.isArray(value)) {
      value.forEach(nodeToAppend => nodeToAppend && node.appendChild(nodeToAppend.node));
    } else if (key === 'content') {
      node.innerHTML = value;
    } else {
      node.setAttribute(key, value);
    }
  }
  
} // used by SVG and createSvgEl to setup node attributes

// Utils

function processKey(str) {
  const underscoreIndex = str.indexOf('_');
  
  if (underscoreIndex === -1) {
    return {
      original: str,
      cleaned: str,
      removedNumbers: '',
      hadUnderscore: false
    };
  }
  
  const beforeUnderscore = str.substring(0, underscoreIndex); // Don't include the underscore
  const afterUnderscore = str.substring(underscoreIndex + 1);
  
  // Extract numbers from the part after underscore
  const numberMatch = afterUnderscore.match(/^\d+/);
  const removedNumbers = numberMatch ? numberMatch[0] : '';
  
  // Remove numbers from the beginning of the part after underscore
  const cleanedAfter = afterUnderscore.replace(/^\d+/, '');
  
  return {
    original: str,
    cleaned: beforeUnderscore + cleanedAfter, // No underscore included
    removedNumbers: removedNumbers,
    hadUnderscore: true,
    numbersRemoved: removedNumbers.length > 0
  };
}

function extNumbers(string) {
  if (typeof string !== 'string') return []; // Handle non-string input
  const nums = string.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  return nums.filter(n => !isNaN(n)); // Remove NaN entries (invalid numbers)
}

function findRanges(str, archive, target) {

  let objs = []
  
  const ext = extNumbers(str);
  if (ext.length < 2 || ext.length > 2) return

  const dif = ext[1] - ext[0];
  for (let i = 0; Math.abs(dif) >= i; i++) {
    const keyNum = ext[0] + i/Math.abs(dif) * dif;
    const obj = archive.get(target + `_${keyNum}`);
    if (obj) objs.push(obj)
  }

  return objs
  
}