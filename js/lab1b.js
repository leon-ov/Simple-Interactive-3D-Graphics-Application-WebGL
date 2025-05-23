import * as glm from './gl-matrix/index.js';

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl');
if (!gl) {
  alert('WebGL is not supported');
  throw new Error('WebGL not supported');
}

const shaderSources = {
  w: { // Gouraud/Diffuse
    vs: `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uNormalMatrix;
      uniform vec3 uLightPosition;
      uniform vec3 uLightColor;
      uniform vec3 uDiffuseColor;
      uniform vec3 uAmbientColor;
      varying vec3 vColor;
      void main() {
        vec4 mvPosition = uModelViewMatrix * vec4(aPosition, 1.0);
        vec3 normal = normalize(mat3(uNormalMatrix) * aNormal);
        vec3 lightDir = normalize(uLightPosition - mvPosition.xyz);
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uDiffuseColor * diff * uLightColor;
        vec3 ambient = uAmbientColor * uLightColor;
        vColor = ambient + diffuse;
        gl_Position = uProjectionMatrix * mvPosition;
      }
    `,
    fs: `
      precision mediump float;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `
  },
  e: { // Gouraud/Specular
    vs: `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uNormalMatrix;
      uniform vec3 uLightPosition;
      uniform vec3 uLightColor;
      uniform vec3 uDiffuseColor;
      uniform vec3 uAmbientColor;
      uniform vec3 uSpecularColor;
      uniform float uShininess;
      varying vec3 vColor;
      void main() {
        vec4 mvPosition = uModelViewMatrix * vec4(aPosition, 1.0);
        vec3 normal = normalize(mat3(uNormalMatrix) * aNormal);
        vec3 lightDir = normalize(uLightPosition - mvPosition.xyz);
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uDiffuseColor * diff * uLightColor;
        vec3 ambient = uAmbientColor * uLightColor;
        vec3 viewDir = normalize(-mvPosition.xyz);
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(reflectDir, viewDir), 0.0), uShininess);
        vec3 specular = uSpecularColor * spec * uLightColor;
        vColor = ambient + diffuse + specular;
        gl_Position = uProjectionMatrix * mvPosition;
      }
    `,
    fs: `
      precision mediump float;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `
  },
  r: { // Phong/Diffuse
    vs: `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uNormalMatrix;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec4 mvPosition = uModelViewMatrix * vec4(aPosition, 1.0);
        vPosition = mvPosition.xyz;
        vNormal = normalize(mat3(uNormalMatrix) * aNormal);
        gl_Position = uProjectionMatrix * mvPosition;
      }
    `,
    fs: `
      precision mediump float;
      uniform vec3 uLightPosition;
      uniform vec3 uLightColor;
      uniform vec3 uAmbientColor;
      uniform vec3 uDiffuseColor;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(uLightPosition - vPosition);
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uDiffuseColor * diff * uLightColor;
        vec3 ambient = uAmbientColor * uLightColor;
        gl_FragColor = vec4(ambient + diffuse, 1.0);
      }
    `
  },
  t: { // Phong/Specular
    vs: `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uNormalMatrix;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec4 mvPosition = uModelViewMatrix * vec4(aPosition, 1.0);
        vPosition = mvPosition.xyz;
        vNormal = normalize(mat3(uNormalMatrix) * aNormal);
        gl_Position = uProjectionMatrix * mvPosition;
      }
    `,
    fs: `
      precision mediump float;
      uniform vec3 uLightPosition;
      uniform vec3 uLightColor;
      uniform vec3 uAmbientColor;
      uniform vec3 uDiffuseColor;
      uniform vec3 uSpecularColor;
      uniform float uShininess;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(uLightPosition - vPosition);
        vec3 viewDir = normalize(-vPosition);
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uDiffuseColor * diff * uLightColor;
        vec3 ambient = uAmbientColor * uLightColor;
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(reflectDir, viewDir), 0.0), uShininess);
        vec3 specular = uSpecularColor * spec * uLightColor;
        gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
      }
    `
  }
};

