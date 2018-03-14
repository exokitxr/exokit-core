const events = require('events');
const {EventEmitter} = events;
const stream = require('stream');
const path = require('path');
const fs = require('fs');
const url = require('url');
const {URL} = url;
const {performance} = require('perf_hooks');

const parseIntStrict = require('parse-int');
const parse5 = require('parse5');

const fetch = require('window-fetch');
const {XMLHttpRequest} = require('window-xhr');
const XHRUtils = require('window-xhr/lib/utils');
const {Response, Blob} = fetch;
const WebSocket = require('ws/lib/websocket');
const {LocalStorage} = require('node-localstorage');
const createMemoryHistory = require('history/createMemoryHistory').default;
const ClassList = require('classlist');
const selector = require('selector-lite');
const windowEval = require('window-eval-native');
const THREE = require('./lib/three-min.js');

const windowSymbol = Symbol();
const htmlTagsSymbol = Symbol();
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

const redirectUrls = {};

XHRUtils.createClient = (createClient => function() {
  const properties = arguments[0];
  if (properties._responseFn) {
    const cb = arguments[2];
    properties._responseFn(cb);
    return {
      on() {},
      setHeader() {},
      write() {},
      end() {},
    };
  } else {
    return createClient.apply(this, arguments);
  }
})(XHRUtils.createClient);

class Location extends EventEmitter {
  constructor(u) {
    super();

    this._url = new url.URL(u);
  }
  // triggers navigation
  get href() { return this._url.href; }
  set href(href) { this._url.href = href; this.update(); }
  get protocol() { return this._url.protocol; }
  set protocol(protocol) { this._url.protocol = protocol; this.update(); }
  get host() { return this._url.host; }
  set host(host) { this._url.host = host; this.update(); }
  get hostname() { return this._url.hostname; }
  set hostname(hostname) { this._url.hostname = hostname; this.update(); }
  get port() { return this._url.port; }
  set port(port) { this._url.port = port; this.update(); }
  get pathname() { return this._url.pathname; }
  set pathname(pathname) { this._url.pathname = pathname; this.update(); }
  get search() { return this._url.search; }
  set search(search) { this._url.search = search; this.update(); }
  // does not trigger navigation
  get hash() { return this._url.hash; }
  set hash(hash) { this._url.hash = hash; }
  get username() { return this._url.username; }
  set username(username) { this._url.username = username; }
  get password() { return this._url.password; }
  set password(password) { this._url.password = password; }
  get origin() { return this._url.origin; }
  set origin(origin) {} // read only
  // helpers
  set(u) {
    this._url.href = u;
  }
  update() {
    this.emit('update', this.href);
  }
}
class History extends EventEmitter {
  constructor(u) {
    super();

    this._history = createMemoryHistory({
      initialEntries: [u],
    });
    this._history.listen((location, action) => {
      if (action === 'POP') {
        const {pathname, search, hash, state} = location;
        this.emit('popstate', url.format({
          pathname,
          search,
          hash,
        }), state);
      }
    });
  }
  back(n) {
    this._history.goBack(n);
  }
  forward(n) {
    this._history.goForward(n);
  }
  go(n) {
    this._history.go(n);
  }
  pushState(state, title, url) {
    this._history.push(url, state);
  }
  replaceState(state, title, url) {
    this._history.replace(url, state);
  }
  get length() {
    return this._history.length;
  }
  set length(length) {}
  get state() {
    return this._history.location.state;
  }
  set state(state) {}
}

