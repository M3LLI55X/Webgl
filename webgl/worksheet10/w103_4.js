var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '  v_Color = a_Color;\n' +
    '}';

var FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}';

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

    var eye = new Vector3([3.0, 3.0, 7.0]);
    var lookat = new Vector3([0.0, 0.0, 0.0]);
    var up = new Vector3([0.0, 1.0, 0.0]);

    var e = eye.elements;
    var p = lookat.elements;
    var z_dir = new Vector3([e[0] - p[0], e[1] - p[1], e[2] - p[2]]);
    var z = z_dir.elements;
    var eye_dist = Math.sqrt(z[0] * z[0] + z[1] * z[1] + z[2] * z[2]);
    var eye_dist_pan = new Vector3([eye_dist, 0, 0]);
    var qrot = new Quaternion();
    var qinc = new Quaternion();
    qrot = qrot.make_rot_vec2vec(new Vector3([0, 0, 1]), z_dir.normalize());
    var qrot_inv = new Quaternion(qrot);
    qrot_inv.invert();
    up = qrot_inv.apply(up);

    initEventHandlers(canvas, qrot, qinc, eye_dist_pan);

    var tick = function () {
        qrot = qrot.multiply(qinc);
        draw(gl, n, projMatrix, u_MvpMatrix, eye_dist_pan, lookat, up, qrot);
        requestAnimationFrame(tick, canvas);
    };
    tick();
}

var g_MvpMatrix = new Matrix4(); 
function draw(gl, n, projMatrix, u_MvpMatrix, eye_dist_pan, lookat, up, qrot) {
    
    g_MvpMatrix.set(projMatrix);
    var rot_up = qrot.apply(up);
    var u = rot_up.elements;
    var right = qrot.apply(new Vector3([1, 0, 0]));
    var r = right.elements;
    var p = lookat.elements;
    var e = eye_dist_pan.elements;
    var centre = new Vector3([p[0] - r[0] * e[1] - u[0] * e[2], p[1] - r[1] * e[1] - u[1] * e[2], p[2] - r[2] * e[1] - u[2] * e[2]]);
    var c = centre.elements;
    var rot_eye = qrot.apply(new Vector3([0, 0, e[0]]));
    var re = rot_eye.elements;

    g_MvpMatrix.lookAt(re[0] + c[0], re[1] + c[1], re[2] + c[2], c[0], c[1], c[2], u[0], u[1], u[2]);
    gl.uniformMatrix4fv(u_MvpMatrix, false, g_MvpMatrix.elements);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

function project_to_sphere(x, y) {
    var r = 2;
    var d = Math.sqrt(x * x + y * y);
    var t = r * Math.sqrt(2);
    var z;
    if (d < r) // Inside sphere
        z = Math.sqrt(r * r - d * d);
    else if (d < t)
        z = 0;
    else       // On hyperbola
        z = t * t / d;
    return z;
}

function initEventHandlers(canvas, qrot, qinc, eye_dist_pan) {
    var dragging = false;         
    var lastX = -1, lastY = -1;   
    var current_action = 0;   

    canvas.onmousedown = function (ev) {  
        ev.preventDefault();
        var x = ev.clientX, y = ev.clientY;
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastX = x; lastY = y;
            dragging = true;
            current_action = ev.button + 1;
        }
    };

    canvas.oncontextmenu = function (ev) { ev.preventDefault(); };

    canvas.onmouseup = function (ev) {
        var x = ev.clientX, y = ev.clientY;
        if (x === lastX && y === lastY) {
            qinc.setIdentity();
        }
        dragging = false;
        current_action = 0;
    }; 

    var g_last = Date.now();
    canvas.onmousemove = function (ev) {
        var x = ev.clientX, y = ev.clientY;
        if (dragging) {
            var now = Date.now();
            var elapsed = now - g_last;
            if (elapsed > 20) {
                g_last = now;
                var rect = ev.target.getBoundingClientRect();
                var s_x = ((x - rect.left) / rect.width - 0.5) * 2;
                var s_y = (0.5 - (y - rect.top) / rect.height) * 2;
                var s_last_x = ((lastX - rect.left) / rect.width - 0.5) * 2;
                var s_last_y = (0.5 - (lastY - rect.top) / rect.height) * 2;
                switch (current_action) {
                    case 1: { // orbit
                        var v1 = new Vector3([s_x, s_y, project_to_sphere(s_x, s_y)]);
                        var v2 = new Vector3([s_last_x, s_last_y, project_to_sphere(s_last_x, s_last_y)]);
                        qinc = qinc.make_rot_vec2vec(v1.normalize(), v2.normalize());
                    }
                        break;
                    case 2: { // dolly
                        var e = eye_dist_pan.elements;
                        e[0] += (s_y - s_last_y) * e[0]
                        e[0] = Math.max(e[0], 0.01);
                    }
                        break;
                    case 3: { // pan
                        var e = eye_dist_pan.elements;
                        e[1] += (s_x - s_last_x) * e[0] * 0.25;
                        e[2] += (s_y - s_last_y) * e[0] * 0.25;
                    }
                        break;
                }
                lastX = x, lastY = y;
            }
        }
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
