
/*Creating a canvas */
var canvas = document.getElementById('my_Canvas');
gl = canvas.getContext('experimental-webgl');

/*Defining and storing the geometry*/

var vertices = [
   1.0, 0.0, 0.0,
   0.0, 0.0, 0.0,
   1.0, 1.0, 0.0,
];

var colors = [0, 0, 1, 1, 0, 0, 0, 1, 0, 0.5, 1.0, 0.5,];

indices = [3, 2, 1, 3, 1, 0];

// Create an empty buffer object and store vertex data
var vertex_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

// Create an empty buffer object and store Index data
var Index_Buffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

// Create an empty buffer object and store color data
var color_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

/*======================= Shaders =======================*/

// vertex shader source code
var vertCode = 'attribute vec3 coordinates;' +
   'attribute vec3 color;' +
   'varying vec3 vColor;' +
   'void main(void) {' +
   ' gl_Position = vec4(coordinates, 1.0);' +
   'vColor = color;' +
   '}';

// Create a vertex shader object
var vertShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertShader, vertCode);
gl.compileShader(vertShader);


// fragment shader source code
var fragCode = 'precision mediump float;' +
   'varying vec3 vColor;' +
   'void main(void) {' +
   'gl_FragColor = vec4(vColor, 1.);' +
   '}';

// fragment shader object
var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragShader, fragCode);
gl.compileShader(fragShader);

// Create a shader program object to
// store the combined shader program
var shaderProgram = gl.createProgram();

// Attach a vertex shader
gl.attachShader(shaderProgram, vertShader);
gl.attachShader(shaderProgram, fragShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);
/* ======== Associating shaders to buffer objects =======*/

// Bind vertex buffer object
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
// Bind index buffer object
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
// Get the attribute location
var coord = gl.getAttribLocation(shaderProgram, "coordinates");
// point an attribute to the currently bound VBO
gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
// Enable the attribute
gl.enableVertexAttribArray(coord);
// bind the color buffer
gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
// get the attribute location
var color = gl.getAttribLocation(shaderProgram, "color");
// point attribute to the volor buffer object
gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 0, 0);
// enable the color attribute
gl.enableVertexAttribArray(color);

/*============Drawing the Quad====================*/
gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
gl.enable(gl.DEPTH_TEST);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.viewport(0, 0, canvas.width, canvas.height);
gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