let vsSource = shaderSources.w.vs;
let fsSource = shaderSources.w.fs;

function loadShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initShaderProgram(vsSource, fsSource) {
  const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Creating program error:', gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

let shaderProgram = initShaderProgram(vsSource, fsSource);
let programInfo = {
  program: shaderProgram,
  attribLocations: {
    position: gl.getAttribLocation(shaderProgram, 'aPosition'),
    normal: gl.getAttribLocation(shaderProgram, 'aNormal'),
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
    modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
    normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
    lightPosition: gl.getUniformLocation(shaderProgram, 'uLightPosition'),
    lightColor: gl.getUniformLocation(shaderProgram, 'uLightColor'),
    ambientColor: gl.getUniformLocation(shaderProgram, 'uAmbientColor'),
    diffuseColor: gl.getUniformLocation(shaderProgram, 'uDiffuseColor'),
    specularColor: gl.getUniformLocation(shaderProgram, 'uSpecularColor'),
    shininess: gl.getUniformLocation(shaderProgram, 'uShininess'),
  },
};

class Shape {
  constructor(vertices, indices, colors, transform, normals) {
    this.vertices = vertices;
    this.indices = indices;
    this.colors = colors;
    this.transform = transform;
    this.normals = normals;
    
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    this.vertexCount = indices.length;
  }
}

function parseOBJ(objText) {
    const lines = objText.split("\n");
    const tempVertices = [];
    const tempNormals = [];
    const vertices = [];
    const normals = [];
    const indices = [];

    // Track vertex adjacency for normal averaging
    const vertexToFaces = new Map(); // Maps vertex index to list of face normals

    // First pass: collect vertices and face definitions
    const faces = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("v ")) {
            // Parse vertex
            const parts = trimmed.split(/\s+/);
            tempVertices.push([
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3])
            ]);
        } else if (trimmed.startsWith("f ")) {
            // Parse face (only vertex indices)
            const parts = trimmed.split(/\s+/);
            const faceVertices = [];
            for (let i = 1; i < parts.length; i++) {
                const vertexData = parts[i].split("/")[0]; // Get vertex index only
                const vIndex = parseInt(vertexData) - 1;
                faceVertices.push(vIndex);
            }
            faces.push(faceVertices);
        }
    }

    // Compute face normals and populate vertexToFaces
    for (const face of faces) {
        if (face.length < 3) continue; // Skip invalid faces

        const v0 = tempVertices[face[0]];
        const v1 = tempVertices[face[1]];
        const v2 = tempVertices[face[2]];

        // Compute face normal using cross product
        const vecA = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const vecB = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        const normal = [
            vecA[1] * vecB[2] - vecA[2] * vecB[1],
            vecA[2] * vecB[0] - vecA[0] * vecB[2],
            vecA[0] * vecB[1] - vecA[1] * vecB[0]
        ];

        // Normalize the face normal
        const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
        if (length === 0) continue;
        const normalizedNormal = normal.map(n => n / length);

        // Associate this face normal with each vertex in the face
        for (const vIndex of face) {
            if (!vertexToFaces.has(vIndex)) {
                vertexToFaces.set(vIndex, []);
            }
            vertexToFaces.get(vIndex).push(normalizedNormal);
        }
    }

    // Compute averaged vertex normals
    const vertexNormals = [];
    for (const [vIndex, faceNormals] of vertexToFaces) {
        const avgNormal = [0, 0, 0];
        for (const n of faceNormals) {
            avgNormal[0] += n[0];
            avgNormal[1] += n[1];
            avgNormal[2] += n[2];
        }
        avgNormal[0] /= faceNormals.length;
        avgNormal[1] /= faceNormals.length;
        avgNormal[2] /= faceNormals.length;

        // Normalize the averaged normal
        const length = Math.sqrt(avgNormal[0] ** 2 + avgNormal[1] ** 2 + avgNormal[2] ** 2);
        if (length > 0) {
            avgNormal[0] /= length;
            avgNormal[1] /= length;
            avgNormal[2] /= length;
        }
        vertexNormals[vIndex] = avgNormal;
    }

    // Second pass: build vertices/normals/indices
    let index = 0;
    for (const face of faces) {
        for (const vIndex of face) {
            vertices.push(...tempVertices[vIndex]);
            normals.push(...vertexNormals[vIndex]);
            indices.push(index++);
        }
    }

    return { vertices, normals, indices };
}

