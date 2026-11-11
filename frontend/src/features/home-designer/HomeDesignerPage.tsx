import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, Html, OrbitControls } from '@react-three/drei';
import { ArrowLeft, Box, Lightbulb, Plus, RotateCcw, Save, Settings2, Trash2, Wifi, Zap } from 'lucide-react';
import { useHomeLabStore } from './store';
import type { HomeLabDeviceType, SmartDevice } from './types';
import './HomeDesignerPage.css';

const PROJECT_ID = 'homelab-demo-project';
const ROOM_ID = 'living-room';

const deviceCatalog: { type: HomeLabDeviceType; label: string; icon: typeof Box; description: string }[] = [
  { type: 'esp32', label: 'ESP32', icon: Wifi, description: 'Placa controladora Wi-Fi' },
  { type: 'lamp', label: 'Lâmpada', icon: Lightbulb, description: 'Ponto de iluminação' },
  { type: 'motion_sensor', label: 'Sensor PIR', icon: Zap, description: 'Detecção de movimento' },
  { type: 'switch', label: 'Interruptor', icon: Settings2, description: 'Acionamento manual' },
];

function DeviceModel({ device, selected, onSelect }: { device: SmartDevice; selected: boolean; onSelect: () => void }) {
  const color = selected ? '#60a5fa' : device.type === 'esp32' ? '#16865d' : device.type === 'lamp' ? '#fbbf24' : device.type === 'motion_sensor' ? '#a78bfa' : '#94a3b8';

  return (
    <group position={device.transform.position} rotation={device.transform.rotation} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      {device.type === 'lamp' ? (
        <>
          <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.055, 0.08, 0.16, 16]} /><meshStandardMaterial color="#64748b" /></mesh>
          <mesh position={[0, 0.27, 0]}><sphereGeometry args={[0.14, 20, 20]} /><meshStandardMaterial color={device.state.powered ? '#fff3b0' : '#cbd5e1'} emissive={device.state.powered ? '#fbbf24' : '#000000'} emissiveIntensity={device.state.powered ? 1.5 : 0} /></mesh>
          {device.state.powered && <pointLight position={[0, 0.28, 0]} intensity={1.2} distance={2.5} color="#ffd76a" />}
        </>
      ) : device.type === 'esp32' ? (
        <>
          <mesh position={[0, 0.07, 0]}><boxGeometry args={[0.72, 0.08, 0.42]} /><meshStandardMaterial color="#087f5b" /></mesh>
          <mesh position={[0, 0.125, 0]}><boxGeometry args={[0.28, 0.035, 0.25]} /><meshStandardMaterial color="#1f2937" metalness={0.45} roughness={0.35} /></mesh>
          {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[-0.29 + i * 0.083, 0.025, 0.235]}><boxGeometry args={[0.025, 0.035, 0.07]} /><meshStandardMaterial color="#d1a85b" metalness={0.7} /></mesh>)}
        </>
      ) : device.type === 'motion_sensor' ? (
        <>
          <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.32, 0.18, 0.24]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
          <mesh position={[0, 0.12, 0.13]}><sphereGeometry args={[0.09, 18, 18]} /><meshStandardMaterial color="#a78bfa" roughness={0.2} /></mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.22, 0.16, 0.08]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
          <mesh position={[0, 0.17, 0.045]}><boxGeometry args={[0.045, 0.025, 0.025]} /><meshStandardMaterial color="#64748b" /></mesh>
        </>
      )}
      {selected && <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.43, 0.47, 32]} /><meshBasicMaterial color="#60a5fa" side={2} /></mesh>}
      <Html position={[0, 0.52, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className={`homelab-object-label ${selected ? 'is-selected' : ''}`}>{device.name}</div>
      </Html>
    </group>
  );
}