class Event {
  constructor(type, init = {}) {
    this.type = type;
    this.defaultPrevented = false;
    this.propagationStopped = false;

    this.target = init.target ? init.target : null;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  stopPropagation() {
    this.propagationStopped = true;
  }
}
class KeyboardEvent extends Event {
  constructor(type, init = {}) {
    super(type, init);

    this.key = init.key !== undefined ? init.key : '';
    this.code = init.code !== undefined ? init.code : '';
    this.location = init.location !== undefined ? init.location : 0;
    this.ctrlKey = init.ctrlKey !== undefined ? init.ctrlKey : false;
    this.shiftKey = init.shiftKey !== undefined ? init.shiftKey : false;
    this.altKey = init.altKey !== undefined ? init.altKey : false;
    this.metaKey = init.metaKey !== undefined ? init.metaKey : false;
    this.repeat = init.repeat !== undefined ? init.repeat : false;
    this.isComposing = init.isComposing !== undefined ? init.isComposing : false;
    this.charCode = init.charCode !== undefined ? init.charCode : 0;
    this.keyCode = init.keyCode !== undefined ? init.keyCode : 0;
    this.which = init.which !== undefined ? init.which : 0;
  }
}
class MouseEvent extends Event {
  constructor(type, init = {}) {
    super(type);

    this.screenX = init.screenX !== undefined ? init.screenX : 0;
    this.screenY = init.screenY !== undefined ? init.screenY : 0;
    this.clientX = init.clientX !== undefined ? init.clientX : 0;
    this.clientY = init.clientY !== undefined ? init.clientY : 0;
    this.movementX = init.movementX !== undefined ? init.movementX : 0;
    this.movementY = init.movementY !== undefined ? init.movementY : 0;
    this.ctrlKey = init.ctrlKey !== undefined ? init.ctrlKey : false;
    this.shiftKey = init.shiftKey !== undefined ? init.shiftKey : false;
    this.altKey = init.altKey !== undefined ? init.altKey : false;
    this.metaKey = init.metaKey !== undefined ? init.metaKey : false;
    this.button = init.button !== undefined ? init.button : 0;
    this.relatedTarget = init.relatedTarget !== undefined ? init.relatedTarget : null;
    this.region = init.region !== undefined ? init.region : null;
  }
}
class MessageEvent extends Event {
  constructor(data) {
    super('message');

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
class CanvasGradient {}
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

class DOMRect {
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.left = w >= 0 ? x : x + w;
    this.top = h >= 0 ? y : y + h;
    this.right = w >= 0 ? x + w : x;
    this.bottom = h >= 0 ? y + h : y;
  }
}

class Node extends EventEmitter {
  constructor(nodeName = null) {
    super();

    this.nodeName = nodeName;
    this.parentNode = null;
    this.ownerDocument = null;
  }

