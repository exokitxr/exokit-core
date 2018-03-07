const events = require('events');
const {EventEmitter} = events;
const path = require('path');
const url = require('url');
const {URL} = url;
const {performance} = require('perf_hooks');

const parseIntStrict = require('parse-int');
const parse5 = require('parse5');

const fetch = require('window-fetch');
const {XMLHttpRequest} = require('xmlhttprequest');
const {Response, Blob} = fetch;
const WebSocket = require('ws/lib/websocket');
const {LocalStorage} = require('node-localstorage');
const windowEval = require('window-eval-native');
const THREE = require('./lib/three-min.js');

const windowSymbol = Symbol();
const htmlTagsSymbol = Symbol();
const htmlElementsSymbol = Symbol();
const optionsSymbol = Symbol();
let nativeBindings = false;

let id = 0;
const urls = new Map();
URL.createObjectURL = blob => {
  const url = 'blob:' + id++;
  urls.set(url, blob);
  return url;
};
URL.revokeObjectURL = blob => {
  urls.delete(url);
};

class MessageEvent {
  constructor(data) {
    this.data = data;
  }
}
class MutationRecord {
  constructor(type, target, addedNodes, removedNodes, previousSibling, nextSibling, attributeName, attributeNamespace, oldValue) {
    this.type = type;
    this.target = target;
    this.addedNodes = addedNodes;
    this.removedNodes = removedNodes;
    this.previousSibling = previousSibling;
    this.nextSibling = nextSibling;
    this.attributeName = attributeName;
    this.attributeNamespace = attributeNamespace;
    this.oldValue = oldValue;
  }
}
class MutationObserver {
  constructor(callback) {
    this.callback = callback;

    this.element = null;
    this.options = null;
    this.queue = [];
    this.bindings = new WeakMap();
  }

  observe(element, options) {
    this.element = element;
    this.options = options;

    this.bind(element);
  }

  disconnect() {
    this.unbind(this.element);

    this.element = null;
    this.options = null;
  }

  takeRecords() {
    const oldQueue = this.queue.slice();
    this.queue.length = 0;
    return oldQueue;
  }

  bind(element) {
    element.traverse(el => {
      const _attribute = (name, value) => this.handleAttribute(el, name, value);
      el.on('attribute', _attribute);
      const _children = (addedNodes, removedNodes, previousSibling, nextSibling) => this.handleChildren(el, addedNodes, removedNodes, previousSibling, nextSibling);
      el.on('children', _children);

      this.bindings.set(el, [
        _attribute,
        _children,
      ]);
    });
  }

  unbind(element) {
    element.traverse(el => {
      const bindings = this.bindings.get(el);
      for (let i = 0; i < bindings.length; i++) {
        el.removeListener(bindings[i]);
      }
      this.bindings.remove(el);
    });
  }

  flush() {
    if (this.queue.length > 0) {
      const oldQueue = this.queue.slice();
      this.queue.length = 0;
      this.callback(oldQueue, this);
    }
  }

  handleAttribute(el, name, value, oldValue) {
    this.queue.push(new MutationRecord('attributes', el, null, null, null, null, name, null, oldValue));

    setImmediate(() => {
      this.flush();
    });
  }

  handleChildren(el, addedNodes, removedNodes, previousSibling, nextSibling) {
    this.queue.push(new MutationRecord('childList', el, addedNodes, removedNodes, previousSibling, nextSibling, null, null, null));

    for (let i = 0; i < addedNodes.length; i++) {
      this.bind(addedNodes[i]);
    }
    for (let i = 0; i < removedNodes.length; i++) {
      this.unbind(removedNodes[i]);
    }

    setImmediate(() => {
      this.flush();
    });
  }
}
class ImageData {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(0);
  }
}
class ImageBitmap {
  constructor() {
    if (arguments.length === 1) {
      const [image] = arguments;
      this.width = image.width;
      this.height = image.height;
      this.data = image.data;
    } else if (arguments.length === 3) {
      const [width, height, data] = arguments;
      this.width = width;
      this.height = height;
      this.data = data;
    } else {
      throw new Error('invalid arguments');
    }
  }
}
ImageBitmap.createImageBitmap = function() {
  return Reflect.construct(ImageBitmap, arguments);
};
class nativeWorker {
  terminate() {}
}
class Path2D {
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
}
class CanvasRenderingContext2D {
  drawImage() {}
  fillRect() {}
  clearRect() {}
  fillText() {}
  stroke() {}
  scale() {}
  measureText() {
    return {width: 0};
  }
  createImageData(w, h) {
    return new ImageData(w, h);
  }
  getImageData(sx, sy, sw, sh) {
    return new ImageData(sw, sh);
  }
  putImageData() {}
}
const VERSION = Symbol();
class WebGLContext {
  get VERSION() {
    return VERSION;
  }
  getExtension() {
    return null;
  }
  getParameter(param) {
    if (param === VERSION) {
      return 'WebGL 1';
    } else {
      return null;
    }
  }
  createTexture() {}
  bindTexture() {}
  texParameteri() {}
  texImage2D() {}
  createProgram() {}
  createShader() {}
  shaderSource() {}
  compileShader() {}
  getShaderParameter() {}
  getShaderInfoLog() {
    return '';
  }
  attachShader() {}
  linkProgram() {}
  getProgramInfoLog() {
    return '';
  }
  getProgramParameter() {}
  deleteShader() {}
  clearColor() {}
  clearDepth() {}
  clearStencil() {}
  enable() {}
  disable() {}
  depthFunc() {}
  frontFace() {}
  cullFace() {}
  blendEquationSeparate() {}
  blendFuncSeparate() {}
  viewport() {}
}
let nativeVr = null;
let nativeWindow = null;
class VRFrameData {
  constructor() {
    this.leftProjectionMatrix = new Float32Array(16);
    this.leftViewMatrix = new Float32Array(16);
    this.rightProjectionMatrix = new Float32Array(16);
    this.rightViewMatrix = new Float32Array(16);
    this.pose = new VRPose();
  }

  copy(frameData) {
    this.leftProjectionMatrix.set(frameData.leftProjectionMatrix);
    this.leftViewMatrix.set(frameData.leftViewMatrix);
    this.rightProjectionMatrix.set(frameData.rightProjectionMatrix);
    this.rightViewMatrix.set(frameData.rightViewMatrix);
    this.pose.copy(frameData.pose);
  }
}
class VRPose {
  constructor(position = new Float32Array(3), orientation = Float32Array.from([0, 0, 0, 1])) {
    this.position = position;
    this.orientation = orientation;
  }

  set(position, orientation) {
    position.toArray(this.position);
    orientation.toArray(this.orientation);
  }

  copy(vrPose) {
    this.position.set(vrPose.position);
    this.orientation.set(vrPose.orientation);
  }
}
class GamepadButton {
  constructor() {
     this.value = 0;
     this.pressed = false;
     this.touched = false;
  }