async function generateFromOBJ(objData) {
    const colors = [];
    const numVertices = objData.vertices.length / 3;
    for (let i = 0; i < numVertices; i++) {
        colors.push(0.0, 0.0, 1.0);
    }

    const boundingBoxTransform = glm.mat4.create();

    return new Shape(
        objData.vertices,
        objData.indices,
        colors,
        boundingBoxTransform,
        objData.normals
    );
}

let Obj;
let lightInteract = false;
let objInteract = false;

let x = 0.0;
let y = 0.0;
let z = 0.0;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

let xCam = 0;
let yCam = 0;
let zCam = 3;

let objects = [];
let selectedObjectIndex = -1;
let allObjects = false;

let selectedObj = -1;

async function init() {
    try {

      const models = [
        '/sampleModels/bunny.obj',
        '/sampleModels/teapot.obj',
        '/sampleModels/bunny.obj',
        '/sampleModels/bunny.obj',
        '/sampleModels/bunny.obj',
        '/sampleModels/bunny.obj',
        '/sampleModels/bunny.obj',
        '/sampleModels/bunny.obj',
        '/sampleModels/bunny.obj'
      ];

        /*const response = await fetch('/sampleModels/teapot.obj');
        const teapot = await response.text();
        const teapotData = parseOBJ(teapot);
        Obj = await generateFromOBJ(teapotData);*/
        /*const response = await fetch('/sampleModels/bunny.obj')
        const bunny = await response.text();
        const bunnyData = parseOBJ(bunny);
        Obj = await generateFromOBJ(bunnyData);*/


        for (let i = 0; i < 9; i++) {
          const response = await fetch(models[i]);
          const modelText = await response.text();
          const modelData = parseOBJ(modelText);
          let ob = await generateFromOBJ(modelData);
          
          objects.push(ob);
        }

        drawScene();
        document.addEventListener('keydown', (event) => {
           if(!lightInteract && !(selectedObj > -1 && selectedObj < 10) && !allObjects){
            switch (event.key){
                case 'w':
                    vsSource = shaderSources.w.vs;
                    fsSource = shaderSources.w.fs;
                    break;
                case 'e':
                    vsSource = shaderSources.e.vs;
                    fsSource = shaderSources.e.fs;
                    break;
                case 'r':
                    vsSource = shaderSources.r.vs;
                    fsSource = shaderSources.r.fs;
                    break;
                case 't':
                    vsSource = shaderSources.t.vs;
                    fsSource = shaderSources.t.fs;
                    break;
                case 'L':
                    lightInteract = true;
                    break;
                case '1':
                  selectedObj = 0;
                    break;
                    case '2':
                  selectedObj = 1;
                    break;
                    case '3':
                  selectedObj = 2;
                    break;
                    case '4':
                  selectedObj = 3;
                    break;
                    case '5':
                  selectedObj = 4;
                    break;
                    case '6':
                  selectedObj = 5;
                    break;
                    case '7':
                  selectedObj = 6;
                    break;
                    case '8':
                  selectedObj = 7;
                    break;
                    case '9':
                  selectedObj = 8;
                    break;
                    case '0':
                      allObjects = true;
                      selectedObj = -1;
                    break;
                    case 'ArrowUp':
                        glm.vec3.add(cameraPosition, cameraPosition,
                            glm.vec3.scale(glm.vec3.create(), cameraUp, 0.1));
                        glm.vec3.add(cameraTarget, cameraTarget,
                            glm.vec3.scale(glm.vec3.create(), cameraUp, 0.1));
                        break;
                    case 'ArrowDown':
                        glm.vec3.subtract(cameraPosition, cameraPosition,
                            glm.vec3.scale(glm.vec3.create(), cameraUp, 0.1));
                        glm.vec3.subtract(cameraTarget, cameraTarget,
                            glm.vec3.scale(glm.vec3.create(), cameraUp, 0.1));
                        break;
                    case 'ArrowLeft':
                        {
                        let right = glm.vec3.create();
                        glm.vec3.cross(right, cameraFront, cameraUp);
                        glm.vec3.normalize(right, right);
                        glm.vec3.subtract(cameraPosition, cameraPosition,
                            glm.vec3.scale(glm.vec3.create(), right, 0.1));
                        glm.vec3.subtract(cameraTarget, cameraTarget,
                            glm.vec3.scale(glm.vec3.create(), right, 0.1));
                        }
                        break;
                    case 'ArrowRight':
                        {
                        let right = glm.vec3.create();
                        glm.vec3.cross(right, cameraFront, cameraUp);
                        glm.vec3.normalize(right, right);
                        glm.vec3.add(cameraPosition, cameraPosition,
                            glm.vec3.scale(glm.vec3.create(), right, 0.1));
                        glm.vec3.add(cameraTarget, cameraTarget,
                            glm.vec3.scale(glm.vec3.create(), right, 0.1));
                        }
                        break;

                default:
    
                    break;
            }
            shaderProgram = initShaderProgram(vsSource, fsSource);
            programInfo = {
                program: shaderProgram,
                attribLocations: {
                  position: gl.getAttribLocation(shaderProgram, 'aPosition'),
                  normal: gl.getAttribLocation(shaderProgram, 'aNormal'),
                },
                uniformLocations: {
                  projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                  modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                  normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
                  lightPosition: gl.getUniformLocation(shaderProgram, 'uLightPosition'),
                  lightColor: gl.getUniformLocation(shaderProgram, 'uLightColor'),
                  ambientColor: gl.getUniformLocation(shaderProgram, 'uAmbientColor'),
                  diffuseColor: gl.getUniformLocation(shaderProgram, 'uDiffuseColor'),
                  specularColor: gl.getUniformLocation(shaderProgram, 'uSpecularColor'),
                  shininess: gl.getUniformLocation(shaderProgram, 'uShininess'),
                },
              };
            drawScene();
        } else if(lightInteract && !(selectedObj > -1 && selectedObj < 10)){
            switch (event.key){
                case 'L':
                    lightInteract = false;
                    break;
                case 'ArrowUp':
                    lightPosition[1] += 0.7;
                    break;
                case 'ArrowDown':
                    lightPosition[1] -= 0.7;
                    break;
                case 'ArrowLeft':
                    lightPosition[0] -= 0.7;
                    break;
                case 'ArrowRight':
                    lightPosition[0] += 0.7;
                    break;
                case ',':
                    lightPosition[2] -= 0.7;
                    break;
                case '.':
                    lightPosition[2] += 0.7;
                    break;
                    case 'a': lightScale[0] *= 0.9; break;
                    case 'A': lightScale[0] *= 1.1; break;
                    case 'b': lightScale[1] *= 0.9; break;
                    case 'B': lightScale[1] *= 1.1; break;
                    case 'c': lightScale[2] *= 0.9; break;
                    case 'C': lightScale[2] *= 1.1; break;

                    case 'i': rotateLight('X', 0.5); break;
                    case 'k': rotateLight('X', -0.5); break;
                    case 'o': rotateLight('Y', 0.5); break;
                    case 'u': rotateLight('Y', -0.5); break;
                    case 'l': rotateLight('Z', 0.5); break;
                    case 'j': rotateLight('Z', -0.5); break;

                default:
    
                    break;
            }

            drawScene();
        } else if(!lightInteract && (selectedObj > -1 && selectedObj < 10)){
          //const o = objects[selectedObj];
            switch (event.key){
            case ' ':
                    selectedObj = -1;
                    allObjects = false;
                    break;
                    case '1': selectedObj = 0; break;
                    case '2': selectedObj = 1; break;
                    case '3': selectedObj = 2; break;
                    case '4': selectedObj = 3; break;
                    case '5': selectedObj = 4; break;
                    case '6': selectedObj = 5; break;
                    case '7': selectedObj = 6; break;
                    case '8': selectedObj = 7; break;
                    case '9': selectedObj = 8; break;
                    case '0': allObjects = true; selectedObj = -1; break;
                    case 'ArrowUp': translations[selectedObj][1] += 0.1; break;
                    case 'ArrowDown': translations[selectedObj][1] -= 0.1; break;
                    case 'ArrowLeft': translations[selectedObj][0] -= 0.1; break;
                    case 'ArrowRight': translations[selectedObj][0] += 0.1; break;
                    case ',': translations[selectedObj][2] -= 0.1; break;
                    case '.': translations[selectedObj][2] += 0.1; break;
                    case 'a': scales[selectedObj][0] -= 0.5; break;
                    case 'A': scales[selectedObj][0] += 0.5; break;
                    case 'b': scales[selectedObj][1] -= 0.5; break;
                    case 'B': scales[selectedObj][1] += 0.5; break;
                    case 'c': scales[selectedObj][2] -= 0.5; break;
                    case 'C': scales[selectedObj][2] += 0.5; break;
    
                    case 'i': rotations[selectedObj][0] += 0.1; break;
                    case 'k': rotations[selectedObj][0] -= 0.1; break;
                    case 'o': rotations[selectedObj][1] += 0.1; break;
                    case 'u': rotations[selectedObj][1] -= 0.1; break;
                    case 'l': rotations[selectedObj][2] += 0.1; break;
                    case 'j': rotations[selectedObj][2] -= 0.1; break;
                    default: break;
            }
        } else if(allObjects){
          for(let a = 0; a < 9; a++){
            //console.log(a);
          switch (event.key){
            case '0': allObjects = false; break;
            case ' ':
              allObjects = false;
                    break;
                    case '1': selectedObj = 0; break;
                    case '2': selectedObj = 1; break;
                    case '3': selectedObj = 2; break;
                    case '4': selectedObj = 3; break;
                    case '5': selectedObj = 4; break;
                    case '6': selectedObj = 5; break;
                    case '7': selectedObj = 6; break;
                    case '8': selectedObj = 7; break;
                    case '9': selectedObj = 8; break;
                    case 'ArrowUp': translations[a][1] += 0.1; break;
                    case 'ArrowDown': translations[a][1] -= 0.1; break;
                    case 'ArrowLeft': translations[a][0] -= 0.1; break;
                    case 'ArrowRight': translations[a][0] += 0.1; break;
                    case ',': translations[a][2] -= 0.1; break;
                    case '.': translations[a][2] += 0.1; break;
                    /*case 'ArrowUp':    groupOffset[1] += 0.01; break;
                    case 'ArrowDown':  groupOffset[1] -= 0.01; break;
                    case 'ArrowLeft':  groupOffset[0] -= 0.01; break;
                    case 'ArrowRight': groupOffset[0] += 0.01; break;
                    case ',':          groupOffset[2] -= 0.01; break;
                    case '.':          groupOffset[2] += 0.01; break;*/
                    case 'a': scales[a][0] -= 0.5; break;
                    case 'A': scales[a][0] += 0.5; break;
                    case 'b': scales[a][1] -= 0.5; break;
                    case 'B': scales[a][1] += 0.5; break;
                    case 'c': scales[a][2] -= 0.5; break;
                    case 'C': scales[a][2] += 0.5; break;
    
                    // rotation
                    case 'i': rotations[a][0] += 0.1; break;
                    case 'k': rotations[a][0] -= 0.1; break;
                    case 'o': rotations[a][1] += 0.1; break;
                    case 'u': rotations[a][1] -= 0.1; break;
                    case 'l': rotations[a][2] += 0.1; break;
                    case 'j': rotations[a][2] -= 0.1; break;
            default: break;
          }
          }
        drawScene();
        }
    });


    document.addEventListener('mousedown', (event) => {
        isDragging = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    document.addEventListener('mousemove', (event) => {
        if (!isDragging) return;
    
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        const sensitivity = 0.010;
    
        // moving camera to the right
        const front = glm.vec3.create();
        glm.vec3.subtract(front, cameraTarget, cameraPosition);
        glm.vec3.normalize(front, front);
    
        const right = glm.vec3.create();
        glm.vec3.cross(right, front, cameraUp);
        glm.vec3.normalize(right, right);
    
        // moving camera right and up
        const moveRight = glm.vec3.scale(glm.vec3.create(), right, -deltaX * sensitivity);
        const moveUp = glm.vec3.scale(glm.vec3.create(), cameraUp, deltaY * sensitivity);
    
        glm.vec3.add(cameraPosition, cameraPosition, moveRight);
        glm.vec3.add(cameraPosition, cameraPosition, moveUp);
    
        glm.vec3.add(cameraTarget, cameraPosition, front);
    
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        drawScene();
    });
    } catch (error) {
        console.error('Error loading teapot:', error);
    }
}

let rotateX = 0; 
let rotateY = 0; 
let rotateZ = 0; 

let xScale = 10;
let yScale = 10;
let zScale = 10;

let cameraPosition = glm.vec3.fromValues(0, 0, 10);
let cameraFront = glm.vec3.fromValues(0, 0, -1);
let cameraTarget = glm.vec3.create();
glm.vec3.add(cameraTarget, cameraPosition, cameraFront);
let cameraUp = glm.vec3.fromValues(0, 1, 0);

let lightPosition = [0.0, 10.0, 0.0];
let lightScale = [1.0, 1.0, 1.0];
let lightRotation = [0.0, 0.0, 0.0];

function rotateLight(axis, angle) {
    const pos = glm.vec3.fromValues(...lightPosition);
    const rotationMatrix = glm.mat4.create();
    
    switch(axis) {
        case 'X': glm.mat4.rotateX(rotationMatrix, rotationMatrix, angle); break;
        case 'Y': glm.mat4.rotateY(rotationMatrix, rotationMatrix, angle); break;
        case 'Z': glm.mat4.rotateZ(rotationMatrix, rotationMatrix, angle); break;
    }
    
    glm.vec3.transformMat4(pos, pos, rotationMatrix);
    lightPosition = Array.from(pos);
}

const translations = [
  [-3.0, 2.5, 0.0],
  [0.0, 2.5, 0.0],
  [3.0, 2.5, 0.0],
  [-3.0, 0.0, 0.0],
  [0.0, 0.0, 0.0],
  [3.0, 0.0, 0.0],
  [-3.0, -2.5, 0.0],
  [0.0, -2.5, 0.0],
  [3.0, -2.5, 0.0]
];

const scales = [
  [10.0, 10.0, 10.0],
  [1.0, 1.5, 1.0],
  [10.0, 10.0, 10.0],
  [10.0, 10.0, 10.0],
  [10.0, 10.0, 10.0],
  [10.0, 10.0, 10.0],
  [10.0, 10.0, 10.0],
  [10.0, 10.0, 10.0],
  [10.0, 10.0, 10.0]
];

const colors = [
  [1.0, 0.0, 0.0],
  [1.0, 0.0, 0.0],
  [0.0, 0.0, 1.0],
  [1.0, 1.0, 0.0],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 1.0],
  [1.0, 0.0, 1.0],
  [0.0, 0.0, 1.0],
  [0.0, 1.0, 0.0]
];

const rotations = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.0]
];