function RoomScene() {
  const project = useHomeLabStore((state) => state.project);
  const projectName = useHomeLabStore((state) => state.project?.name ?? 'Novo projeto residencial');
  const renameProject = useHomeLabStore((state) => state.renameProject);
  const selectedDeviceId = useHomeLabStore((state) => state.selectedDeviceId);
  const selectDevice = useHomeLabStore((state) => state.selectDevice);
  const room = project?.rooms[0];
  const width = room?.width ?? 6;
  const depth = room?.depth ?? 5;
  const height = room?.height ?? 2.8;

  return (
    <>
      <color attach="background" args={['#111827']} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 8, 5]} intensity={2} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow onClick={() => selectDevice(null)}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#c8c4b8" roughness={0.88} />
      </mesh>
      <mesh position={[0, height / 2, -depth / 2]} receiveShadow>
        <boxGeometry args={[width, height, 0.12]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.92} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.12, height, depth]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.92} />
      </mesh>
      <Grid position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} args={[width, depth]} cellSize={0.5} cellThickness={0.5} cellColor="#64748b" sectionSize={1} sectionThickness={0.8} sectionColor="#475569" fadeDistance={20} infiniteGrid={false} />
      {project?.devices.map((device) => (
        <DeviceModel key={device.id} device={device} selected={selectedDeviceId === device.id} onSelect={() => selectDevice(device.id)} />
      ))}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={() => selectDevice(null)} visible={false}>
        <planeGeometry args={[width, depth]} /><meshBasicMaterial />
      </mesh>
      <OrbitControls makeDefault target={[0, 1, 0]} minDistance={4} maxDistance={15} maxPolarAngle={Math.PI / 2.05} />
    </>
  );
}

