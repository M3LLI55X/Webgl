
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

function main() {
  var canvas = document.getElementById('webgl');
  var gl = getWebGLContext(canvas);
  initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  var n = initVertexBuffers(gl);
  gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
  gl.enable(gl.DEPTH_TEST);

  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');

  var viewProjMatrix = new Matrix4();
  viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0);
  viewProjMatrix.lookAt(2.0, 2.0, 5.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

  var currentAngle = [0.0, 0.0];
  initEventHandlers(canvas, currentAngle);

  var tick = function () {
    draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle);
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

var g_MvpMatrix = new Matrix4(); 
function draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle) {
  g_MvpMatrix.set(viewProjMatrix);
  g_MvpMatrix.rotate(currentAngle[0], 1.0, 0.0, 0.0); //  x-axis
  g_MvpMatrix.rotate(currentAngle[1], 0.0, 1.0, 0.0); //  y-axis
  gl.uniformMatrix4fv(u_MvpMatrix, false, g_MvpMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

function initEventHandlers(canvas, currentAngle) {
  var dragging = false;         
  var lastX = -1, lastY = -1;   

  canvas.onmousedown = function (ev) {   
    var x = ev.clientX, y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
      lastX = x; lastY = y;
      dragging = true;
    }
  };

  canvas.onmouseup = function (ev) { dragging = false; }; 

  canvas.onmousemove = function (ev) { //move
    var x = ev.clientX, y = ev.clientY;
    if (dragging) {
      var factor = 100 / canvas.height; // The rotation ratio
      var dx = factor * (x - lastX);
      var dy = factor * (y - lastY);
      currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
      currentAngle[1] = currentAngle[1] + dx;
    }
    lastX = x, lastY = y;
  };
}

function initVertexBuffers(gl) {

  var vertices = new Float32Array([   // Vertex 
    0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,    // v0-v1-v2-v3 front
    0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,    // v0-v3-v4-v5 right
    0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5,    // v0-v5-v6-v1 up
    -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,    // v1-v6-v7-v2 left
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,    // v7-v4-v3-v2 down
    0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5    // v4-v7-v6-v5 back
  ]);

  var colors = new Float32Array([     // Colors
    1.0, 0.4, 0.5, 1.0, 0.5, 0.1, 1.0, 0.5, 0.5, 1.0, 0.5, 0.1,  // v0-v1-v2-v3 front
    1.0, 0.4, 0.5, 1.0, 0.5, 0.1, 1.0, 0.5, 0.5, 1.0, 0.5, 0.1,  // v0-v3-v4-v5 right
    1.0, 0.4, 0.5, 1.0, 0.5, 0.1, 1.0, 0.5, 0.5, 1.0, 0.5, 0.1,  // v0-v5-v6-v1 up
    1.0, 0.4, 0.5, 1.0, 0.5, 0.1, 1.0, 0.5, 0.5, 1.0, 0.5, 0.1,  // v1-v6-v7-v2 left
    1.0, 0.4, 0.5, 1.0, 0.5, 0.1, 1.0, 0.5, 0.5, 1.0, 0.5, 0.1,  // v7-v4-v3-v2 down
    1.0, 0.4, 0.5, 1.0, 0.5, 0.1, 1.0, 0.5, 0.5, 1.0, 0.5, 0.1,   // v4-v7-v6-v5 back
  ]);

  var indices = new Uint8Array([       
    0, 1, 2, 0, 2, 3,    // front
    4, 5, 6, 4, 6, 7,    // right
    8, 9, 10, 8, 10, 11,    // up
    12, 13, 14, 12, 14, 15,    // left
    16, 17, 18, 16, 18, 19,    // down
    20, 21, 22, 20, 22, 23     // back
  ]);

  var indexBuffer = gl.createBuffer();
  initArrayBuffer(gl, vertices, 3, gl.FLOAT, 'a_Position');
  initArrayBuffer(gl, colors, 3, gl.FLOAT, 'a_Color');
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBuffer(gl, data, num, type, attribute) {
  
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  
  gl.enableVertexAttribArray(a_attribute);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return true;
}