let groupOffset = [0.0, 0.0, 0.0];


function drawScene() {

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Projection
  const fieldOfView = 45 * Math.PI / 180;
  const aspect = canvas.width / canvas.height;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = glm.mat4.create();
  glm.mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  const viewMatrix = glm.mat4.create();
  glm.mat4.lookAt(viewMatrix, cameraPosition, cameraTarget, cameraUp);

  for(let i = 0; i < 9; i++){
    const modelMatrix = glm.mat4.create();

    if (allObjects) {
      glm.mat4.rotateX(modelMatrix, modelMatrix, rotations[i][0]);
      glm.mat4.rotateY(modelMatrix, modelMatrix, rotations[i][1]);
      glm.mat4.rotateZ(modelMatrix, modelMatrix, rotations[i][2]);
    }

    glm.mat4.translate(modelMatrix, modelMatrix, [translations[i][0], translations[i][1], translations[i][2]]); // object translation


    if(!allObjects){
      glm.mat4.rotateX(modelMatrix, modelMatrix, rotations[i][0]);
      glm.mat4.rotateY(modelMatrix, modelMatrix, rotations[i][1]);
      glm.mat4.rotateZ(modelMatrix, modelMatrix, rotations[i][2]);
    }
    
    //glm.mat4.rotate(modelMatrix, modelMatrix, Date.now() * 0.001, [0, 1, 0]); 
    glm.mat4.scale(modelMatrix, modelMatrix, [scales[i][0], scales[i][1], scales[i][2]]);

    const modelViewMatrix = glm.mat4.create();
    glm.mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

  const normalMatrix = glm.mat4.create();
  glm.mat4.invert(normalMatrix, modelViewMatrix);
  glm.mat4.transpose(normalMatrix, normalMatrix);
  

  gl.useProgram(programInfo.program);

  {
    const numComponents = 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, objects[i].positionBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.position, numComponents, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.position);
  }
  {
    const numComponents = 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, objects[i].normalBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.normal, numComponents, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.normal);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,objects[i].indexBuffer);

  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);

  /*const rotatedLightPos = [
    lightPosition[0] * Math.cos(lightRotation) - lightPosition[2] * Math.sin(lightRotation),
    lightPosition[1],
    lightPosition[0] * Math.sin(lightRotation) + lightPosition[2] * Math.cos(lightRotation)
    ];*/

    const lightModelMatrix = glm.mat4.create();
    
    glm.mat4.translate(lightModelMatrix, lightModelMatrix, lightPosition);
    glm.mat4.rotateX(lightModelMatrix, lightModelMatrix, lightRotation[0]);
    glm.mat4.rotateY(lightModelMatrix, lightModelMatrix, lightRotation[1]);
    glm.mat4.rotateZ(lightModelMatrix, lightModelMatrix, lightRotation[2]);
    glm.mat4.scale(lightModelMatrix, lightModelMatrix, lightScale);

  // Light parameters
  gl.uniform3fv(programInfo.uniformLocations.lightPosition, lightPosition);
  gl.uniform3fv(programInfo.uniformLocations.lightColor, [1.0, 1.0, 1.0]);
  gl.uniform3fv(programInfo.uniformLocations.ambientColor, [0.2, 0.2, 0.2]);
  gl.uniform3fv(programInfo.uniformLocations.diffuseColor, [colors[i][0], colors[i][1], colors[i][2]]);
  gl.uniform3fv(programInfo.uniformLocations.specularColor, [1.0, 1.0, 1.0]);
  gl.uniform1f(programInfo.uniformLocations.shininess, 32.0);

  gl.drawElements(gl.TRIANGLES, objects[i].vertexCount, gl.UNSIGNED_SHORT, 0);
  }
  requestAnimationFrame(drawScene);
}

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

init();
