export default class Node {

_dom
_type
archive
_nodeTypes = {
  'svg': (tag) => { return this._dom.createElementNS('http://www.w3.org/2000/svg', tag) },
  'html': (tag) => { return this._dom.createElement(tag) }
}

constructor(dom, type) {

  if (typeof(dom) !== 'object' || Array.isArray(dom)) return console.error(dom, `document is required`)
  this._dom = dom;

  if (typeof(type) === 'string' && this._nodeTypes[type]) {

    this._type = type;

  } else {
    console.warn(type, 'not a valid DOM node type')
  }
}

make(tag, config) {

  if (!this.archive) this.archive = new Map();
  const newElement = new Element(tag, config, this.archive, this._nodeTypes[this._type]);
  this.archive.set(newElement._key, newElement);

  if (this._type=== 'svg') {
    const vB = newElement.node.getAttribute('viewBox');
    if (vB) this.vB = vB;
    newElement.viewBox = this.vB;
  }

  return newElement
}

get(target, config) {
  if (!this.archive) return

  if (!target) return undefined

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

  return this.archive.get(target + '_0')
}

serialize() {

  let obj = {}

  for (let item in this) {
    if (item === '_nodeTypes') break
    if (item === 'archive') {

      const arr = Array.from(this[item].entries()).map(([k,v]) => [k, typeof v.serialize === 'function' ? v.serialize() : v]);
      obj[item] = JSON.stringify(arr);
      break
      
    }
    obj[item] = this[item]
  }

  const toString = JSON.stringify(obj)

  return toString
  
}

parse(serData) {

  const data = JSON.parse(serData)
  
  for (let item in data) {
    
    this[item] = data[item]

    if (item === '_dom') this[item] = parse.parseFromString(data[item], 'text/html')
    if (item === 'archive') {
      const parsedArray = JSON.parse(data[item]);
      this[item] = new Map();
      // Reconstruct elements into archive using Element.parse
      parsedArray.forEach(([key, ser]) => {
        try {
          Element.parse(ser, this[item], this._nodeTypes[this._type]);
        } catch (e) {
          // fallback: store raw
          this[item].set(key, ser);
        }
      });
      
      // Second pass: restore innerNodes references for all elements now that archive is complete
      parsedArray.forEach(([key, ser]) => {
        const el = this[item].get(key);
        if (!el || typeof el.serialize !== 'function') return; // Not an Element
        
        try {
          const elData = typeof ser === 'string' ? JSON.parse(ser) : ser;
          if (Array.isArray(elData.innerNodes)) {
            el.innerNodes = [];
            elData.innerNodes.forEach(childKey => {
              const child = this[item].get(childKey);
              if (child) {
                el.innerNodes.push(child);
                try { el.node.appendChild(child.node); } catch (e) {}
                child.parent = el;
              }
            });
          }
        } catch (e) {}
      });
    }
  }

  console.log('Parsed:', this)

  return this
  
}

}

// Helper functions