  get nextSibling() {
    if (this.parentNode) {
      const selfIndex = this.parentNode.childNodes.indexOf(this);
      const nextIndex = selfIndex + 1;
      if (nextIndex < this.parentNode.childNodes.length) {
        return this.parentNode.childNodes[nextIndex];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  set nextSibling(nextSibling) {}
  get previousSibling() {
    if (this.parentNode) {
      const selfIndex = this.parentNode.childNodes.indexOf(this);
      const prevIndex = selfIndex - 1;
      if (prevIndex >= 0) {
        return this.parentNode.childNodes[prevIndex];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  set previousSibling(previousSibling) {}

  get nextElementSibling() {
    if (this.parentNode) {
      const selfIndex = this.parentNode.childNodes.indexOf(this);
      for (let i = selfIndex + 1; i < this.parentNode.childNodes.length; i++) {
        const childNode = this.parentNode.childNodes[i];
        if (childNode.nodeType === Node.ELEMENT_NODE) {
          return childNode;
        }
      }
      return null;
    } else {
      return null;
    }
  }
  set nextElementSibling(nextElementSibling) {}
  get previousElementSibling() {
    if (this.parentNode) {
      const selfIndex = this.parentNode.childNodes.indexOf(this);
      for (let i = selfIndex - 1; i >= 0; i--) {
        const childNode = this.parentNode.childNodes[i];
        if (childNode.nodeType === Node.ELEMENT_NODE) {
          return childNode;
        }
      }
      return null;
    } else {
      return null;
    }
  }
  set previousElementSibling(previousElementSibling) {}
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
  deleteProperty(target, prop) {
    const index = target.findIndex(attr => attr.name === prop);
    if (index !== -1) {
      target.splice(index, 1);
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
const autoClosingTags = {
  area: true,
  base: true,
  br: true,
  embed: true,
  hr: true,
  iframe: true,
  img: true,
  input: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  window: true,
};
class HTMLElement extends Node {
  constructor(tagName = 'DIV', attrs = [], value = '', location = null) {
    super(null);

    this.tagName = tagName;
    this.attrs = attrs;
    this.value = value;
    this.location = location;

    this._attributes = null;
    this.childNodes = [];
    this._innerHTML = '';
    this._classList = null;
  }

  get nodeType() {
    return Node.ELEMENT_NODE;
  }
  set nodeType(nodeType) {}

  get attributes() {
    if (!this._attributes) {
      this._attributes = _makeAttributesProxy(this.attrs);
    }
    return this._attributes;
  }
  set attributes(attributes) {}

  get classList() {
    if (!this._classList) {
      this._classList = new ClassList(this);
    }
    return this._classList;
  }
  set classList(classList) {}

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
  removeAttribute(name) {
    const oldValue = this.attributes[name];
    delete this.attributes[name];

    this.emit('attribute', name, null, oldValue);
  }

  appendChild(childNode) {
    if (childNode.parentNode) {
      childNode.parentNode.removeChild(childNode);
    }

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

  get firstChild() {
    return this.childNodes.length > 0 ? this.childNodes[0] : null;
  }
  set firstChild(firstChild) {}
  get lastChild() {
    return this.childNodes.length > 0 ? this.childNodes[this.childNodes.length - 1] : null;
  }
  set lastChild(lastChild) {}

  get firstElementChild() {
    for (let i = 0; i < this.childNodes.length; i++) {
      const childNode = this.childNodes[i];
      if (childNode.nodeType === Node.ELEMENT_NODE) {
        return childNode;
      }
    }
    return null;
  }
  set firstElementChild(firstElementChild) {}
  get lastElementChild() {
    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      const childNode = this.childNodes[i];
      if (childNode.nodeType === Node.ELEMENT_NODE) {
        return childNode;
      }
    }
    return null;
  }
  set lastElementChild(lastElementChild) {}

  get id() {
    return this.attributes['id'] || '';
  }
  set id(id) {
    id = id + '';
    this.attributes['id'] = id;
  }

  get className() {
    return this.attributes['class'] || '';
  }
  set className(className) {
    className = className + '';
    this.attributes['class'] = className;
  }

  getElementById(id) {
    id = id + '';
    return selector.find(this, '#' + id, true);
  }
  getElementByClassName(className) {
    className = className + '';
    return selector.find(this, '.' + className, true);
  }
  getElementByTagName(tagName) {
    tagName = tagName + '';
    return selector.find(this, tagName, true);
  }
  querySelector(s) {
    s = s + '';
    return selector.find(this, s, true);
  }
  getElementsById(id) {
    id = id + '';
    return selector.find(this, '#' + id);
  }
  getElementsByClassName(className) {
    className = className + '';
    return selector.find(this, '.' + className);
  }
  getElementsByTagName(tagName) {
    tagName = tagName + '';
    return selector.find(this, tagName);
  }
  querySelectorAll(s) {
    s = s + '';
    return selector.find(this, s);
  }
  matches(s) {
    s = s + '';
    return selector.matches(this, s);
  }

  dispatchEvent(event) {
    this.emit(event.type, event);

    if (!event.propagationStopped && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }
  }

  getBoundingClientRect() {
    return new DOMRect();
  }

  focus() {
    const document = this.ownerDocument;
    document.activeElement.dispatchEvent(new Event('blur', {
      target: document.activeElement,
    }));

    document.activeElement = this;
    this.dispatchEvent(new Event('focus', {
      target: this,
    }));
  }

  blur() {
    const document = this.ownerDocument;
    if (document.activeElement !== document.body) {
      document.body.focus();
    }
  }

  click() {
    this.dispatchEvent(new MouseEvent('click'));
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
    innerHTML = innerHTML + '';
    const oldChildNodes = this.childNodes;
    const newChildNodes = parse5.parseFragment(innerHTML, {
      locationInfo: true,
    }).childNodes.map(childNode => _fromAST(childNode, this.ownerDocument.defaultView, this, this.ownerDocument));
    this.childNodes = newChildNodes;

    if (oldChildNodes.length > 0) {
      this.emit('children', [], oldChildNodes, null, null);
    }
    if (newChildNodes.length > 0) {
      this.emit('children', newChildNodes, [], null, null);
    }

    _promiseSerial(newChildNodes.map(childNode => () => _runHtml(childNode, this.ownerDocument.defaultView)))
      .catch(err => {
        console.warn(err);
      });

    this.emit('innerHTML', innerHTML);
  }

  get textContent() {
    let result = '';
    const _recurse = el => {
      if (el.nodeType === Node.TEXT_NODE) {
        result += el.value;
      } else if (el.childNodes) {
        for (let i = 0; i < el.childNodes.length; i++) {
          _recurse(el.childNodes[i]);
        }
      }
    };
    _recurse(this);
    return result;
  }
  set textContent(textContent) {
    textContent = textContent + '';

    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[this.childNodes.length - 1]);
    }
    this.appendChild(new Text(textContent));
  }

  requestPointerLock() {
    const document = this.ownerDocument;

    if (document.pointerLockElement === null) {
      document.pointerLockElement = this;

      process.nextTick(() => {
        document.emit('pointerlockchange');
      });
    }
  }
  exitPointerLock() {
    const document = this.ownerDocument;

    if (document.pointerLockElement !== null) {
      document.pointerLockElement = null;

      process.nextTick(() => {
        document.emit('pointerlockchange');
      });
    }
  }

  inspect() {
    const _getIndent = depth => Array(depth*2 + 1).join(' ');
    const _recurse = (el, depth = 0) => {
      let result = '';
      if (el.tagName) {
        const tagName = el.tagName.toLowerCase();
        const indent = _getIndent(depth);
        const isAutoClosingTag = autoClosingTags[tagName];

        result += indent;
        result += '<' + tagName;
        for (let i = 0; i < el.attrs.length; i++) {
          const attr = el.attrs[i];
          result += ' ' + attr.name + '=' + JSON.stringify(attr.value);
        }
        if (isAutoClosingTag) {
          result += '/';
        }
        result += '>';

        if (!isAutoClosingTag) {
          let childrenResult = '';
          for (let i = 0; i < el.childNodes.length; i++) {
            const childResult = _recurse(el.childNodes[i], depth + 1);
            if (childResult && !childrenResult) {
              childrenResult += '\n';
            }
            childrenResult += childResult;
          }
          if (childrenResult) {
            result += childrenResult;
            result += indent;
          }
          result += '</' + tagName + '>';
        }
        if (depth !== 0) {
          result += '\n';
        }
      } else if (el.constructor.name === 'Text' && /\S/.test(el.value)) {
        result += _getIndent(depth);
        result += el.value;
        if (depth !== 0) {
          result += '\n';
        }
      } else if (el.constructor.name === 'Comment') {
        result += _getIndent(depth);
        result += '<!--' + el.value + '-->';
        if (depth !== 0) {
          result += '\n';
        }
      }
      return result;
    };
    return _recurse(this);
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
}
class HTMLAnchorElement extends HTMLElement {
  constructor(attrs = [], value = '', location = null) {
    super('A', attrs, value, location);
  }

  get href() {
    return this.getAttribute('href') || '';
  }
  set href(value) {
    this.setAttribute('href', value);
  }
}
class HTMLLoadableElement extends HTMLElement {
  constructor(tagName, attrs = [], value = '', location = null) {
    super(tagName, attrs, value, location);
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

  get onpopstate() {
    return _elementGetter(this, 'popstate');
  }
  set onpopstate(onpopstate) {
    _elementSetter(this, 'popstate', onpopstate);
  }
}
class HTMLDocumentElement extends HTMLLoadableElement {
  constructor() {
    super('DOCUMENT');
  }
}
class HTMLScriptElement extends HTMLLoadableElement {
  constructor(attrs = [], value = '', location = null) {
    super('SCRIPT', attrs, value, location);

    this.readyState = null;

    this.on('attribute', (name, value) => {
      if (name === 'src' && this.isRunnable()) {
        this.readyState = null;

        const url = value;
        this.ownerDocument.defaultView.fetch(url)
          .then(res => {
            if (res.status >= 200 && res.status < 300) {
              return res.text();
            } else {
              return Promise.reject(new Error('script src got invalid status code: ' + res.status + ' : ' + url));
            }
          })
          .then(jsString => {
            _runJavascript(jsString, this.ownerDocument.defaultView, url);

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
      if (this.isRunnable()) {
        const window = this.ownerDocument.defaultView;
        _runJavascript(innerHTML, window, window.location.href, this.location.line !== null ? this.location.line - 1 : 0, this.location.col !== null ? this.location.col - 1 : 0);

        this.readyState = 'complete';

        process.nextTick(() => {
          this.emit('load');
        });
      }
    });
  }

  get src() {
    return this.getAttribute('src') || '';
  }
  set src(value) {
    this.setAttribute('src', value);
  }

  get type() {
    return this.getAttribute('type') || '';
  }
  set type(value) {
    this.setAttribute('type', value);
  }

  set innerHTML(innerHTML) {
    this.emit('innerHTML', innerHTML);
  }

  isRunnable() {
    const {type} = this;
    return !type || /^(?:(?:text|application)\/javascript|application\/ecmascript)$/.test(type);
  }

  run() {
    if (this.isRunnable()) {
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
    } else {
      return false;
    }
  }
}
class HTMLSrcableElement extends HTMLLoadableElement {
  constructor(tagName = null, attrs = [], value = '', location = null) {
    super(tagName, attrs, value, location);
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
  constructor(tagName = null, attrs = [], value = '', location = null) {
    super(tagName, attrs, value, location);

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
  constructor(attrs = [], value = '', location = null) {
    super('IMG', attrs, value, location);

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
  constructor(attrs = [], value = '', location = null) {
    super('AUDIO', attrs, value, location);

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
  constructor(attrs = [], value = '', location = null) {
    super('VIDEO', attrs, value, location);

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
  constructor(attrs = [], value = '', location = null) {
    super('IFRAME', attrs, value, location);

    this.contentWindow = null;
    this.contentDocument = null;

    this.on('attribute', (name, value) => {
      if (name === 'src') {
        const url = value;
        this.ownerDocument.defaultView.fetch(url)
          .then(res => {
            if (res.status >= 200 && res.status < 300) {
              return res.text();
            } else {
              return Promise.reject(new Error('iframe src got invalid status code: ' + res.status + ' : ' + url));
            }
          })
          .then(htmlString => {
            const parentWindow = this.ownerDocument.defaultView;
            this.contentWindow = _parseWindow('', parentWindow[optionsSymbol], parentWindow, parentWindow.top);
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
  }
}
const defaultCanvasSize = [1280, 1024];
class HTMLCanvasElement extends HTMLElement {
  constructor(attrs = [], value = '', location = null) {
    super('CANVAS', attrs, value, location);

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
     return this.getAttribute('width') || defaultCanvasSize[0];
  }
  set width(value) {
    if (typeof value === 'number' && isFinite(value)) {
      this.setAttribute('width', value);
    }
  }

  get height() {
    return this.getAttribute('height') || defaultCanvasSize[1];
  }
  set height(value) {
    if (typeof value === 'number' && isFinite(value)) {
      this.setAttribute('height', value);
    }
  }

  getBoundingClientRect() {
    return new DOMRect(0, 0, this.width, this.height);
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
        this._context = new WebGLContext(this);
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
class Text extends Node {
  constructor(value) {
    super('#text');

    this.value = value;
  }

  get nodeType() {
    return Node.TEXT_NODE;
  }
  set nodeType(nodeType) {}

  get firstChild() {
    return null;
  }
  set firstChild(firstChild) {}
  get lastChild() {
    return null;
  }
  set lastChild(lastChild) {}

  inspect() {
    return JSON.stringify(this.value);
  }
}
class Comment extends Node {
  constructor(value) {
    super('#comment');

    this.value = value;
  }

  get nodeType() {
    return Node.COMMENT_NODE;
  }
  set nodeType(nodeType) {}

  get firstChild() {
    return null;
  }
  set firstChild(firstChild) {}
  get lastChild() {
    return null;
  }
  set lastChild(lastChild) {}

  inspect() {
    return `<!--${this.value}-->`;
  }
}

const _fromAST = (node, window, parentNode = null, ownerDocument = null) => {
  if (node.nodeName === '#text') {
    const text = new Text(node.value);
    text.parentNode = parentNode;
    text.ownerDocument = ownerDocument;
    return text;
  } else if (node.nodeName === '#comment') {
    const comment = new Comment(node.data);
    comment.parentNode = parentNode;
    comment.ownerDocument = ownerDocument;
    return comment;
  } else {
    const tagName = node.tagName && node.tagName.toUpperCase();
    const {attrs, value, __location} = node;
    const HTMLElementTemplate = window[htmlTagsSymbol][tagName];
    const location = __location ? {
      line: __location.line,
      col: __location.col,
    } : null;
    const element = HTMLElementTemplate ?
      new HTMLElementTemplate(
        attrs,
        value,
        location,
      )
    :
      new HTMLElement(
        tagName,
        attrs,
        value,
        location,
      );
    element.parentNode = parentNode;
    if (!ownerDocument) { // if there is no owner document, it's us
      ownerDocument = element;
      ownerDocument.defaultView = window;
    }
    element.ownerDocument = ownerDocument;
    if (node.childNodes) {
      element.childNodes = node.childNodes.map(childNode => _fromAST(childNode, window, element, ownerDocument));
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
  const load = () => {
    _cleanup();
    accept();
  };
  const error = err => {
    _cleanup();
    reject(err);
  };
  const _cleanup = () => {
    el.removeListener('load', load);
    el.removeListener('error', error);
  };
  el.on('load', load);
  el.on('error', error);
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
const _runJavascript = (jsString, window, filename = 'script', lineOffset = 0, colOffset = 0) => {
  try {
    windowEval(jsString, window, filename, lineOffset, colOffset);
  } catch (err) {
    console.warn(err.stack);
  }
};

const rafCbs = [];
const requestAnimationFrame = fn => {
  rafCbs.push(fn);
  return fn;
};
const cancelAnimationFrame = fn => {
  const index = rafCbs.indexOf(fn);
  if (index !== -1) {
    rafCbs.splice(index, 1);
  }
};
const tickAnimationFrame = () => {
  const localRafCbs = rafCbs.slice();
  rafCbs.length = 0;
  for (let i = 0; i < localRafCbs.length; i++) {
    localRafCbs[i]();
  }
};

const _makeWindow = (options = {}, parent = null, top = null) => {
  const _normalizeUrl = src => {
    if (!/^[a-z]+:\/\//i.test(src)) {
      src = new URL(src, options.baseUrl).href;
    }
    return src;
  };

  const window = new HTMLWindowElement();
  window.window = window;
  window.self = window;
  window.parent = parent || window;
  window.top = top || window;
  window.innerWidth = 1280;
  window.innerHeight = 1024;
  window.devicePixelRatio = 1;
  window.document = null;
  window.location = new Location(options.url);
  window.history = new History(window.location.href);
  window.history.on('popstate', (u, state) => {
    window.location.set(u);

    const event = new Event('popstate');
    event.state = state;
    window.dispatchEvent(event);
  });
  let loading = false;
  window.location.on('update', href => {
    if (!loading) {
      exokit.load(href)
        .then(newWindow => {
          window.emit('beforeunload');
          window.emit('unload');
          window.emit('navigate', newWindow);
        })
        .catch(err => {
          loading = false;
          window.emit('error', {
            error: err,
          });
        });
      loading = true;
    }
  });

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
    mediaDevices: {
      getUserMedia(constraints) {
        if (constraints.audio) {
          return Promise.resolve(new MicrophoneMediaStream());
        } else {
          return Promise.reject(new Error('constraints not met'));
        }
      },
    },
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
  window.URL = URL;
  window.console = console;
  window.setTimeout = setTimeout;
  window.clearTimeout = clearTimeout;
  window.setInterval = setInterval;
  window.clearInterval = clearInterval;
  window.performance = performance;
  const HTMLImageElementBound = (Old => class HTMLImageElement extends Old {
    constructor() {
      super(...arguments);

      this.ownerDocument = window.document; // need to set owner document here because HTMLImageElement can be manually constructed via new Image()
    }
  })(HTMLImageElement);
  window[htmlTagsSymbol] = {
    DOCUMENT: HTMLDocumentElement,
    A: HTMLAnchorElement,
    SCRIPT: HTMLScriptElement,
    IMG: HTMLImageElementBound,
    AUDIO: HTMLAudioElement,
    VIDEO: HTMLVideoElement,
    IFRAME: HTMLIframeElement,
    CANVAS: HTMLCanvasElement,
  };
  window[optionsSymbol] = options;
  window.HTMLElement = HTMLElement;
  window.HTMLAnchorElement = HTMLAnchorElement;
  window.HTMLScriptElement = HTMLScriptElement;
  window.HTMLImageElement = HTMLImageElementBound;
  window.HTMLAudioElement = HTMLAudioElement;
  window.HTMLVideoElement = HTMLVideoElement;
  window.HTMLIframeElement = HTMLIframeElement;
  window.HTMLCanvasElement = HTMLCanvasElement;
  window.getComputedStyle = () => ({});
  window.Event = Event;
  window.KeyboardEvent = KeyboardEvent;
  window.MouseEvent = MouseEvent;
  window.MessageEvent = MessageEvent;
  window.MutationObserver = MutationObserver;
  window.Node = Node;
  window.Text = Text;
  window.Comment = Comment;
  window.Image = HTMLImageElementBound;
  window.ImageData = ImageData;
  window.ImageBitmap = ImageBitmap;
  window.Path2D = Path2D;
  window.CanvasGradient = CanvasGradient;
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
      url = _normalizeUrl(url);
      if (redirectUrls[url]) {
        url = redirectUrls[url];
      }
      const match = url.match(/^file:\/\/(.*)$/);
      if (match) {
        return new Promise((accept, reject) => {
          fs.readFile(match[1], (err, data) => {
            if (!err) {
              accept(new Response(new Blob([data])));
            } else {
              reject(err);
            }
          });
        });
      } else {
        return fetch(url, options);
      }
    }
  };
  window.redirect = (url1, url2) => {
    redirectUrls[url1] = url2;
  };
  window.XMLHttpRequest = (Old => class XMLHttpRequest extends Old {
    open() {
      const blob = urls.get(url);
      if (blob) {
        this._properties._responseFn = cb => {
          process.nextTick(() => {
            const {buffer} = blob;
            const response = new stream.PassThrough();
            response.statusCode = 200;
            response.headers = {
              'content-length': buffer.length + '',
            };
            cb(response);
          });
        };
      } else {
        arguments[1] = _normalizeUrl(arguments[1]);
        if (redirectUrls[arguments[1]]) {
          arguments[1] = redirectUrls[arguments[1]];
        }
        const match = arguments[1].match(/^file:\/\/(.*)$/);
        if (match) {
          const p = match[1];
          this._properties._responseFn = cb => {
            fs.lstat(p, (err, stats) => {
              if (!err) {
                const response = fs.createReadStream(p);
                response.statusCode = 200;
                response.headers = {
                  'content-length': stats.size + '',
                };
                cb(response);
              } else if (err.code === 'ENOENT') {
                const response = new stream.PassThrough();
                response.statusCode = 404;
                response.headers = {};
                response.end('file not found: ' + p);
                cb(response);
              } else {
                const response = new stream.PassThrough();
                response.statusCode = 500;
                response.headers = {};
                response.end(err.stack);
                cb(response);
              }
            });
          };
          arguments[1] = 'http://127.0.0.1/'; // needed to pass protocol check, will not be fetched
        }
      }

      return Old.prototype.open.apply(this, arguments);
    }
  })(XMLHttpRequest);
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
  window.createImageBitmap = function() {
    return Promise.resolve(ImageBitmap.createImageBitmap.apply(ImageBitmap, arguments));
  };
  window.requestAnimationFrame = requestAnimationFrame;
  window.cancelAnimationFrame = cancelAnimationFrame;

  if (!parent) {
    window.tickAnimationFrame = tickAnimationFrame;
    window.updateVrFrame = update => {
      window.emit('updatevrframe', update);
    };
    window.updateArFrame = (viewMatrix, projectionMatrix) => {
      window.emit('updatearframe', viewMatrix, projectionMatrix);
    };
  } else {
    parent.on('updatevrframe', update => { // XXX clean up listeners on window destroy
      window.emit('updatevrframe', update);
    });
    parent.on('updatearframe', update => {
      window.emit('updatearframe', update);
    });
  }
  return window;
};
const _parseDocument = (s, options, window) => {
  const documentAst = parse5.parse(s, {
    locationInfo: true,
  });
  documentAst.tagName = 'document';
  const document = _fromAST(documentAst, window);
  const html = document.childNodes.find(element => element.tagName === 'HTML');
  const head = html.childNodes.find(element => element.tagName === 'HEAD');
  const body = html.childNodes.find(element => element.tagName === 'BODY');

  document.documentElement = document;
  document.readyState = null;
  document.head = head;
  document.body = body;
  document.location = url.parse(options.url, {
    locationInfo: true,
  });
  document.createElement = tagName => {
    tagName = tagName.toUpperCase();
    const HTMLElementTemplate = window[htmlTagsSymbol][tagName];
    const element = HTMLElementTemplate ? new HTMLElementTemplate() : new HTMLElement(tagName);
    element.ownerDocument = document;
    return element;
  };
  document.createElementNS = (namespace, tagName) => document.createElement(tagName);
  document.createDocumentFragment = () => document.createElement();
  document.createTextNode = text => new Text(text);
  document.createComment = comment => new Comment(comment);
  document.styleSheets = [];
  document.activeElement = body;
  document.open = () => {
    document.innerHTML = '';
  };
  document.close = () => {};
  document.write = htmlString => {
    const childNodes = parse5.parseFragment(htmlString, {
      locationInfo: true,
    }).childNodes.map(childNode => _fromAST(childNode, window, document.body, document));
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
    document.emit('load');
    window.emit('load');
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
exokit.load = (src, options = {}) => fetch(src)
  .then(res => {
    if (res.status >= 200 && res.status < 300) {
      return res.text();
    } else {
      return Promise.reject(new Error('fetch got invalid status code: ' + res.status + ' : ' + src));
    }
  })
  .then(htmlString => {
    const parsedUrl = url.parse(src, {
      locationInfo: true,
    });
    return exokit(htmlString, {
      url: options.url || src,
      baseUrl: options.baseUrl || url.format({
        protocol: parsedUrl.protocol || 'http:',
        host: parsedUrl.host || '127.0.0.1',
        pathname: parsedUrl.pathname,
        search: parsedUrl.search,
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
  CanvasGradient = bindings.nativeCanvasGradient;
  CanvasRenderingContext2D = bindings.nativeCanvasRenderingContext2D;
  WebGLContext = bindings.nativeGl;
  /* WebGLContext = function WebGLContext() {
    return new Proxy(Reflect.construct(bindings.nativeGl, arguments), {
      get(target, propKey, receiver) {
        const orig = target[propKey];
        if (typeof orig === 'function') {
          return function() {
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

      this.ownerDocument.defaultView.fetch(src)
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

    getBoundingClientRect() {
      return new DOMRect(0, 0, this.width, this.height);
    }

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

      this.ownerDocument.defaultView.fetch(src)
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

      this.ownerDocument.defaultView.fetch(src)
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

    getBoundingClientRect() {
      return new DOMRect(0, 0, this.width, this.height);
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
};
module.exports = exokit;

if (require.main === module) {
  if (process.argv.length === 3) {
    exokit.load(process.argv[2]);
  }
}
