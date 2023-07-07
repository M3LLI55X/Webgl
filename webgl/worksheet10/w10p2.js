
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
    initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)
    var n = initVertexBuffers(gl);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.enable(gl.DEPTH_TEST);
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');

    var projMatrix = new Matrix4();
    projMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0);

    var qrot = new Quaternion();
    var qinc = new Quaternion();

    initEventHandlers(canvas, qrot, qinc);

    var tick = function () {
        draw(gl, n, projMatrix, u_MvpMatrix, qrot);
        requestAnimationFrame(tick, canvas);
    };
    tick();
}

var g_MvpMatrix = new Matrix4();
function draw(gl, n, projMatrix, u_MvpMatrix, qrot) {
    g_MvpMatrix.set(projMatrix);
    var up = qrot.apply(new Vector3([0, 1, 0]));
    var u = up.elements;
    var rot_eye = qrot.apply(new Vector3([0, 0, 8]));
    var re = rot_eye.elements;

    g_MvpMatrix.lookAt(re[0], re[1], re[2], 0, 0, 0, u[0], u[1], u[2]);
    gl.uniformMatrix4fv(u_MvpMatrix, false, g_MvpMatrix.elements);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

function project_to_sphere(x, y) {
    var r = 2;
    var d = Math.sqrt(x * x + y * y);
    var t = r * Math.sqrt(2);
    var z;
    if (d < r)
        z = Math.sqrt(r * r - d * d);
    else if (d < t)
        z = 0;
    else
        z = t * t / d;
    return z;
}

function initEventHandlers(canvas, qrot, qinc) {
    var dragging = false;         // Dragging?
    var lastX = -1, lastY = -1;   // Last position

    canvas.onmousedown = function (ev) {   // Moving
        var x = ev.clientX, y = ev.clientY;
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastX = x; lastY = y;
            dragging = true;
        }
    };

    canvas.onmouseup = function (ev) {
        qinc.setIdentity();
        dragging = false;
    }; // Mouse is released

    canvas.onmousemove = function (ev) { // Mouse is moved
        var x = ev.clientX, y = ev.clientY;
        if (dragging) {
            var rect = ev.target.getBoundingClientRect();
            var s_x = ((x - rect.left) / rect.width - 0.5) * 2;
            var s_y = (0.5 - (y - rect.top) / rect.height) * 2;
            var s_last_x = ((lastX - rect.left) / rect.width - 0.5) * 2;
            var s_last_y = (0.5 - (lastY - rect.top) / rect.height) * 2;
            var v1 = new Vector3([s_x, s_y, project_to_sphere(s_x, s_y)]);
            var v2 = new Vector3([s_last_x, s_last_y, project_to_sphere(s_last_x, s_last_y)]);
            qinc = qinc.make_rot_vec2vec(v1.normalize(), v2.normalize());
            qrot = qrot.multiply(qinc);
        }
        lastX = x, lastY = y;
    };
}

function initVertexBuffers(gl) {

    var vertices = new Float32Array([
        0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,    // v0-v1-v2-v3 front
        0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,    // v0-v3-v4-v5 right
        0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5,    // v0-v5-v6-v1 up
        -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,    // v1-v6-v7-v2 left
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,    // v7-v4-v3-v2 down
        0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5    // v4-v7-v6-v5 back
    ]);

    var colors = new Float32Array([
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