  copy(button) {
    this.value = button.value;
    this.pressed = button.pressed;
    this.touched = button.touched;
  }
}
class Gamepad {
  constructor(hand, index) {
    this.hand = hand;
    this.index = index;

    this.connected = true;
    this.buttons = [
      new GamepadButton(),
      new GamepadButton(),
      new GamepadButton(),
      new GamepadButton(),
    ];
    this.hasPosition = true;
    this.hasOrientation = true;
    this.position = new Float32Array(3);
    this.linearVelocity = new Float32Array(3);
    this.linearAcceleration = new Float32Array(3);
    this.orientation = Float32Array.from([0, 0, 0, 1]);
    this.angularVelocity = new Float32Array(3);
    this.angularAcceleration = new Float32Array(3);
    this.axes = new Float32Array(2);
  }

  copy(gamepad) {
    this.connected = gamepad.connected;
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].set(gamepad.buttons[i]);
    }
    this.hasPosition = gamepad.hasPosition;
    this.hasOrientation = gamepad.hasOrientation;
    this.position.set(gamepad.position);
    this.linearVelocity.set(gamepad.linearVelocity);
    this.linearAcceleration.set(gamepad.linearAcceleration);
    this.orientation.set(gamepad.orientation);
    this.angularVelocity.set(gamepad.angularVelocity);
    this.angularAcceleration.set(gamepad.angularAcceleration);
    this.axes.set(gamepad.axes);
  }
}
class VRStageParameters {
  constructor() {
    // new THREE.Matrix4().compose(new THREE.Vector3(0, 1.6, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)).toArray(new Float32Array(16))
    this.sittingToStandingTransform = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.6, 0, 1]);
  }

  copy(vrStageParameters) {
    this.sittingToStandingTransform.set(vrStageParameters.sittingToStandingTransform);
  }
}
const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();
class MRDisplay {
  constructor(name, window, displayId) {
    this.name = name;
    this[windowSymbol] = window;
    this.displayId = displayId;

    this.isPresenting = false;
    this.capabilities = {
      canPresent: true,
      hasExternalDisplay: true,
      hasPosition: true,
      maxLayers: 1,
    };
    this.depthNear = 0.1;
    this.depthFar = 1000.0;
    this.stageParameters = new VRStageParameters();

    this._width = window.innerWidth / 2;
    this._height = window.innerHeight;
    this._cleanups = [];
    this._rafs = [];
  }

  getLayers() {
    return [
      {
        leftBounds: [0, 0, 0.5, 1],
        rightBounds: [0.5, 0, 0.5, 1],
        source: null,
      }
    ];
  }

  getEyeParameters(eye) {
    return {
      renderWidth: this._width,
      renderHeight: this._height,
    };
  }

  requestPresent() {
    return (nativeVr !== null ? nativeVr.requestPresent() : Promise.resolve())
      .then(() => {
        this.isPresenting = true;

        process.nextTick(() => {
          this[windowSymbol].emit('vrdisplaypresentchange');
        });
      });
  }

  exitPresent() {
    return (nativeVr !== null ? nativeVr.exitPresent() : Promise.resolve())
      .then(() => {
        this.isPresenting = false;

        for (let i = 0; i < this._rafs.length; i++) {
          this.cancelAnimationFrame(this._rafs[i]);
        }
        this._rafs.length = 0;

        process.nextTick(() => {
          this[windowSymbol].emit('vrdisplaypresentchange');
        });
      });
  }

  requestAnimationFrame(fn) {
    const animationFrame = this[windowSymbol].requestAnimationFrame(() => {
      this._rafs.splice(animationFrame, 1);
      fn();
    });
    this._rafs.push(animationFrame);
    return animationFrame;
  }

  cancelAnimationFrame(animationFrame) {
    const result = this[windowSymbol].cancelAnimationFrame(animationFrame);
    const index = this._rafs.indexOf(animationFrame);
    if (index !== -1) {
      this._rafs.splice(index, 1);
    }
    return result;
  }

  submitFrame() {}

  destroy() {
    for (let i = 0; i < this._rafs.length; i++) {
      this.cancelAnimationFrame(this._rafs[i]);
    }
    for (let i = 0; i < this._cleanups.length; i++) {
      this._cleanups[i]();
    }
  }
}
class VRDisplay extends MRDisplay {
  constructor(window, displayId) {
    super('VR', window, displayId);

    this._frameData = new VRFrameData();

    const _updatevrframe = update => {
      const {
        depthNear,
        depthFar,
        renderWidth,
        renderHeight,
        frameData,
        stageParameters,
      } = update;

      if (depthNear !== undefined) {
        this.depthNear = depthNear;
      }
      if (depthFar !== undefined) {
        this.depthFar = depthFar;
      }
      if (renderWidth !== undefined) {
        this._width = renderWidth;
      }
      if (renderHeight !== undefined) {
        this._height = renderHeight;
      }
      if (frameData !== undefined) {
        this._frameData.copy(frameData);
      }
      if (stageParameters !== undefined) {
        this.stageParameters.copy(stageParameters);
      }
    };
    window.on('updatevrframe', _updatevrframe);

    this._cleanups.push(() => {
      window.removeListener('updatevrframe', _updatevrframe);
    });
  }

  getFrameData(frameData) {
    frameData.copy(this._frameData);
  }
}
class ARDisplay extends MRDisplay {
  constructor(window, displayId) {
    super('AR', window, displayId);

    this._viewMatrix = new Float32Array(16);
    this._projectionMatrix = new Float32Array(16);

    const _resize = () => {
      this._width = window.innerWidth / 2;
      this._height = window.innerHeight;
    };
    window.on('resize', _resize);
    const _updatearframe = (viewMatrix, projectionMatrix) => {
      this._viewMatrix.set(viewMatrix);
      this._projectionMatrix.set(projectionMatrix);
    };
    window.on('updatearframe', _updatearframe);

    this._cleanups.push(() => {
      window.removeListener('resize', _resize);
      window.removeListener('updatearframe', _updatearframe);
    });
  }

  getFrameData(frameData) {
    const hmdMatrix = localMatrix.fromArray(this._viewMatrix);
    hmdMatrix.decompose(localVector, localQuaternion, localVector2);
    frameData.pose.set(localVector, localQuaternion);

    frameData.leftViewMatrix.set(this._viewMatrix);
    frameData.rightViewMatrix.set(this._viewMatrix);

    frameData.leftProjectionMatrix.set(this._projectionMatrix);
    frameData.rightProjectionMatrix.set(this._projectionMatrix);
  }
}
class AudioNode {
  connect() {}
}
class AudioDestinationNode extends AudioNode {}
class AudioListener extends AudioNode {
  constructor() {
    super();

    this.positionX = new AudioParam();
    this.positionY = new AudioParam();
    this.positionZ = new AudioParam();
    this.forwardX = new AudioParam();
    this.forwardY = new AudioParam();
    this.forwardZ = new AudioParam();
    this.upX = new AudioParam();
    this.upY = new AudioParam();
    this.upZ = new AudioParam();
  }
}
class AudioParam {
  constructor() {
    this.value = 0;
    this.minValue = 0;
    this.maxValue = 0;
    this.defaultValue = 0;
  }