class Element {

#styles = {};
#archive;

constructor(tag, config = {}, archive, nodeType) {

  if (typeof(tag) !== 'string') {
    console.warn(`Tag must be a string: ${tag}`)
    return
  }

  this.#archive = archive;
  
  this.node = nodeType(tag);

  if (config.id) this._key = config.id + `_0`
  else this._key = tag + 'Element_0'

  let keyCount = 0;
  archive.forEach(item => {
    const scoreIn = item._key.indexOf('_');
    const ogId = item._key.slice(0, scoreIn)
    if (ogId === config.id) {
      keyCount++
    }
  })
  if (keyCount) this._key = config.id + `_${keyCount}`;
  config.id = this._key

  configureElement(this.node, config);

}

add(nodes) {

  if (typeof(nodes) === 'function') nodes = nodes();
  nodes = Array.isArray(nodes) ? nodes : [nodes];
  
  nodes.forEach(item => {
    if (!item) return this
    item.parent = this;
    if (!this.innerNodes) this.innerNodes = [];
    this.innerNodes.push(item)
    this.node.appendChild(item.node);
  });

  return this
  
}

setState(config = {}, callBack) {
  // Input validation
  
  if (!config || typeof config !== 'object') {
    console.warn('Invalid config provided');
    return this;
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

  if (callBack && typeof(callBack) === 'function') {
    callBack(this)
  }

  return this
  
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
  
  if (newParent) {
    this.parent = newParent;
    this.place()
  }
  else {
    console.warn(newParent, 'not a valid object type')
    return
  }

  return this
  
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
  this.node.remove();

  this.#purgeInnerNodes(this, this.#archive)
}

append(name, data) {
  if (!this.appendices) this.appendices = new Map();
  if (!name || typeof(name) !== 'string') {
    console.warn(`Name for appended data is: ${name}`)
    return
  }

  this.appendices.set(name, data)
  
  return this
} // Used to attach data to this object

#purgeInnerNodes(node) {
  if (!node.innerNodes || node.innerNodes.length === 0) return;
  
  node.innerNodes.forEach(item => {
    this.#archive.delete(item._key);
    this.#purgeInnerNodes(item);
  });
} // helper function for purging inner nodes

draggable(config = {}) {

  const data = {
    object: this,
    active: (set) => {
      if (set) this.node.addEventListener('mousedown', onD)
      else if (!this.node) console.warn(this.node, 'is not a DOM node')
      else this.node.removeEventListener('mousedown', onD)
      }
  }

  let int = {}
  const  onD = (e) => {

    window.addEventListener('mousemove', onM)
    window.addEventListener('mouseup', onU)

    const initPos = getRelativePosition(e, this.parent.node);
    let shapePos = this.getState('translate');

    if (!Array.isArray(shapePos)) {
      this.setState({translate: [0, 0]})
      shapePos = this.getState('translate')
    }

    int.offset = [initPos[0] - shapePos[0], initPos[1] - shapePos[1]]
    
    if (!config.onDown || typeof(config.onDown) !== 'function' ) return
    config.onDown(e, data)
  }
  const  onM =  (e) => {

    const curPos = getRelativePosition(e, this.parent.node);
    const finalPos = [curPos[0] - int.offset[0], curPos[1] - int.offset[1]];

    this.setState({
      translate: finalPos
    })
    
    if (!config.onMove || typeof(config.onMove) !== 'function' ) return
    config.onMove(e, data)
  }
  const  onU = (e) => {

    window.removeEventListener('mousemove', onM)
    window.removeEventListener('mouseup', onU)
    
    if (!config.onUp || typeof(config.onUp) !== 'function' ) return
    config.onUp(e, data)
  }

  data.active(config.active)

  return data

} // adds click and drag functionality
  
serialize() {

  const obj = {};

  obj._key = this._key;

  // Serialize node as outerHTML
  try {
    obj.node = this.node.outerHTML;
  } catch (e) {
    obj.node = null;
  }

  // Parent by key
  obj.parent = this.parent ? this.parent._key : null;

  // Inner nodes as list of keys
  obj.innerNodes = this.innerNodes ? this.innerNodes.map(i => i._key) : [];

  // Styles (private field)
  obj.styles = this.#styles ? this.#styles : {};

  // Appendices (Map)
  if (this.appendices) obj.appendices = JSON.stringify(Array.from(this.appendices));

  return JSON.stringify(obj);

}

static parse(serData, archive, nodeType) {

  const data = typeof serData === 'string' ? JSON.parse(serData) : serData;

  // Extract tag from serialized node if possible
  let tag = 'div';
  if (data.node && typeof data.node === 'string') {
    const m = data.node.match(/^<\s*([a-zA-Z0-9:\-]+)/);
    if (m) tag = m[1];
  } else if (data._key) {
    tag = data._key.split('_')[0];
  }

  // Use base id (part before underscore) so constructor creates reasonably
  const baseId = data._key ? data._key.split('_')[0] : undefined;
  const config = baseId ? { id: baseId } : {};

  const el = new Element(tag, config, archive, nodeType);

  // Ensure element is registered in archive under its key
  archive.set(el._key, el);
  // Adjust key in archive if constructor generated a different one
  if (el._key !== data._key) {
    archive.delete(el._key);
    el._key = data._key;
    archive.set(el._key, el);
  }

  // Reconstruct node from outerHTML using DOMParser
  try {
    let mime = 'text/html';
    // detect svg via nodeType probe
    try {
      const probe = nodeType('g');
      if (probe && probe.namespaceURI === 'http://www.w3.org/2000/svg') mime = 'image/svg+xml';
    } catch (e) {}

    const doc = parse.parseFromString(data.node || '<div></div>', mime);
    const parsedNode = mime === 'image/svg+xml' ? doc.documentElement : doc.body.firstElementChild || doc.body;
    if (parsedNode) {
      el.node.replaceWith(parsedNode);
      el.node = parsedNode;
    }
  } catch (e) {
    // leave constructor-created node in place
  }

  // Restore styles
  try {
    el.#styles = data.styles || {};
    // apply style values to DOM node
    if (el.node && el.#styles) {
      for (const [k, v] of Object.entries(el.#styles)) {
        if (k in el.node.style) el.node.style[k] = Array.isArray(v) ? v.join(' ') : v;
      }
    }
  } catch (e) {}

  // Restore appendices
  if (data.appendices) {
    try {
      el.appendices = new Map(JSON.parse(data.appendices));
    } catch (e) {}
  }

  // Restore innerNodes references and attach DOM children where possible
  if (Array.isArray(data.innerNodes) && data.innerNodes.length) {
    el.innerNodes = [];
    data.innerNodes.forEach(key => {
      const child = archive.get(key);
      if (child) {
        el.innerNodes.push(child);
        try { el.node.appendChild(child.node); } catch (e) {}
        child.parent = el;
      }
    });
  }

  // Restore parent reference
  if (data.parent) {
    const p = archive.get(data.parent);
    if (p) el.parent = p;
  }

  return el;

}

} // used by SVG.ren to create new node objects

export { Element }

// Utils

// Use DOMParser when available (browser). In Node.js provide a safe stub
// so server-side code won't throw when importing this module.
const parse = (typeof DOMParser !== 'undefined') ? new DOMParser() : {
  parseFromString: (str, mime) => {
    // Minimal stub that matches the interface used in this file.
    // On the server we cannot create real DOM nodes here, so return
    // an object with `body` and `documentElement` properties.
    return {
      body: {
        firstElementChild: null
      },
      documentElement: null
    };
  }
}

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
  
} // used by SVG and createElement to setup node attributes

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

function getRelativePosition(event, object) {

  const { x, y, width, height } = object.getBoundingClientRect();
  const [vbX, vbY, vbWidth, vbHeight] = extNumbers(object.getAttribute('viewBox'));
  
  return [
    (event.clientX - x) / width * vbWidth + vbX,
    (event.clientY - y) / height * vbHeight + vbY
  ];

}