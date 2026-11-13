// Configura somente a API local e grava a chave no arquivo ignorado do Python.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const env = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const admin = dotenv.parse(
  fs.readFileSync(path.join(root, '.env.local-admin')),
);
const base = 'http://127.0.0.1:3000/api/v1';
const addCameraB = process.argv.includes('--add-camera-b');
let token;
async function call(route, body) {
  const response = await fetch(base + route, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
  return response.json();
}
async function main() {
  const destination = path.resolve(
    root,
    '../computer-vision/ingestion.local.json',
  );
  const exists = fs.existsSync(destination);
  if (exists && !addCameraB)
    throw new Error('ingestion.local.json já existe; não será sobrescrito.');
  if (addCameraB && !exists)
    throw new Error('ingestion.local.json não existe; execute a configuração inicial sem --add-camera-b.');
  const existingConfig = addCameraB
    ? JSON.parse(fs.readFileSync(destination, 'utf8'))
    : null;
  const login = await call('/auth/login', {
    email: admin.ADMIN_EMAIL,
    senha: admin.ADMIN_PASSWORD,
  });
  token = login.accessToken;
  const roads = await call('/vias');
  const viaA = roads.find((v) => v.codigo === 'A');
  const viaB = roads.find((v) => v.codigo === 'B');
  if (!viaA || !viaB) throw new Error('Vias A e B não cadastradas.');
  const devices = await call('/dispositivos');
  async function device(codigo, nome, tipo, viaId) {
    const found = devices.find((d) => d.codigo === codigo);
    if (found) {
      if (
        !found.ativo ||
        found.tipo !== tipo ||
        (viaId && found.viaId !== viaId)
      )
        throw new Error('Cadastro incompatível: ' + codigo);
      return found.id;
    }
    return (
      await call('/dispositivos', {
        codigo,
        nome,
        tipo,
        ...(viaId ? { viaId } : {}),
      })
    ).id;
  }
  const cameraA = await device(
    'CAM-LOCAL-A',
    'Webcam da via A',
    'CAMERA',
    viaA.id,
  );
  if (addCameraB && existingConfig.camera_id !== cameraA)
    throw new Error('A câmera A configurada não corresponde a CAM-LOCAL-A; configuração mantida.');
  const cameraB = await device(
    'CAM-LOCAL-B',
    'Webcam da via B',
    'CAMERA',
    viaB.id,
  );
  if (addCameraB && existingConfig.camera_b_id) {
    if (existingConfig.camera_b_id !== cameraB)
      throw new Error('camera_b_id já existe e não corresponde a CAM-LOCAL-B; configuração mantida.');
    console.log('A câmera B já está configurada na API e no arquivo local.');
    return;
  }
  const computer = await device(
    'PC-LOCAL',
    'Computador de processamento local',
    'COMPUTADOR',
  );
  const arduino = await device(
    'ARDUINO-LOCAL',
    'Arduino ST1 da maquete',
    'ARDUINO',
  );
  const signals = await call('/semaforos');
  const signalA = signals.find((s) => s.vias.codigo === 'A');
  const signalB = signals.find((s) => s.vias.codigo === 'B');
  if (!signalA || !signalB) throw new Error('Semáforos A/B não cadastrados.');
  const generatedConfig = {
        enabled: true,
        api_url: base,
        ingestion_key: env.INGESTION_KEY,
        camera_id: cameraA,
        camera_b_id: cameraB,
        computer_id: computer,
        arduino_id: arduino,
        signal_a_id: signalA.id,
        signal_b_id: signalB.id,
        reading_interval: 1.5,
        telemetry_interval: 15,
      };
  if (addCameraB) {
    const temp = destination + '.tmp';
    fs.writeFileSync(
      temp,
      JSON.stringify({ ...existingConfig, camera_b_id: cameraB }, null, 2) + '\n',
      { flag: 'wx' },
    );
    fs.renameSync(temp, destination);
  } else {
    fs.writeFileSync(
      destination,
      JSON.stringify(generatedConfig, null, 2) + '\n',
      { flag: 'wx' },
    );
  }
  console.log(
    (addCameraB ? 'Câmera B adicionada à configuração local.' : 'Ingestão configurada para as vias A e B.') +
      ' Segredo salvo apenas no arquivo local ignorado.',
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