  setValueAtTime() {}
}
class GainNode extends AudioNode {}
class AnalyserNode extends AudioNode {}
class PannerNode extends AudioNode {
  setPosition() {}
}
class StereoPannerNode extends AudioNode {}
class AudioContext {
  constructor() {
    this.listener = new AudioListener();
  }
  
  createMediaElementSource() {
    return new AudioNode();
  }
  
  createMediaStreamSource() {
    return new AudioNode();
  }
  
  createGain() {
    return new GainNode();
  }
  
  createAnalyser() {
    return new AnalyserNode();
  }
  
  createPanner() {
    return new PannerNode();
  }
}

class Node extends EventEmitter {
  constructor(nodeName = null) {
    super();

    this.nodeName = nodeName;
    this.parentNode = null;
  }
}
Node.ELEMENT_NODE = 1;
Node.TEXT_NODE = 3;
Node.PROCESSING_INSTRUCTION_NODE = 7;
Node.COMMENT_NODE = 8;
Node.DOCUMENT_NODE = 9;
Node.DOCUMENT_TYPE_NODE = 10;
Node.DOCUMENT_FRAGMENT_NODE = 11;
const _makeAttributesProxy = attrs => new Proxy(attrs, {
  get(target, prop) {
    const propN = parseIntStrict(prop);
    if (propN !== undefined) {
      return target[propN];
    } else if (prop === 'length') {
      return target.length;
    } else {
      const attr = target.find(attr => attr.name === prop);
      return attr && attr.value;
    }
  },
  set(target, prop, value) {
    const propN = parseIntStrict(prop);
    if (propN !== undefined) {
      target[propN] = value;
    } else if (prop === 'length') {
      target.length = value;
    } else {
      const attr = target.find(attr => attr.name === prop);
      if (!attr) {
        const attr = {
          name: prop,
          value,
        };
        target.push(attr);
      } else {
        attr.name = prop;
        attr.value = value;
      }
    }
    return true;
  },
  has(target, prop) {
    if (typeof prop === 'number') {
      return target[prop] !== undefined;
    } else if (prop === 'length') {
      return true;
    } else {
      return target.findIndex(attr => attr.name === prop) !== -1;
    }
  },
});
class HTMLElement extends Node {
  constructor(tagName = 'DIV', attrs = [], value = '') {
    super(null);

    this.tagName = tagName;
    this.attrs = attrs;
    this.value = value;

    this.attributes = _makeAttributesProxy(attrs);
    this.childNodes = [];
    this._innerHTML = '';
  }

  get nodeType() {
    return Node.ELEMENT_NODE;
  }
  set nodeType(nodeType) {}

  get children() {
    return this.childNodes;
  }
  set children(children) {
    this.childNodes = children;
  }

  getAttribute(name) {
    return this.attributes[name];
  }
  setAttribute(name, value) {
    const oldValue = this.attributes[name];
    this.attributes[name] = value;

    this.emit('attribute', name, value, oldValue);
  }

  appendChild(childNode) {
    this.childNodes.push(childNode);
    childNode.parentNode = this;

    this.emit('children', [childNode], [], this.childNodes[this.childNodes.length - 2] || null, null);
  }
  removeChild(childNode) {
    const index = this.childNodes.indexOf(childNode);
    if (index !== -1) {
      this.childNodes.splice(index, 1);
      childNode.parentNode = null;

      this.emit('children', [], [childNode], this.childNodes[index - 1] || null, this.childNodes[index] || null);
    }
  }
  insertBefore(childNode, nextSibling) {
    const index = this.childNodes.indexOf(nextSibling);
    if (index !== -1) {
      this.childNodes.splice(index, 0, childNode);
      childNode.parentNode = this;

      this.emit('children', [childNode], [], this.childNodes[index - 1] || null, this.childNodes[index + 1] || null);
    }
  }
  insertAfter(childNode, nextSibling) {
    const index = this.childNodes.indexOf(nextSibling);
    if (index !== -1) {
      this.childNodes.splice(index + 1, 0, childNode);
      childNode.parentNode = this;

      this.emit('children', [childNode], [], this.childNodes[index] || null, this.childNodes[index + 2] || null);
    }
  }