export function HomeDesignerPage() {
  const project = useHomeLabStore((state) => state.project);
  const setProject = useHomeLabStore((state) => state.setProject);
  const addDevice = useHomeLabStore((state) => state.addDevice);
  const removeDevice = useHomeLabStore((state) => state.removeDevice);
  const selectedDeviceId = useHomeLabStore((state) => state.selectedDeviceId);
  const selectDevice = useHomeLabStore((state) => state.selectDevice);
  const roomName = 'Sala de estar';

  useEffect(() => {
    if (!project) {
      setProject({
        id: PROJECT_ID,
        name: 'Minha primeira residência',
        rooms: [{ id: ROOM_ID, name: 'Sala de estar', width: 6, depth: 5, height: 2.8 }],
        devices: [],
        updatedAt: new Date().toISOString(),
      });
    }
  }, [project, setProject]);

  const activeProject = project;
  const selectedDevice = activeProject?.devices.find((device) => device.id === selectedDeviceId) ?? null;

  const addCatalogDevice = (type: HomeLabDeviceType) => {
    if (!activeProject) return;
    const count = activeProject.devices.filter((device) => device.type === type).length + 1;
    const position: [number, number, number] = [
      -1.8 + ((activeProject.devices.length % 4) * 1.05),
      0,
      -1.1 + (Math.floor(activeProject.devices.length / 4) * 0.85),
    ];
    const names: Record<HomeLabDeviceType, string> = {
      esp32: 'ESP32', lamp: 'Lâmpada', motion_sensor: 'Sensor PIR', switch: 'Interruptor',
      outlet: 'Tomada', television: 'TV', air_conditioner: 'Ar-condicionado',
    };
    addDevice({
      id: crypto.randomUUID(),
      projectId: activeProject.id,
      roomId: activeProject.rooms[0]?.id ?? ROOM_ID,
      type,
      name: `${names[type]} ${count}`,
      transform: { position, rotation: [0, 0, 0], scale: [1, 1, 1] },
      state: { powered: false, detected: false },
    });
  };

  return (
    <main className="homelab-page">
      <header className="homelab-topbar">
        <a className="homelab-back" href="/editor" aria-label="Voltar ao simulador"><ArrowLeft size={17} /></a>
        <div className="homelab-brand-mark"><Box size={18} /></div>
        <div className="homelab-brand-copy"><strong>HomeLab Studio</strong><span>Projetista residencial</span></div>
        <div className="homelab-topbar-spacer" />
        <span className="homelab-save-status"><span /> Projeto local</span>
        <button className="homelab-top-button" type="button" onClick={() => window.alert('Salvamento em nuvem será conectado na próxima etapa.')}><Save size={15} /> Salvar</button>
      </header>

      <div className="homelab-workspace">
        <aside className="homelab-sidebar">
          <div className="homelab-sidebar-heading"><span>PROJETO</span><button type="button" title="Novo projeto" onClick={() => { setProject({ id: crypto.randomUUID(), name: 'Novo projeto residencial', rooms: [{ id: crypto.randomUUID(), name: 'Sala de estar', width: 6, depth: 5, height: 2.8 }], devices: [], updatedAt: new Date().toISOString() }); }}><Plus size={15} /></button></div>
          <input className="homelab-project-input" aria-label="Nome do projeto" value={projectName} onChange={(event) => renameProject(event.target.value)} />
          <div className="homelab-sidebar-heading room-heading"><span>AMBIENTES</span><button type="button" title="Adicionar ambiente" onClick={() => window.alert('A criação de múltiplos cômodos será adicionada na próxima etapa.')}><Plus size={15} /></button></div>
          <button className="homelab-room-item active" type="button"><span className="room-icon"><Box size={16} /></span><span>{roomName}</span><span className="room-count">{activeProject?.devices.length ?? 0}</span></button>

          <div className="homelab-sidebar-heading catalog-heading"><span>DISPOSITIVOS</span><span className="catalog-count">{activeProject?.devices.length ?? 0}</span></div>
          <p className="homelab-sidebar-hint">Selecione para adicionar à sala</p>
          <div className="homelab-device-catalog">
            {deviceCatalog.map((item) => {
              const Icon = item.icon;
              return <button className="homelab-catalog-item" key={item.type} type="button" onClick={() => addCatalogDevice(item.type)}><span className={`catalog-icon icon-${item.type}`}><Icon size={17} /></span><span className="catalog-copy"><strong>{item.label}</strong><small>{item.description}</small></span><Plus size={15} className="catalog-add" /></button>;
            })}
          </div>
          <div className="homelab-sidebar-footer"><span className="status-dot" /> Editor 3D experimental</div>
        </aside>

        <section className="homelab-main">
          <div className="homelab-scene-toolbar">
            <div><span className="breadcrumb-muted">Projetos</span><span className="breadcrumb-separator">/</span><strong>{roomName}</strong></div>
            <div className="scene-tools"><span className="scene-hint">Arraste para orbitar · Scroll para zoom</span><button type="button" title="Restaurar câmera" onClick={() => window.location.reload()}><RotateCcw size={15} /></button></div>
          </div>
          <div className="homelab-canvas-wrap">
            <Canvas shadows camera={{ position: [8, 7, 9], fov: 42 }} dpr={[1, 2]}>
              <RoomScene />
            </Canvas>
            <div className="homelab-canvas-caption"><span className="canvas-live-dot" /> VISUALIZAÇÃO 3D <span>·</span> {activeProject?.devices.length ?? 0} dispositivos</div>
            <div className="homelab-canvas-controls"><span>3D</span><span>Perspectiva</span></div>
          </div>
          <footer className="homelab-bottom-bar"><span><kbd>Botão esquerdo</kbd> Orbitar</span><span><kbd>Scroll</kbd> Zoom</span><span><kbd>Clique</kbd> Selecionar dispositivo</span><span className="homelab-dimensions">Sala: 6,0 × 5,0 m</span></footer>
        </section>

        <aside className="homelab-inspector">
          <div className="inspector-header"><strong>Propriedades</strong><Settings2 size={17} /></div>
          {selectedDevice ? (
            <div className="inspector-content">
              <div className="inspector-device-icon"><Box size={22} /></div>
              <label>Nome do dispositivo</label>
              <input value={selectedDevice.name} onChange={(event) => useHomeLabStore.getState().updateDevice(selectedDevice.id, { name: event.target.value })} />
              <label>Tipo</label><div className="inspector-static-value">{deviceCatalog.find((item) => item.type === selectedDevice.type)?.label ?? selectedDevice.type}</div>
              <label>Vínculo de simulação</label><div className="inspector-binding">{selectedDevice.simulation ? 'ESP32 vinculada' : 'Não vinculado'}<small>{selectedDevice.simulation ? selectedDevice.simulation.language : 'Vincule uma placa no laboratório IoT'}</small></div>
              <label>Posição (X / Z)</label><div className="inspector-coordinates"><span>{selectedDevice.transform.position[0].toFixed(2)} m</span><span>{selectedDevice.transform.position[2].toFixed(2)} m</span></div>
              <button className="homelab-delete-button" type="button" onClick={() => removeDevice(selectedDevice.id)}><Trash2 size={15} /> Remover dispositivo</button>
            </div>
          ) : (
            <div className="inspector-empty"><div><Settings2 size={23} /></div><strong>Nenhum item selecionado</strong><p>Selecione um dispositivo na cena para editar suas propriedades.</p></div>
          )}
          <div className="inspector-room-card"><span>AMBIENTE ATUAL</span><strong>{roomName}</strong><small>6,0 m × 5,0 m · Pé-direito 2,8 m</small></div>
        </aside>
      </div>
    </main>
  );
}
