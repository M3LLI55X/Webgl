var canvas;
var gl;
var teapotProgram, groundProgram;

var ground_modelViewLoc, ground_perspectiveLoc;
var teapot_modelViewLoc, teapot_visibleLoc, teapot_perspectiveLoc;

var moveTeapot = true, lookDown = false, moveLight = true;
var lightX, lightY=3.5, lightZ;

var projectionMatrix = mat4(1);
projectionMatrix[3][1] = -1 / (lightY+1); 
projectionMatrix[3][3] = 0;

var teapotModel={}, groundModel={};
var g_objDoc, g_drawingInfo;

var groundQuad = [
  vec3(-2, -1, -1),
  vec3(-2, -1, -5),
  vec3(2, -1, -5),
  vec3(2, -1, -1)
];
var texCoords = [
  vec2(-1, -1),
  vec2(-1, 1),
  vec2(1, 1),
  vec2(1, -1)];

var indices = [0, 3, 2, 0, 2, 1];

window.onload = function init() {

  initScene();
  initTexture();

  var bt_moveTeapot = document.getElementById("moveTeapot");
  bt_moveTeapot.onchange = x => {
    moveTeapot = bt_moveTeapot.checked;
  };

  var bt_lookDown = document.getElementById("lookDown");
  bt_lookDown.onchange = x => {
    lookDown = bt_lookDown.checked;
  };

  var bt_moveLight = document.getElementById("moveLight");
  bt_moveLight.onchange = x => {
    moveLight = bt_moveLight.checked;
  };
  render();
}

function initTexture() {
  // image texture
  var image = document.createElement('img');

  var texture = gl.createTexture();
  image.crossorigin = 'anonymous';
  image.onload = e => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  };
  image.src = 'xamp23.png';
}

function render(time) {
  var t = time / 600;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  lightX = moveLight ? Math.sin(t) : 0;
  lightZ = moveLight ? -3 + Math.cos(t) : -3;

  gl.useProgram(groundProgram);
  initAttributeVariable(gl, groundProgram.position, groundModel.vertexBuffer, 3);
  initAttributeVariable(gl, groundProgram.texPosition, groundModel.texCoordsBuffer, 2);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundModel.indexBuffer);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

  var perspectiveMatrix = [
    perspective(90, 1, 1, 20),
    lookAt(lookDown ? vec3(0, 2, -2.99) : vec3(0, 0, 0), vec3(0, 0, -3), vec3(0, 1, 0)),
  ].reduce(mult);

  // Sets view
  gl.uniformMatrix4fv(ground_perspectiveLoc, false, flatten(perspectiveMatrix));
  gl.uniformMatrix4fv(ground_modelViewLoc, false, flatten(mat4()));
  gl.useProgram(teapotProgram);
  initAttributeVariable(gl, teapotProgram.position, teapotModel.vertexBuffer, 3);
  initAttributeVariable(gl, teapotProgram.color, teapotModel.colorBuffer, 4);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotModel.indexBuffer);

  if (!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
    g_drawingInfo = onReadComplete(gl, teapotModel, g_objDoc);
  }
  if (g_drawingInfo) {

    var moveY = moveTeapot ? 0.25 * Math.cos(t) : 0;
    var modelViewMatrix = [
      translate(0, moveY, -3),
      scalem(0.25, 0.25, 0.25),
    ].reduce(mult);

    var modelView = [
      translate(0, -0.001, 0),
      translate(lightX, lightY, lightZ),
      projectionMatrix,
      translate(-lightX, -lightY, -lightZ),
      modelViewMatrix
    ].reduce(mult);
    gl.uniformMatrix4fv(teapot_modelViewLoc, false, flatten(modelView));

    gl.uniform1f(teapot_visibleLoc, false);
    gl.depthFunc(gl.GREATER);
    gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);

    gl.uniformMatrix4fv(teapot_modelViewLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(teapot_perspectiveLoc, false, flatten(perspectiveMatrix));

    gl.depthFunc(gl.LESS);
    gl.uniform1f(teapot_visibleLoc, true);

    gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
  };

  requestAnimationFrame(render);
}

function initScene() {
  canvas = document.getElementById("c");

  gl = WebGLDebugUtils.makeDebugContext(canvas.getContext("webgl") );
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Init teapot shaders
  teapotProgram = initShaders(gl, "vertex-shader-teapot", "fragment-shader-teapot");
  gl.useProgram(teapotProgram);

  teapotProgram.position = gl.getAttribLocation(teapotProgram, 'vertex_position');
  teapotProgram.color    = gl.getAttribLocation(teapotProgram, 'vertex_color');
  teapotProgram.normal   = gl.getAttribLocation(teapotProgram, 'vertex_normal');

  teapotModel.vertexBuffer = createEmptyArrayBuffer(gl, teapotProgram.position, 3, gl.FLOAT);
  teapotModel.colorBuffer = createEmptyArrayBuffer(gl, teapotProgram.color, 4, gl.FLOAT);
  teapotModel.indexBuffer = gl.createBuffer();

  readOBJFile('teapot.obj', 1, false);

  // Init ground shaders
  groundProgram = initShaders(gl, "vertex-shader-ground", "fragment-shader-ground");
  gl.useProgram(groundProgram);

  groundProgram.position    = gl.getAttribLocation(groundProgram, 'vertex_position');
  groundProgram.texPosition = gl.getAttribLocation(groundProgram, 'texPosition');
  groundProgram.texture     = gl.getUniformLocation(groundProgram, 'texture');

  groundModel.vertexBuffer = createEmptyArrayBuffer(gl, groundProgram.position, 3, gl.FLOAT);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(groundQuad), gl.STATIC_DRAW);

  groundModel.texCoordsBuffer = createEmptyArrayBuffer(gl, groundProgram.texPosition, 2, gl.FLOAT);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

  groundModel.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundModel.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

  ground_perspectiveLoc = gl.getUniformLocation(groundProgram, 'perspective');
  ground_modelViewLoc = gl.getUniformLocation(groundProgram, 'modelView');

  teapot_modelViewLoc = gl.getUniformLocation(teapotProgram, 'modelView');
  teapot_visibleLoc = gl.getUniformLocation(teapotProgram, 'visible');
  teapot_perspectiveLoc = gl.getUniformLocation(teapotProgram, 'perspectiveMatrix');
}
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
  return buffer;
}

function initAttributeVariable(gl, a_attribute, buffer, num) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, num, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}
async function readOBJFile(fileName, scale, reverse) {
  fetch(fileName).then(x => x.text()).then(x => {
    onReadOBJFile(x, fileName, scale, reverse);
  }).catch(err => console.log(err));
}
function onReadOBJFile(fileString, fileName, scale, reverse) {
  var objDoc = new OBJDoc(fileName); // Create a OBJDoc object
  var result = objDoc.parse(fileString, scale, reverse);

  if (!result) {
    g_objDoc = null;
    g_drawingInfo = null;
  } else {
    g_objDoc = objDoc;
  }
}
function onReadComplete(gl, model, objDoc) {

  var drawingInfo = objDoc.getDrawingInfo();
  
  gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

  return drawingInfo;
}