  getElementById(id) {
    return this.traverse(node => {
      if (
        (node.getAttribute && node.getAttribute('id') === id) ||
        (node.attrs && node.attrs.some(attr => attr.name === 'id' && attr.value === id))
      ) {
        return node;
      }
    });
  }
  getElementByClassName(className) {
    return this.traverse(node => {
      if (
        (node.getAttribute && node.getAttribute('class') === className) ||
        (node.attrs && node.attrs.some(attr => attr.name === 'class' && attr.value === className))
      ) {
        return node;
      }
    });
  }
  getElementByTagName(tagName) {
    tagName = tagName.toUpperCase();

    return this.traverse(node => {
      if (node.tagName === tagName) {
        return node;
      }
    });
  }
  querySelector(selector) {
    let match;
    if (match = selector.match(/^#(.+)$/)) {
      return this.getElementById(match[1]);
    } else if (match = selector.match(/^\.(.+)$/)) {
      return this.getElementByClassName(match[1]);
    } else {
      return this.getElementByTagName(selector);
    }
  }
  getElementsById(id) {
    const result = [];
    this.traverse(node => {
      if (
        (node.getAttribute && node.getAttribute('id') === id) ||
        (node.attrs && node.attrs.some(attr => attr.name === 'id' && attr.value === id))
      ) {
        result.push(node);
      }
    });
    return result;
  }
  getElementsByClassName(className) {
    const result = [];
    this.traverse(node => {
      if (
        (node.getAttribute && node.getAttribute('class') === className) ||
        (node.attrs && node.attrs.some(attr => attr.name === 'class' && attr.value === className))
      ) {
        result.push(node);
      }
    });
    return result;
  }
  getElementsByTagName(tagName) {
    tagName = tagName.toUpperCase();

    const result = [];
    this.traverse(node => {
      if (node.tagName === tagName) {
        result.push(node);
      }
    });
    return result;
  }
  querySelectorAll(selector) {
    let match;
    if (match = selector.match(/^#(.+)$/)) {
      return this.getElementsById(match[1]);
    } else if (match = selector.match(/^\.(.+)$/)) {
      return this.getElementsByClassName(match[1]);
    } else {
      return this.getElementsByTagName(selector);
    }
  }
  matches(selector) {
    let match;
    if (match = selector.match(/^#(.+)$/)) {
      const id = match[1];
      return (
        (this.getAttribute && this.getAttribute('id') === id) ||
        (this.attrs && this.attrs.some(attr => attr.name === 'id' && attr.value === id))
      );
    } else if (match = selector.match(/^\.(.+)$/)) {
      const className = match[1];
      return (
        (this.getAttribute && this.getAttribute('class') === className) ||
        (this.attrs && this.attrs.some(attr => attr.name === 'class' && attr.value === className))
      );
    } else {
      const tagName = selector.toUpperCase();
      return this.tagName === tagName;
    }
  }
  traverse(fn) {
    const _recurse = node => {
      const result = fn(node);
      if (result !== undefined) {
        return result;
      } else {
        if (node.childNodes) {
          for (let i = 0; i < node.childNodes.length; i++) {
            const result = _recurse(node.childNodes[i]);
            if (result !== undefined) {
              return result;
            }
          }
        }
      }
    };
    return _recurse(this);
  }

  cloneNode(deep = false) {
    const el = new this.constructor(this.attrs, this.value);
    if (deep) {
      el.childNodes = this.childNodes.map(childNode => childNode.cloneNode(true));
    }
    return el;
  }

  addEventListener() {
    this.on.apply(this, arguments);
  }
  removeEventListener() {
    this.removeListener.apply(this, arguments);
  }

  get offsetWidth() {
    const style = _parseStyle(this.attributes['style'] || '');
    const fontFamily = style['font-family'];
    if (fontFamily) {
      return _hash(fontFamily) * _hash(this.innerHTML);
    } else {
      return 0;
    }
  }
  set offsetWidth(offsetWidth) {}
  get offsetHeight() {
    return 0;
  }
  set offsetHeight(offsetHeight) {}

  get className() {
    return this.attributes['class'] || '';
  }
  set className(className) {
    this.attributes['class'] = className;
  }

  get style() {
    const style = _parseStyle(this.attributes['style'] || '');
    Object.defineProperty(style, 'cssText', {
      get: () => this.attributes['style'],
      set: cssText => {
        this.attributes['style'] = cssText;
      },
    });
    return style;
  }
  set style(style) {
    this.attributes['style'] = _formatStyle(style);
  }

  get innerHTML() {
    return parse5.serialize(this);
  }
  set innerHTML(innerHTML) {
    const oldChildNodes = this.childNodes;
    const newChildNodes = parse5.parseFragment(innerHTML).childNodes.map(childNode => _fromAST(childNode, this[windowSymbol], this));
    this.childNodes = newChildNodes;

    if (oldChildNodes.length > 0) {
      this.emit('children', [], oldChildNodes, null, null);
    }
    if (newChildNodes.length > 0) {
      this.emit('children', newChildNodes, [], null, null);
    }

    _promiseSerial(newChildNodes.map(childNode => () => _runHtml(childNode, this[windowSymbol])))
      .catch(err => {
        console.warn(err);
      });

    this.emit('innerHTML', innerHTML);
  }

  requestPointerLock() {
    const {document} = this[windowSymbol];

    if (document.pointerLockElement === null) {
      document.pointerLockElement = this;

      if (nativeWindow !== null) {
        nativeWindow.setCursorMode(false);
      }

      process.nextTick(() => {
        document.emit('pointerlockchange');
      });
    }
  }
  exitPointerLock() {
    const {document} = this[windowSymbol];

    if (document.pointerLockElement !== null) {
      document.pointerLockElement = null;

      if (nativeWindow !== null) {
        nativeWindow.setCursorMode(true);
      }

      process.nextTick(() => {
        document.emit('pointerlockchange');
      });
    }
  }
}
class HTMLAnchorElement extends HTMLElement {
  constructor(attrs = [], value = '') {
    super('A', attrs, value);
  }

  get href() {
    return this.getAttribute('href') || '';
  }
  set href(value) {
    this.setAttribute('href', value);
  }
}
class HTMLLoadableElement extends HTMLElement {
  constructor(tagName, attrs = [], value = '') {
    super(tagName, attrs, value);
  }

  get onload() {
    return _elementGetter(this, 'load');
  }
  set onload(onload) {
    _elementSetter(this, 'load', onload);
  }

  get onerror() {
    return _elementGetter(this, 'error');
  }
  set onerror(onerror) {
    _elementSetter(this, 'error', onerror);
  }
}
class HTMLWindowElement extends HTMLLoadableElement {
  constructor() {
    super('WINDOW');
  }

  postMessage(data) {
    this.emit('message', new MessageEvent(data));
  }

  get onmessage() {
    return _elementGetter(this, 'message');
  }
  set onmessage(onmessage) {
    _elementSetter(this, 'message', onmessage);
  }
}
class HTMLScriptElement extends HTMLLoadableElement {
  constructor(attrs = [], value = '') {
    super('SCRIPT', attrs, value);

    this.readyState = null;

    this.on('attribute', (name, value) => {
      if (name === 'src') {
        this.readyState = null;

        const url = value;
        this[windowSymbol].fetch(url)
          .then(res => {
            if (res.status >= 200 && res.status < 300) {
              return res.text();
            } else {
              return Promise.reject(new Error('script src got invalid status code: ' + res.status + ' : ' + url));
            }
          })
          .then(jsString => {
            _runJavascript(jsString, this[windowSymbol], url);

            this.readyState = 'complete';

            this.emit('load');
          })
          .catch(err => {
            this.readyState = 'complete';

            this.emit('error', err);
          });
      }
    });
    this.on('innerHTML', innerHTML => {
      _runJavascript(innerHTML, this[windowSymbol]);

      this.readyState = 'complete';

      process.nextTick(() => {
        this.emit('load');
      });
    });
  }

  get src() {
    return this.getAttribute('src') || '';
  }
  set src(value) {
    this.setAttribute('src', value);
  }

  set innerHTML(innerHTML) {
    this.emit('innerHTML', innerHTML);
  }

  run() {
    let running = false;
    if (this.attributes.src) {
      this.src = this.attributes.src;
      running = true;
    }
    if (this.childNodes.length > 0) {
      this.innerHTML = this.childNodes[0].value;
      running = true;
    }
    return running;
  }
}
class HTMLSrcableElement extends HTMLLoadableElement {
  constructor(tagName = null, attrs = [], value = '') {
    super(tagName, attrs, value);
  }

  get src() {
    this.getAttribute('src');
  }
  set src(value) {
    this.setAttribute('src', value);
  }

  run() {
    if (this.attributes.src) {
      this.src = this.attributes.src;
      return true;
    } else {
      return false;
    }
  }
}
class HTMLMediaElement extends HTMLSrcableElement {
  constructor(tagName = null, attrs = [], value = '') {
    super(tagName, attrs, value);

    this.paused = false;
    this.currentTime = 0;
    this.duration = 0;
    this.loop = false;
  }

  play() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }
}
class HTMLImageElement extends HTMLSrcableElement {
  constructor(attrs = [], value = '') {
    super('IMG', attrs, value);

    this.data = new Uint8Array(0);
    // this.stack = new Error().stack;

    this.on('attribute', (name, value) => {
      if (name === 'src') {
        process.nextTick(() => { // XXX
          this.emit('load');
        });
      }
    });
  }

  get width() {
    return 0;
  }
  set width(width) {}

  get height() {
    return 0;
  }
  set height(height) {}

  get naturalWidth() {
    return this.width;
  }
  set naturalWidth(naturalWidth) {}

  get naturalHeight() {
    return this.height;
  }
  set naturalHeight(naturalHeight) {}
};
class HTMLAudioElement extends HTMLMediaElement {
  constructor(attrs = [], value = '') {
    super('AUDIO', attrs, value);

    this.on('attribute', (name, value) => {
      if (name === 'src') {
        process.nextTick(() => { // XXX
          this.emit('load');
          this.emit('canplay');
        });
      }
    });
  }

  get oncanplay() {
    return _elementGetter(this, 'canplay');
  }
  set oncanplay(oncanplay) {
    _elementSetter(this, 'canplay', oncanplay);
  }

  get oncanplaythrough() {
    return _elementGetter(this, 'canplaythrough');
  }
  set oncanplaythrough(oncanplaythrough) {
    _elementSetter(this, 'canplaythrough', oncanplaythrough);
  }
}
class MicrophoneMediaStream {}
class HTMLVideoElement extends HTMLMediaElement {
  constructor(attrs = [], value = '') {
    super('VIDEO', attrs, value);

    this.data = new Uint8Array(0);
    
    this.on('attribute', (name, value) => {
      if (name === 'src') {
        process.nextTick(() => { // XXX
          this.emit('load');
        });
      }
    });
  }
  
  get width() {
    return 0;
  }
  set width(width) {}

  get height() {
    return 0;
  }
  set height(height) {}
}
class HTMLIframeElement extends HTMLSrcableElement {
  constructor(attrs = [], value = '') {
    super('IFRAME', attrs, value);

    this.on('attribute', (name, value) => {
      if (name === 'src') {
        const url = value;
        this[windowSymbol].fetch(url)
          .then(res => {
            if (res.status >= 200 && res.status < 300) {
              return res.text();
            } else {
              return Promise.reject(new Error('iframe src got invalid status code: ' + res.status + ' : ' + url));
            }
          })
          .then(htmlString => {
            const contentDocument = _parseDocument(htmlString, this.contentWindow[optionsSymbol], this.contentWindow);
            this.contentDocument = contentDocument;

            contentDocument.once('readystatechange', () => {
              this.emit('load');
            });
          })
          .catch(err => {
            this.emit('error', err);
          });
      }
    });
    this.on('window', () => {
      const parentWindow = this[windowSymbol];
      this.contentWindow = _parseWindow('', parentWindow[optionsSymbol], parentWindow, parentWindow.top);
      this.contentDocument = this.contentWindow.document;
    });
  }
}
class HTMLCanvasElement extends HTMLElement {
  constructor(attrs = [], value = '') {
    super('CANVAS', attrs, value);

    this._context = null;

    this.on('attribute', (name, value) => {
      if (name === 'width') {
        // console.log('gl canvas set width', this.width, this.height, this._context && this._context.resize, new Error().stack);
        this._context && this._context.resize && this._context.resize(this.width, this.height);
      } else if (name === 'height') {
        // console.log('gl canvas set height', this.width, this.height, this._context && this._context.resize, new Error().stack);
        this._context && this._context.resize && this._context.resize(this.width, this.height);
      }
    });
  }

  get width() {
     return this.getAttribute('width') || 1;
  }
  set width(value) {
    if (typeof value === 'number' && isFinite(value)) {
      this.setAttribute('width', value);
    }
  }

  get height() {
    return this.getAttribute('height') || 1;
  }
  set height(value) {
    if (typeof value === 'number' && isFinite(value)) {
      this.setAttribute('height', value);
    }
  }

  get data() {
    return (this._context && this._context.data) || null;
  }
  set data(data) {}

  getContext(contextType) {
    if (this._context === null) {
      if (contextType === '2d') {
        this._context = new CanvasRenderingContext2D(this.width, this.height);
      } else if (contextType === 'webgl') {
        console.log('gl context webgl');
        this._context = new WebGLContext();
      }
    }
    return this._context;
  }

  captureStream(frameRate) {
    return {}; // XXX
  }
}
class MediaRecorder extends EventEmitter {
  constructor() {
    super();
  }

  start() {}

  stop() {}

  requestData() {}
}
class TextNode extends Node {
  constructor(value) {
    super('#text');

    this.value = value;
  }

  get nodeType() {
    return Node.TEXT_NODE;
  }
  set nodeType(nodeType) {}
}
class CommentNode extends Node {
  constructor(value) {
    super('#comment');

    this.value = value;
  }

  get nodeType() {
    return Node.COMMENT_NODE;
  }
  set nodeType(nodeType) {}
}

const _fromAST = (node, window, parentNode = null) => {
  if (node.nodeName === '#text') {
    const textNode = new window[htmlElementsSymbol].TextNode(node.value);
    textNode.parentNode = parentNode;
    return textNode;
  } else if (node.nodeName === '#comment') {
    const commentNode = new window[htmlElementsSymbol].CommentNode(node.value);
    commentNode.parentNode = parentNode;
    return commentNode;
  } else {
    const tagName = node.tagName && node.tagName.toUpperCase();
    const {attrs, value} = node;
    const HTMLElementTemplate = window[htmlTagsSymbol][tagName];
    const element = HTMLElementTemplate ?
      new HTMLElementTemplate(
        attrs,
        value
      )
    :
      new window[htmlElementsSymbol].HTMLElement(
        tagName,
        attrs,
        value
      );
    element.parentNode = parentNode;
    if (node.childNodes) {
      element.childNodes = node.childNodes.map(childNode => _fromAST(childNode, window, element));
    }
    return element;
  }
};
const _parseStyle = styleString => {
  const style = {};
  const split = styleString.split(/;\s*/);
  for (let i = 0; i < split.length; i++) {
    const split2 = split[i].split(/:\s*/);
    if (split2.length === 2) {
      style[split2[0]] = split2[1];
    }
  }
  return style;
};
const _formatStyle = style => {
  let styleString = '';
  for (const k in style) {
    styleString += (styleString.length > 0 ? ' ' : '') + k + ': ' + style[k] + ';';
  }
  return styleString;
};
const _hash = s => {
  let result = 0;
  for (let i = 0; i < s.length; i++) {
    result += s.codePointAt(i);
  }
  return result;
};
const _elementGetter = (self, attribute) => self.listeners(attribute)[0];
const _elementSetter = (self, attribute, cb) => {
  if (typeof cb === 'function') {
    self.addEventListener(attribute, cb);
  } else {
    const listeners = self.listeners(attribute);
    for (let i = 0; i < listeners.length; i++) {
      self.removeEventListener(attribute, listeners[i]);
    }
  }
};
const _promiseSerial = async promiseFns => {
  for (let i = 0; i < promiseFns.length; i++) {
    await promiseFns[i]();
  }
};
const _loadPromise = el => new Promise((accept, reject) => {
  el.on('load', () => {
    accept();
  });
  el.on('error', err => {
    reject(err);
  });
});
const _runHtml = async (element, window) => {
  if (element instanceof HTMLElement) {
    const scripts = element.querySelectorAll('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.run()) {
        if (script.attributes.async) {
          _loadPromise(script)
            .catch(err => {
              console.warn(err);
            });
        } else {
          try {
            await _loadPromise(script);
          } catch(err) {
            console.warn(err);
          }
        }
      }
    }

    const images = element.querySelectorAll('image');
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (image.run()) {
        await _loadPromise(image);
      }
    }

    const audios = element.querySelectorAll('audio');
    for (let i = 0; i < audios.length; i++) {
      const audio = audios[i];
      if (audio.run()) {
        await _loadPromise(audioEl);
      }
    }

    const videos = element.querySelectorAll('video');
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      if (video.run()) {
        await _loadPromise(videoEl);
      }
    }
  }
};
const _runJavascript = (jsString, window, filename = 'script') => {
  try {
    windowEval(jsString, window, filename);
  } catch (err) {
    console.warn(err.stack);
  }
};
const _makeWindow = (options = {}, parent = null, top = null) => {
  const _normalizeUrl = src => new URL(src, options.baseUrl).href;

  const window = new HTMLWindowElement();
  window.window = window;
  window.self = window;
  window.parent = parent || window;
  window.top = top || window;
  window.innerWidth = 1280;
  window.innerHeight = 1024;
  window.devicePixelRatio = 1;
  window.console = console;
  window.setTimeout = setTimeout;
  window.clearTimeout = clearTimeout;
  window.setInterval = setInterval;
  window.clearInterval = clearInterval;
  window.performance = performance;
  window.location = url.parse(options.url);

  let vrDisplays = [];

  const localGamepads = [null, null];
  const leftGamepad = new Gamepad('left', 0);
  const rightGamepad = new Gamepad('right', 1);
  const _updatevrframe = update => {
    const {
      gamepads,
    } = update;

    if (gamepads !== undefined) {
      if (gamepads[0]) {
        localGamepads[0] = leftGamepad;
        localGamepads[0].copy(gamepads[0]);
      } else {
        localGamepads[0] = null;
      }
      if (gamepads[1]) {
        localGamepads[1] = rightGamepad;
        localGamepads[1].copy(gamepads[1]);
      } else {
        localGamepads[1] = null;
      }
    }
  };
  window.on('updatevrframe', _updatevrframe);

  let vrMode = null;
  let vrTexture = null;
  let vrTextures = [];
  window.navigator = {
    userAgent: 'exokit',
    getVRDisplays: () => vrDisplays,
    getGamepads: () => localGamepads,
    getVRMode: () => vrMode,
    setVRMode: newVrMode => {
      for (let i = 0; i < vrDisplays.length; i++) {
        vrDisplays[i].destroy();
      }

      if (newVrMode === 'vr') {
        vrDisplays = [new VRDisplay(window, 0)];
      } else if (newVrMode === 'ar') {
        vrDisplays = [new ARDisplay(window, 1)];
      }
      vrMode = newVrMode;
    },
    getVRTexture: () => vrTexture,
    setVRTexture: newVrTexture => {
      vrTexture = newVrTexture;
    },
    getVRTextures: () => vrTextures,
    setVRTextures: newVrTextures => {
      vrTextures = newVrTextures;
    },
  };
  window.localStorage = new LocalStorage(path.join(options.dataPath, '.localStorage'));
  window.document = null;
  window.URL = URL;
  window[htmlElementsSymbol] = {
    Node: (Old => {
      class Node extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } }
      for (const k in Old) {
        Node[k] = Old[k];
      }
      return Node;
    })(Node),
    HTMLElement: (Old => class HTMLElement extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(HTMLElement),
    HTMLAnchorElement: (Old => class HTMLAnchorElement extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(HTMLAnchorElement),
    HTMLScriptElement: (Old => class HTMLScriptElement extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(HTMLScriptElement),
    HTMLImageElement: (Old => class HTMLImageElement extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(HTMLImageElement),
    HTMLAudioElement: (Old => class HTMLAudioElement extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(HTMLAudioElement),
    HTMLVideoElement: (Old => class HTMLVideoElement extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(HTMLVideoElement),
    HTMLIframeElement: (Old => class HTMLIframeElement extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(HTMLIframeElement),
    HTMLCanvasElement: (Old => class HTMLCanvasElement extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(HTMLCanvasElement),
    TextNode: (Old => class TextNode extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(TextNode),
    CommentNode: (Old => class CommentNode extends Old { constructor() { super(...arguments); this[windowSymbol] = window; this.emit('window'); } })(CommentNode),
  };
  window[htmlTagsSymbol] = {
    A: window[htmlElementsSymbol].HTMLAnchorElement,
    SCRIPT: window[htmlElementsSymbol].HTMLScriptElement,
    IMG: window[htmlElementsSymbol].HTMLImageElement,
    AUDIO: window[htmlElementsSymbol].HTMLAudioElement,
    VIDEO: window[htmlElementsSymbol].HTMLVideoElement,
    IFRAME: window[htmlElementsSymbol].HTMLIframeElement,
    CANVAS: window[htmlElementsSymbol].HTMLCanvasElement,
  };
  window[optionsSymbol] = options;
  window.HTMLElement = window[htmlElementsSymbol].HTMLElement;
  window.HTMLAnchorElement = window[htmlElementsSymbol].HTMLAnchorElement;
  window.HTMLScriptElement = window[htmlElementsSymbol].HTMLScriptElement;
  window.HTMLImageElement = window[htmlElementsSymbol].HTMLImageElement;
  window.HTMLAudioElement = window[htmlElementsSymbol].HTMLAudioElement;
  window.HTMLVideoElement = window[htmlElementsSymbol].HTMLVideoElement;
  window.HTMLIframeElement = window[htmlElementsSymbol].HTMLIframeElement;
  window.HTMLCanvasElement = window[htmlElementsSymbol].HTMLCanvasElement;
  window.MutationObserver = MutationObserver;
  window.Node = window[htmlElementsSymbol].Node;
  window.Image = window[htmlElementsSymbol].HTMLImageElement;
  window.ImageData = ImageData;
  window.ImageBitmap = ImageBitmap;
  window.Path2D = Path2D;
  window.CanvasRenderingContext2D = CanvasRenderingContext2D;
  window.MediaRecorder = MediaRecorder;
  window.Gamepad = Gamepad;
  window.VRStageParameters = VRStageParameters;
  window.VRDisplay = VRDisplay;
  // window.ARDisplay = ARDisplay;
  window.VRFrameData = VRFrameData;
  window.btoa = s => new Buffer(s, 'binary').toString('base64');
  window.atob = s => new Buffer(s, 'base64').toString('binary');
  window.fetch = (url, options) => {
    const blob = urls.get(url);
    if (blob) {
      return Promise.resolve(new Response(blob));
    } else {
      return fetch(_normalizeUrl(url), options);
    }
  };
  window.XMLHttpRequest = XMLHttpRequest;
  window.WebSocket = WebSocket;
  window.Worker = class Worker extends nativeWorker {
    constructor(src, workerOptions = {}) {
      workerOptions.baseUrl = options.baseUrl;
      if (nativeBindings) {
        workerOptions.startScript = '\
          const nativeBindings = requireNative("nativeBindings");\n\
          global.ImageBitmap = nativeBindings.nativeImageBitmap;\n\
          global.createImageBitmap = function() {\n\
            return Promise.resolve(ImageBitmap.createImageBitmap.apply(ImageBitmap, arguments));\n\
          };\n\
          console.log("start script 1");\n\
          const smiggles = require("smiggles");\n\
          console.log("start script 2", nativeBindings.nativeImageBitmap);\n\
          smiggles.bind({ImageBitmap: nativeBindings.nativeImageBitmap});\n\
          console.log("start script 3");\n\
        ';
      }

      if (src instanceof Blob) {
        super('data:application/javascript,' + src.buffer.toString('utf8'), workerOptions);
      } else {
        super(_normalizeUrl(src), workerOptions);
      }
    }
  };
  window.Blob = Blob;
  window.AudioContext = AudioContext;
  window.AudioNode = AudioNode;
  window.AudioDestinationNode = AudioDestinationNode;
  window.AudioParam = AudioParam;
  window.AudioListener = AudioListener;
  window.GainNode = GainNode;
  window.AnalyserNode = AnalyserNode;
  window.PannerNode = PannerNode;
  window.StereoPannerNode = StereoPannerNode;
  window.Path2D = Path2D;
  window.createImageBitmap = function() {
    return Promise.resolve(ImageBitmap.createImageBitmap.apply(ImageBitmap, arguments));
  };
  const rafCbs = [];
  window.requestAnimationFrame = fn => {
    rafCbs.push(fn);
    return fn;
  };
  window.cancelAnimationFrame = fn => {
    const index = rafCbs.indexOf(fn);
    if (index !== -1) {
      rafCbs.splice(index, 1);
    }
  };
  window.tickAnimationFrame = () => {
    const localRafCbs = rafCbs.slice();
    rafCbs.length = 0;
    for (let i = 0; i < localRafCbs.length; i++) {
      localRafCbs[i]();
    }
  };
  window.updateVrFrame = update => {
    window.emit('updatevrframe', update);
  };
  window.updateArFrame = (viewMatrix, projectionMatrix) => {
    window.emit('updatearframe', viewMatrix, projectionMatrix);
  };
  return window;
};
const _parseDocument = (s, options, window) => {
  const document = _fromAST(parse5.parse(s), window);
  const html = document.childNodes.find(element => element.tagName === 'HTML');
  const head = html.childNodes.find(element => element.tagName === 'HEAD');
  const body = html.childNodes.find(element => element.tagName === 'BODY');

  document.documentElement = document;
  document.readyState = null;
  document.head = head;
  document.body = body;
  document.location = url.parse(options.url);
  document.createElement = tagName => {
    tagName = tagName.toUpperCase();
    const HTMLElementTemplate = window[htmlTagsSymbol][tagName];
    return HTMLElementTemplate ? new HTMLElementTemplate() : new window[htmlElementsSymbol].HTMLElement(tagName);
  };
  document.createElementNS = (namespace, tagName) => document.createElement(tagName);
  document.createDocumentFragment = () => document.createElement();
  document.createTextNode = text => new TextNode(text);
  document.createComment = comment => new CommentNode(comment);
  document.styleSheets = [];
  document.open = () => {
    document.innerHTML = '';
  };
  document.close = () => {};
  document.write = htmlString => {
    const childNodes = parse5.parseFragment(htmlString).childNodes.map(childNode => _fromAST(childNode, window, this));
    for (let i = 0; i < childNodes.length; i++) {
      document.body.appendChild(childNodes[i]);
    }
  };
  document.pointerLockElement = null;
  window.document = document;

  process.nextTick(async () => {
    document.readyState = 'complete';

    try {
      await _runHtml(document, window);
    } catch(err) {
      console.warn(err);
    }

    document.emit('readystatechange');
  });

  return document;
};
const _parseWindow = (s, options, parent, top) => {
  const window = _makeWindow(options, parent, top);
  const document = _parseDocument(s, options, window);
  window.document = document;
  return window;
};

const exokit = (s = '', options = {}) => {
  options.url = options.url || 'http://127.0.0.1/';
  options.baseUrl = options.baseUrl || options.url;
  options.dataPath = options.dataPath || __dirname;
  return _parseWindow(s, options);
};
exokit.fetch = (src, options = {}) => fetch(src)
  .then(res => {
    if (res.status >= 200 && res.status < 300) {
      return res.text();
    } else {
      return Promise.reject(new Error('fetch got invalid status code: ' + res.status + ' : ' + src));
    }
  })
  .then(htmlString => {
    const parsedUrl = url.parse(src);
    return exokit(htmlString, {
      url: options.url || src,
      baseUrl: options.baseUrl || url.format({
        protocol: parsedUrl.protocol || 'http:',
        host: parsedUrl.host || '127.0.0.1',
      }),
      dataPath: options.dataPath,
    });
  });
exokit.THREE = THREE;
exokit.setNativeBindingsModule = nativeBindingsModule => {
  nativeBindings = true;

  const bindings = require(nativeBindingsModule);

  nativeWorker = bindings.nativeWorker;
  nativeWorker.setNativeRequire('nativeBindings', bindings.initFunctionAddress);
  nativeWorker.bind({
    ImageBitmap: bindings.nativeImageBitmap,
  });

  ImageData = bindings.nativeImageData;
  ImageBitmap = bindings.nativeImageBitmap;
  Path2D = bindings.nativePath2D;
  CanvasRenderingContext2D = bindings.nativeCanvasRenderingContext2D;
  WebGLContext = bindings.nativeGl;
  /* return function WebGLContext() {
    return new Proxy(new nativeGl(), {
      get(target, propKey, receiver) {
        const orig = target[propKey];
        if (typeof orig === 'function') {
          return function(a, b, c, d, e, f) {
            console.log('gl proxy method ' + propKey);
            return orig.apply(target, arguments);
          };
        } else {
          return orig;
        }
      }
    });
  }; */

  HTMLImageElement = class extends HTMLSrcableElement {
    constructor(attrs = [], value = '') {
      super('IMG', attrs, value);

      this._src = '';
      this.image = new bindings.nativeImage();
    }

    emit(event, data) {
      return EventEmitter.prototype.emit.call(this, event, data);
    }
    on(event, cb) {
      return EventEmitter.prototype.on.call(this, event, cb);
    }
    removeListener(event, cb) {
      return EventEmitter.prototype.removeListener.call(this, event, cb);
    }

    addEventListener(event, cb) {
      return HTMLElement.prototype.addEventListener.call(this, event, cb);
    }
    removeEventListener(event, cb) {
      return HTMLElement.prototype.removeEventListener.call(this, event, cb);
    }

    get src() {
      return this._src;
    }
    set src(src) {
      this._src = src;

      // const srcError = new Error();

      this[windowSymbol].fetch(src)
        .then(res => {
          if (res.status >= 200 && res.status < 300) {
            return res.arrayBuffer();
          } else {
            return Promise.reject(new Error(`img src got invalid status code (url: ${JSON.stringify(src)}, code: ${res.status})`));
          }
        })
        .then(arrayBuffer => {
          try {
            this.image.load(arrayBuffer);
          } catch(err) {
            throw new Error(`failed to decode image: ${err.message} (url: ${JSON.stringify(src)}, size: ${arrayBuffer.byteLength})`);
          }
        })
        .then(() => {
          this.emit('load');
        })
        .catch(err => {
          this.emit('error', err);
        });
    }

    get onload() {
      return _elementGetter(this, 'load');
    }
    set onload(onload) {
      _elementSetter(this, 'load', onload);
    }

    get onerror() {
      return _elementGetter(this, 'error');
    }
    set onerror(onerror) {
      _elementSetter(this, 'error', onerror);
    }

    get width() {
      return this.image.width;
    }
    set width(width) {}

    get height() {
      return this.image.height;
    }
    set height(height) {}

    get naturalWidth() {
      return this.width;
    }
    set naturalWidth(naturalWidth) {}

    get naturalHeight() {
      return this.height;
    }
    set naturalHeight(naturalHeight) {}

    get data() {
      return this.image.data;
    }
    set data(data) {}
  };

  /* const {nativeAudio} = bindings;
  AudioContext = nativeAudio.AudioContext;
  AudioNode = nativeAudio.AudioNode;
  AudioDestinationNode = nativeAudio.AudioDestinationNode;
  AudioParam = nativeAudio.AudioParam;
  AudioListener = nativeAudio.AudioListener;
  GainNode = nativeAudio.GainNode;
  AnalyserNode = nativeAudio.AnalyserNode;
  PannerNode = nativeAudio.PannerNode;
  StereoPannerNode = nativeAudio.StereoPannerNode;
  HTMLAudioElement = class extends HTMLMediaElement {
    constructor(attrs = [], value = '') {
      super('AUDIO', attrs, value);

      this._src = '';
      this.audio = new nativeAudio.Audio();
    }

    get src() {
      return this._src;
    }
    set src(src) {
      this._src = src;

      // const srcError = new Error();

      this[windowSymbol].fetch(src)
        .then(res => {
          if (res.status >= 200 && res.status < 300) {
            return res.arrayBuffer();
          } else {
            return Promise.reject(new Error(`audio src got invalid status code (url: ${JSON.stringify(src)}, code: ${res.status})`));
          }
        })
        .then(arrayBuffer => {
          try {
            this.audio.load(arrayBuffer);
          } catch(err) {
            throw new Error(`failed to decode audio: ${err.message} (url: ${JSON.stringify(src)}, size: ${arrayBuffer.byteLength})`);
          }
        })
        .then(() => {
          this.emit('canplay');
          this.emit('canplaythrough');
        })
        .catch(err => {
          this.emit('error', err);
        });
    }

    play() {
      this.audio.play();
    }

    pause() {
      this.audio.pause();
    }

    get currentTime() {
      return this.audio && this.audio.currentTime;
    }
    set currentTime(currentTime) {
      if (this.audio) {
        this.audio.currentTime = currentTime;
      }
    }

    get duration() {
      return this.audio && this.audio.duration;
    }
    set duration(duration) {
      if (this.audio) {
        this.audio.duration = duration;
      }
    }

    get oncanplay() {
      return _elementGetter(this, 'canplay');
    }
    set oncanplay(oncanplay) {
      _elementSetter(this, 'canplay', oncanplay);
    }

    get oncanplaythrough() {
      return _elementGetter(this, 'canplaythrough');
    }
    set oncanplaythrough(oncanplaythrough) {
      _elementSetter(this, 'canplaythrough', oncanplaythrough);
    }

    get onerror() {
      return _elementGetter(this, 'error');
    }
    set onerror(onerror) {
      _elementSetter(this, 'error', onerror);
    }
  };
  MicrophoneMediaStream = nativeAudio.MicrophoneMediaStream; */

  /* const {nativeVideo} = bindings;
  HTMLVideoElement = class extends HTMLMediaElement {
    constructor(attrs = [], value = '') {
      super('VIDEO', attrs, value);

      this._src = '';
      this.video = new nativeVideo.Video();
    }

    get src() {
      return this._src;
    }
    set src(src) {
      this._src = src;

      // const srcError = new Error();

      this[windowSymbol].fetch(src)
        .then(res => {
          if (res.status >= 200 && res.status < 300) {
            return res.arrayBuffer();
          } else {
            return Promise.reject(new Error(`video src got invalid status code (url: ${JSON.stringify(src)}, code: ${res.status})`));
          }
        })
        .then(arrayBuffer => {
          try {
            this.video.load(arrayBuffer);
          } catch(err) {
            throw new Error(`failed to decode video: ${err.message} (url: ${JSON.stringify(src)}, size: ${arrayBuffer.byteLength})`);
          }
        })
        .then(() => {
          this.emit('canplay');
          this.emit('canplaythrough');
        })
        .catch(err => {
          this.emit('error', err);
        });
    }

    get width() {
      return this.video.width;
    }
    set width(width) {
      this.video.width = width;
    }

    get height() {
      return this.video.height;
    }
    set height(height) {
      this.video.height = height;
    }
    
    get data() {
      return this.video.data;
    }
    set data(data) {}

    play() {
      this.video.play();
    }

    pause() {
      this.video.pause();
    }

    get currentTime() {
      return this.video && this.video.currentTime;
    }
    set currentTime(currentTime) {
      if (this.video) {
        this.video.currentTime = currentTime;
      }
    }

    get duration() {
      return this.video && this.video.duration;
    }
    set duration(duration) {
      if (this.video) {
        this.video.duration = duration;
      }
    }

    get oncanplay() {
      return _elementGetter(this, 'canplay');
    }
    set oncanplay(oncanplay) {
      _elementSetter(this, 'canplay', oncanplay);
    }

    get oncanplaythrough() {
      return _elementGetter(this, 'canplaythrough');
    }
    set oncanplaythrough(oncanplaythrough) {
      _elementSetter(this, 'canplaythrough', oncanplaythrough);
    }

    get onerror() {
      return _elementGetter(this, 'error');
    }
    set onerror(onerror) {
      _elementSetter(this, 'error', onerror);
    }
  }; */

  nativeVr = bindings.nativeVr;

  nativeWindow = bindings.nativeWindow;
};
module.exports = exokit;

if (require.main === module) {
  if (process.argv.length === 3) {
    exokit.fetch(process.argv[2]);
  }
}
