import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, Html, OrbitControls, TransformControls } from '@react-three/drei';
import { ArrowLeft, Box, Lightbulb, Plus, RotateCcw, Save, Settings2, Trash2, Wifi, Zap } from 'lucide-react';
import { useHomeLabStore } from './store';
import type { DeviceMount, DeviceTransform, FurnitureType, HomeFurniture, HomeLabDeviceType, HomeRoom, RoomOpening, SmartDevice, WallSide } from './types';
import { Plane, Vector3 } from 'three';
import type { Group } from 'three';
import './HomeDesignerPage.css';
import { HouseOverviewScene } from './HouseOverviewScene';
import { RoomArchitecture } from './RoomArchitecture';
import { FloorPlan2D } from './FloorPlan2D';
import { HousePlan2D } from './HousePlan2D';
import { findFurniturePlacement, resolveFurnitureTransform } from './furniture-geometry';

const PROJECT_ID = 'homelab-demo-project';
const ROOM_ID = 'living-room';

const deviceCatalog: { type: HomeLabDeviceType; label: string; icon: typeof Box; description: string }[] = [
  { type: 'esp32', label: 'ESP32', icon: Wifi, description: 'Placa controladora Wi-Fi' },
  { type: 'lamp', label: 'Lâmpada', icon: Lightbulb, description: 'Ponto de iluminação' },
  { type: 'motion_sensor', label: 'Sensor PIR', icon: Zap, description: 'Detecção de movimento' },
  { type: 'switch', label: 'Interruptor', icon: Settings2, description: 'Acionamento manual' },
  { type: 'outlet', label: 'Tomada', icon: Box, description: 'Ponto de energia' },
  { type: 'television', label: 'Televisão', icon: Box, description: 'Equipamento de parede' },
  { type: 'air_conditioner', label: 'Ar-condicionado', icon: Box, description: 'Unidade interna' },
];

const furnitureCatalog: { type: FurnitureType; label: string; size: [number, number, number] }[] = [
  { type: 'bed', label: 'Cama', size: [1.6, 2, 0.55] },
  { type: 'sofa', label: 'Sofá', size: [2, 0.85, 0.85] },
  { type: 'table', label: 'Mesa', size: [1.2, 0.8, 0.75] },
  { type: 'chair', label: 'Cadeira', size: [0.48, 0.48, 0.9] },
  { type: 'wardrobe', label: 'Guarda-roupa', size: [1.6, 0.6, 2.1] },
  { type: 'refrigerator', label: 'Geladeira', size: [0.75, 0.75, 1.85] },
  { type: 'sink', label: 'Pia / bancada', size: [1.2, 0.6, 0.9] },
  { type: 'shower', label: 'Chuveiro', size: [0.9, 0.9, 2.1] },
];

type TransformMode = 'translate' | 'rotate' | 'scale';

const wallSides: { value: WallSide; label: string }[] = [
  { value: 'north', label: 'Norte' }, { value: 'south', label: 'Sul' },
  { value: 'east', label: 'Leste' }, { value: 'west', label: 'Oeste' },
];

function getMountedTransform(device: SmartDevice, room?: HomeRoom): DeviceTransform {
  const mount = device.mount;
  if (!room || !mount || mount.surface !== 'wall') return device.transform;
  const wall = mount.wall ?? 'north';
  const horizontal = wall === 'north' || wall === 'south';
  const length = horizontal ? room.width : room.depth;
  const offset = Math.max(-length / 2 + 0.15, Math.min(length / 2 - 0.15, mount.offset));
  const y = Math.max(0.15, Math.min(room.height - 0.15, mount.height));
  const position: [number, number, number] = wall === 'north' ? [offset, y, -room.depth / 2 + 0.09]
    : wall === 'south' ? [offset, y, room.depth / 2 - 0.09]
      : wall === 'east' ? [room.width / 2 - 0.09, y, offset]
        : [-room.width / 2 + 0.09, y, offset];
  const yaw = wall === 'south' ? Math.PI : wall === 'east' ? -Math.PI / 2 : wall === 'west' ? Math.PI / 2 : 0;
  return { ...device.transform, position, rotation: [0, yaw, 0] };
}

function DeviceModel({ device, transform, selected, onSelect, transformMode, onTransform }: {
  device: SmartDevice;
  transform: DeviceTransform;
  selected: boolean;
  onSelect: () => void;
  transformMode: TransformMode;
  onTransform: (transform: DeviceTransform) => void;
}) {
  const groupRef = useRef<Group>(null);

  const commitTransform = () => {
    const object = groupRef.current;
    if (!object) return;
    onTransform({
      position: [object.position.x, object.position.y, object.position.z],
      rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
      scale: [object.scale.x, object.scale.y, object.scale.z],
    });
  };

  return (
    <>
    <group ref={groupRef} position={transform.position} rotation={transform.rotation} scale={transform.scale} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
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
      ) : device.type === 'television' ? (
        <>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[1.2, 0.72, 0.07]} /><meshStandardMaterial color="#111827" metalness={0.35} roughness={0.25} /></mesh>
          <mesh position={[0, 0.08, 0.041]}><boxGeometry args={[1.12, 0.64, 0.008]} /><meshStandardMaterial color="#172b45" emissive="#0b1d35" emissiveIntensity={0.25} /></mesh>
        </>
      ) : device.type === 'air_conditioner' ? (
        <>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.95, 0.25, 0.22]} /><meshStandardMaterial color="#f1f5f9" roughness={0.45} /></mesh>
          <mesh position={[0, -0.015, 0.105]}><boxGeometry args={[0.78, 0.025, 0.025]} /><meshStandardMaterial color="#64748b" /></mesh>
        </>
      ) : device.type === 'outlet' ? (
        <>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.22, 0.16, 0.035]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[-0.035, 0.08, 0.021]}><boxGeometry args={[0.018, 0.055, 0.008]} /><meshStandardMaterial color="#475569" /></mesh>
          <mesh position={[0.035, 0.08, 0.021]}><boxGeometry args={[0.018, 0.055, 0.008]} /><meshStandardMaterial color="#475569" /></mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.22, 0.16, 0.035]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
          <mesh position={[0, 0.08, 0.025]}><boxGeometry args={[0.045, 0.06, 0.018]} /><meshStandardMaterial color="#64748b" /></mesh>
        </>
      )}
      {selected && device.mount?.surface !== 'wall' && <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.43, 0.47, 32]} /><meshBasicMaterial color="#60a5fa" side={2} /></mesh>}
      <Html position={[0, 0.52, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className={`homelab-object-label ${selected ? 'is-selected' : ''}`}>{device.name}</div>
      </Html>
    </group>
    {selected && device.mount?.surface !== 'wall' && (
      <TransformControls
        object={groupRef}
        mode={transformMode}
        size={0.8}
        translationSnap={0.25}
        rotationSnap={Math.PI / 12}
        scaleSnap={0.1}
        onMouseUp={commitTransform}
      />
    )}
    </>
  );
}

function FurnitureModel({ item, selected, onSelect, transformMode, onTransform }: {
  item: HomeFurniture;
  selected: boolean;
  onSelect: () => void;
  transformMode: TransformMode;
  onTransform: (transform: DeviceTransform) => void;
}) {
  const groupRef = useRef<Group>(null);
  const [width, height, depth] = [item.size.width, item.size.height, item.size.depth];
  const commitTransform = () => {
    const object = groupRef.current;
    if (!object) return;
    onTransform({
      position: [object.position.x, object.position.y, object.position.z],
      rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
      scale: [object.scale.x, object.scale.y, object.scale.z],
    });
  };
  const wood = '#9a7555';
  return (
    <>
      <group ref={groupRef} position={item.transform.position} rotation={item.transform.rotation} scale={item.transform.scale}
        onClick={(event) => { event.stopPropagation(); onSelect(); }}>
        {item.type === 'bed' ? (
          <>
            <mesh position={[0, height * 0.38, 0]}><boxGeometry args={[width, height * 0.55, depth]} /><meshStandardMaterial color="#b8c5d2" /></mesh>
            <mesh position={[0, height * 0.72, -depth * 0.32]}><boxGeometry args={[width * 0.9, height * 0.18, depth * 0.25]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
            <mesh position={[0, height * 0.12, 0]}><boxGeometry args={[width + 0.08, height * 0.2, depth + 0.08]} /><meshStandardMaterial color={wood} /></mesh>
          </>
        ) : item.type === 'sofa' ? (
          <>
            <mesh position={[0, height * 0.35, 0]}><boxGeometry args={[width, height * 0.42, depth]} /><meshStandardMaterial color="#647f91" /></mesh>
            <mesh position={[0, height * 0.72, -depth * 0.38]}><boxGeometry args={[width, height * 0.55, depth * 0.22]} /><meshStandardMaterial color="#526b7d" /></mesh>
            {[-1, 1].map((side) => <mesh key={side} position={[side * width * 0.46, height * 0.48, 0]}><boxGeometry args={[width * 0.09, height * 0.65, depth]} /><meshStandardMaterial color="#526b7d" /></mesh>)}
          </>
        ) : item.type === 'chair' ? (
          <>
            <mesh position={[0, height * 0.48, 0]}><boxGeometry args={[width, 0.08, depth]} /><meshStandardMaterial color={wood} /></mesh>
            <mesh position={[0, height * 0.78, -depth * 0.42]}><boxGeometry args={[width, height * 0.45, 0.07]} /><meshStandardMaterial color={wood} /></mesh>
            {[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={x + ':' + z} position={[x * width * 0.4, height * 0.22, z * depth * 0.4]}><boxGeometry args={[0.055, height * 0.45, 0.055]} /><meshStandardMaterial color={wood} /></mesh>))}
          </>
        ) : item.type === 'table' || item.type === 'sink' ? (
          <>
            <mesh position={[0, height * 0.9, 0]}><boxGeometry args={[width, 0.09, depth]} /><meshStandardMaterial color={item.type === 'sink' ? '#cbd5e1' : wood} /></mesh>
            {[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={x + ':' + z} position={[x * width * 0.43, height * 0.43, z * depth * 0.4]}><boxGeometry args={[0.07, height * 0.85, 0.07]} /><meshStandardMaterial color={wood} /></mesh>))}
            {item.type === 'sink' && <mesh position={[0, height * 0.98, 0]}><boxGeometry args={[width * 0.34, 0.025, depth * 0.5]} /><meshStandardMaterial color="#64748b" /></mesh>}
          </>
        ) : item.type === 'shower' ? (
          <>
            <mesh position={[0, 0.04, 0]}><boxGeometry args={[width, 0.08, depth]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
            <mesh position={[0, height * 0.48, -depth * 0.43]}><boxGeometry args={[width, height * 0.9, 0.035]} /><meshStandardMaterial color="#93c5fd" transparent opacity={0.35} /></mesh>
            <mesh position={[0, height * 0.94, 0]}><cylinderGeometry args={[0.12, 0.12, 0.035, 20]} /><meshStandardMaterial color="#94a3b8" /></mesh>
          </>
        ) : (
          <mesh position={[0, height / 2, 0]}><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={item.type === 'refrigerator' ? '#dbe4ea' : wood} roughness={0.55} /></mesh>
        )}
        {selected && <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[Math.max(width, depth) * 0.48, Math.max(width, depth) * 0.51, 32]} /><meshBasicMaterial color="#60a5fa" side={2} /></mesh>}
        <Html position={[0, height + 0.12, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className={`homelab-object-label ${selected ? 'is-selected' : ''}`}>{item.name}</div>
        </Html>
      </group>
      {selected && <TransformControls object={groupRef} mode={transformMode} size={0.8} translationSnap={0.25}
        rotationSnap={Math.PI / 12} scaleSnap={0.1} onMouseUp={commitTransform} />}
    </>
  );
}

function RoomScene({ transformMode }: { transformMode: TransformMode }) {
  const project = useHomeLabStore((state) => state.project);
  const selectedDeviceId = useHomeLabStore((state) => state.selectedDeviceId);
  const selectedFurnitureId = useHomeLabStore((state) => state.selectedFurnitureId);
  const selectedRoomId = useHomeLabStore((state) => state.selectedRoomId);
  const selectDevice = useHomeLabStore((state) => state.selectDevice);
  const selectFurniture = useHomeLabStore((state) => state.selectFurniture);
  const updateFurniture = useHomeLabStore((state) => state.updateFurniture);
  const updateDevice = useHomeLabStore((state) => state.updateDevice);
  const draggingFurnitureId = useRef<string | null>(null);
  const suppressFloorClick = useRef(false);
  const dragPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const room = project?.rooms.find((item) => item.id === selectedRoomId) ?? project?.rooms[0];
  const width = room?.width ?? 6;
  const depth = room?.depth ?? 5;
  const height = room?.height ?? 2.8;

  return (
    <>
      <color attach="background" args={['#111827']} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 8, 5]} intensity={2} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow
        onClick={() => {
          if (suppressFloorClick.current) { suppressFloorClick.current = false; return; }
          selectDevice(null); selectFurniture(null);
        }}
        onPointerDown={(event) => {
          if (!selectedFurnitureId || !room) return;
          event.stopPropagation();
          event.nativeEvent.preventDefault();
          event.nativeEvent.stopImmediatePropagation();
          draggingFurnitureId.current = selectedFurnitureId;
          suppressFloorClick.current = true;
        }}
        onPointerMove={(event) => {
          const itemId = draggingFurnitureId.current;
          if (!itemId || !room || !project) return;
          event.stopPropagation();
          const current = project.furniture?.find((item) => item.id === itemId);
          if (!current) return;
          const point = event.ray.intersectPlane(dragPlane.current, new Vector3());
          if (!point) return;
          const candidate: DeviceTransform = {
            ...current.transform,
            position: [point.x, 0, point.z],
          };
          updateFurniture(itemId, {
            transform: resolveFurnitureTransform(current, candidate, room, (project.furniture ?? []).filter((item) => item.roomId === room.id)),
          });
        }}
        onPointerUp={(event) => {
          if (draggingFurnitureId.current) event.stopPropagation();
          draggingFurnitureId.current = null;
        }}
        onPointerLeave={() => { draggingFurnitureId.current = null; }}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#c8c4b8" roughness={0.88} />
      </mesh>
      {room && <RoomArchitecture room={room} />}
      <Grid position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} args={[width, depth]} cellSize={0.5} cellThickness={0.5} cellColor="#64748b" sectionSize={1} sectionThickness={0.8} sectionColor="#475569" fadeDistance={20} infiniteGrid={false} />
      {project?.devices.filter((device) => device.roomId === room?.id).map((device) => (
        <DeviceModel
          key={device.id}
          device={device}
          transform={getMountedTransform(device, room)}
          selected={selectedDeviceId === device.id}
          onSelect={() => selectDevice(device.id)}
          transformMode={transformMode}
          onTransform={(transform) => updateDevice(device.id, { transform })}
        />
      ))}
      {(project?.furniture ?? []).filter((item) => item.roomId === room?.id).map((item) => (
        <FurnitureModel key={item.id} item={item} selected={selectedFurnitureId === item.id}
          onSelect={() => selectFurniture(item.id)} transformMode={transformMode}
          onTransform={(transform) => updateFurniture(item.id, { transform: resolveFurnitureTransform(item, transform, room!, (project?.furniture ?? []).filter((entry) => entry.roomId === room!.id)) })} />
      ))}
      <OrbitControls makeDefault target={[0, 1, 0]} minDistance={4} maxDistance={15} maxPolarAngle={Math.PI / 2.05} />
    </>
  );
}

export function HomeDesignerPage() {
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [houseOverview, setHouseOverview] = useState(false);
  const [floorPlan2D, setFloorPlan2D] = useState(false);
  const [housePlan2D, setHousePlan2D] = useState(false);
  const project = useHomeLabStore((state) => state.project);
  const projectName = useHomeLabStore((state) => state.project?.name ?? 'Novo projeto residencial');
  const renameProject = useHomeLabStore((state) => state.renameProject);
  const setProject = useHomeLabStore((state) => state.setProject);
  const addDevice = useHomeLabStore((state) => state.addDevice);
  const addFurniture = useHomeLabStore((state) => state.addFurniture);
  const removeFurniture = useHomeLabStore((state) => state.removeFurniture);
  const removeDevice = useHomeLabStore((state) => state.removeDevice);
  const selectedDeviceId = useHomeLabStore((state) => state.selectedDeviceId);
  const selectedFurnitureId = useHomeLabStore((state) => state.selectedFurnitureId);
  const selectedRoomId = useHomeLabStore((state) => state.selectedRoomId);
  const selectDevice = useHomeLabStore((state) => state.selectDevice);
  const selectRoom = useHomeLabStore((state) => state.selectRoom);
  const addRoom = useHomeLabStore((state) => state.addRoom);
  const updateRoom = useHomeLabStore((state) => state.updateRoom);

  useEffect(() => {
    if (!project) {
      setProject({
        id: PROJECT_ID,
        name: 'Minha primeira residência',
        rooms: [{ id: ROOM_ID, name: 'Sala de estar', width: 6, depth: 5, height: 2.8, position: { x: 0, z: 0 } }],
        devices: [],
        updatedAt: new Date().toISOString(),
      });
    }
  }, [project, setProject]);

  useEffect(() => {
    if (!project || project.rooms.every((room) => room.position)) return;
    const maxWidth = Math.max(...project.rooms.map((room) => room.width), 4);
    const maxDepth = Math.max(...project.rooms.map((room) => room.depth), 4);
    const columns = Math.min(2, project.rooms.length);
    const rows = Math.ceil(project.rooms.length / Math.max(columns, 1));
    project.rooms.forEach((room, index) => {
      if (room.position) return;
      const column = index % columns;
      const row = Math.floor(index / columns);
      updateRoom(room.id, {
        position: {
          x: column * (maxWidth + 1.5) - ((columns - 1) * (maxWidth + 1.5)) / 2,
          z: row * (maxDepth + 1.5) - ((rows - 1) * (maxDepth + 1.5)) / 2,
        },
      });
    });
  }, [project, updateRoom]);

  const activeProject = project;
  const activeRoom = activeProject?.rooms.find((room) => room.id === selectedRoomId) ?? activeProject?.rooms[0] ?? null;
  const roomName = activeRoom?.name ?? 'Ambiente';
  const selectedDevice = activeProject?.devices.find((device) => device.id === selectedDeviceId) ?? null;
  const selectedFurniture = activeProject?.furniture?.find((item) => item.id === selectedFurnitureId) ?? null;
  const roomDevices = activeProject?.devices.filter((device) => device.roomId === activeRoom?.id) ?? [];
  const roomFurniture = activeProject?.furniture?.filter((item) => item.roomId === activeRoom?.id) ?? [];

  const updateSelectedFurnitureSize = (patch: Partial<HomeFurniture['size']>) => {
    if (!selectedFurniture || !activeRoom) return;
    const nextSize = { ...selectedFurniture.size, ...patch };
    const candidateTransform: DeviceTransform = {
      ...selectedFurniture.transform,
      position: [...selectedFurniture.transform.position],
    };
    const roomItems = (activeProject?.furniture ?? []).filter((item) => item.roomId === activeRoom.id);
    const resolved = resolveFurnitureTransform(
      { ...selectedFurniture, size: nextSize },
      candidateTransform,
      activeRoom,
      roomItems,
    );
    if (resolved === selectedFurniture.transform) return;
    useHomeLabStore.getState().updateFurniture(selectedFurniture.id, { size: nextSize, transform: resolved });
  };

  const updateOpening = (openingId: string, patch: Partial<RoomOpening>) => {
    if (!activeRoom) return;
    const current = activeRoom.openings ?? [];
    const updated = current.map((opening) => {
      if (opening.id !== openingId) return opening;
      const next = { ...opening, ...patch };
      const wallLength = next.wall === 'north' || next.wall === 'south' ? activeRoom.width : activeRoom.depth;
      next.width = Math.max(0.4, Math.min(wallLength - 0.2, next.width));
      next.offset = Math.max(-wallLength / 2 + next.width / 2 + 0.05, Math.min(wallLength / 2 - next.width / 2 - 0.05, next.offset));
      next.height = Math.max(0.3, Math.min(activeRoom.height - 0.1, next.height));
      next.sillHeight = next.type === 'door' ? 0 : Math.max(0, Math.min(activeRoom.height - next.height - 0.05, next.sillHeight));
      return next;
    });
    updateRoom(activeRoom.id, { openings: updated });
  };

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
      roomId: activeRoom?.id ?? activeProject.rooms[0]?.id ?? ROOM_ID,
      type,
      name: `${names[type]} ${count}`,
      transform: { position, rotation: [0, 0, 0], scale: [1, 1, 1] },
      state: { powered: false, detected: false },
    });
  };

  const addCatalogFurniture = (type: FurnitureType) => {
    if (!activeProject || !activeRoom) return;
    const definition = furnitureCatalog.find((item) => item.type === type);
    if (!definition) return;
    const count = (activeProject.furniture ?? []).filter((item) => item.type === type).length + 1;
    const [width, depth, height] = definition.size;
    const item: HomeFurniture = {
      id: crypto.randomUUID(), projectId: activeProject.id, roomId: activeRoom.id, type,
      name: `${definition.label} ${count}`,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      size: { width, depth, height },
    };
    const placement = findFurniturePlacement(item, activeRoom, roomFurniture);
    if (!placement) {
      window.alert('Não há espaço livre suficiente neste cômodo para esse objeto.');
      return;
    }
    addFurniture({ ...item, transform: placement });
  };

  return (
    <main className="homelab-page">
      <header className="homelab-topbar">
        <a className="homelab-back" href="/editor" aria-label="Voltar ao simulador"><ArrowLeft size={17} /></a>
        <div className="homelab-brand-mark"><Box size={18} /></div>
        <div className="homelab-brand-copy"><strong>HomeLab Studio</strong><span>Projetista residencial</span></div>
        <div className="homelab-topbar-spacer" />
        <span className="homelab-save-status"><span /> Salvamento automático</span>
        <button className="homelab-top-button" type="button" onClick={() => window.alert('Projeto salvo automaticamente neste navegador.')}><Save size={15} /> Salvar</button>
      </header>

      <div className="homelab-workspace">
        <aside className="homelab-sidebar">
          <div className="homelab-sidebar-heading"><span>PROJETO</span><button type="button" title="Novo projeto" onClick={() => { setProject({ id: crypto.randomUUID(), name: 'Novo projeto residencial', rooms: [{ id: crypto.randomUUID(), name: 'Sala de estar', width: 6, depth: 5, height: 2.8, position: { x: 0, z: 0 } }], devices: [], updatedAt: new Date().toISOString() }); }}><Plus size={15} /></button></div>
          <input className="homelab-project-input" aria-label="Nome do projeto" value={projectName} onChange={(event) => renameProject(event.target.value)} />
          <div className="homelab-sidebar-heading room-heading"><span>AMBIENTES</span><button type="button" title="Adicionar ambiente" onClick={() => {
            const number = (activeProject?.rooms.length ?? 0) + 1;
            const anchor = activeRoom;
            addRoom({ id: crypto.randomUUID(), name: `Novo ambiente ${number}`, width: 4, depth: 4, height: 2.8, position: anchor ? { x: (anchor.position?.x ?? 0) + anchor.width / 2 + 2, z: anchor.position?.z ?? 0 } : { x: 0, z: 0 } });
          }}><Plus size={15} /></button></div>
          <div className="homelab-room-list">
            {activeProject?.rooms.map((room) => (
              <button className={`homelab-room-item ${activeRoom?.id === room.id ? 'active' : ''}`} key={room.id} type="button" onClick={() => selectRoom(room.id)}>
                <span className="room-icon"><Box size={16} /></span><span>{room.name}</span>
                <span className="room-count">{activeProject.devices.filter((device) => device.roomId === room.id).length}</span>
              </button>
            ))}
          </div>

          <div className="homelab-sidebar-heading catalog-heading"><span>DISPOSITIVOS</span><span className="catalog-count">{activeProject?.devices.length ?? 0}</span></div>
          <p className="homelab-sidebar-hint">Selecione para adicionar à sala</p>
          <div className="homelab-device-catalog">
            {deviceCatalog.map((item) => {
              const Icon = item.icon;
              return <button className="homelab-catalog-item" key={item.type} type="button" onClick={() => addCatalogDevice(item.type)}><span className={`catalog-icon icon-${item.type}`}><Icon size={17} /></span><span className="catalog-copy"><strong>{item.label}</strong><small>{item.description}</small></span><Plus size={15} className="catalog-add" /></button>;
            })}
          </div>
          <div className="homelab-sidebar-heading catalog-heading"><span>MÓVEIS E OBJETOS</span><span className="catalog-count">{activeProject?.furniture?.length ?? 0}</span></div>
          <p className="homelab-sidebar-hint">Adicione itens para compor o ambiente</p>
          <div className="homelab-device-catalog">
            {furnitureCatalog.map((item) => (
              <button className="homelab-catalog-item" key={item.type} type="button" onClick={() => addCatalogFurniture(item.type)}>
                <span className="catalog-icon icon-furniture"><Box size={17} /></span>
                <span className="catalog-copy"><strong>{item.label}</strong><small>{item.size[0]} × {item.size[1]} × {item.size[2]} m</small></span>
                <Plus size={15} className="catalog-add" />
              </button>
            ))}
          </div>
          <div className="homelab-sidebar-footer"><span className="status-dot" /> Editor 3D experimental</div>
        </aside>

        <section className="homelab-main">
          <div className="homelab-scene-toolbar">
            <div><span className="breadcrumb-muted">Projetos</span><span className="breadcrumb-separator">/</span><strong>{houseOverview ? 'Visão da casa' : roomName}</strong></div>
            <div className="scene-tools">
              <div className="homelab-view-toggle" role="group" aria-label="Modo de visualização">
                <button type="button" className={!houseOverview && !floorPlan2D && !housePlan2D ? 'active' : ''} onClick={() => { setHouseOverview(false); setFloorPlan2D(false); setHousePlan2D(false); }}>3D</button>
                <button type="button" className={floorPlan2D ? 'active' : ''} onClick={() => { setHouseOverview(false); setFloorPlan2D(true); }}>Planta 2D</button>
                <button type="button" className={housePlan2D ? 'active' : ''} onClick={() => { setHouseOverview(false); setFloorPlan2D(false); setHousePlan2D(true); selectDevice(null); }}>Planta casa</button>
                <button type="button" className={houseOverview ? 'active' : ''} onClick={() => { setHouseOverview(true); setFloorPlan2D(false); setHousePlan2D(false); selectDevice(null); }}>Visão 3D da casa</button>
              </div>
              {(selectedDevice || selectedFurniture) && !houseOverview && !floorPlan2D && !housePlan2D && (
                <div className="homelab-transform-tools" role="group" aria-label="Ferramenta de transformação">
                  <button type="button" className={transformMode === 'translate' ? 'active' : ''} onClick={() => setTransformMode('translate')}>Mover</button>
                  <button type="button" className={transformMode === 'rotate' ? 'active' : ''} onClick={() => setTransformMode('rotate')}>Girar</button>
                  <button type="button" className={transformMode === 'scale' ? 'active' : ''} onClick={() => setTransformMode('scale')}>Escala</button>
                </div>
              )}
              <span className="scene-hint">{housePlan2D ? 'Planta completa · arraste cômodos, portas e janelas' : floorPlan2D ? 'Vista superior · arraste móveis e dispositivos para reposicionar' : houseOverview ? 'Visão 3D geral · selecione um cômodo ou dispositivo' : 'Selecione um móvel e arraste no piso para reposicionar · Scroll para zoom'}</span>
              <button type="button" title="Restaurar câmera" onClick={() => window.location.reload()}><RotateCcw size={15} /></button>
            </div>
          </div>
          <div className={`homelab-canvas-wrap ${floorPlan2D || housePlan2D ? 'is-plan2d' : ''}`}>
            {housePlan2D && activeProject ? (
              <HousePlan2D
                rooms={activeProject.rooms}
                selectedRoomId={activeRoom?.id ?? null}
                onSelectRoom={(id) => selectRoom(id)}
                onUpdateRoom={(id, position) => updateRoom(id, { position })}
                onResizeRoom={(id, patch) => updateRoom(id, patch)}
                onUpdateOpening={(roomId, openingId, offset) => {
                  const room = activeProject.rooms.find((entry) => entry.id === roomId);
                  if (!room) return;
                  const openings = (room.openings ?? []).map((opening) => opening.id === openingId ? { ...opening, offset } : opening);
                  updateRoom(roomId, { openings });
                }}
              />
            ) : floorPlan2D && activeRoom ? (
              <FloorPlan2D
                room={activeRoom}
                furniture={roomFurniture}
                devices={roomDevices}
                selectedFurnitureId={selectedFurnitureId}
                selectedDeviceId={selectedDeviceId}
                onSelectFurniture={(id) => useHomeLabStore.getState().selectFurniture(id)}
                onSelectDevice={(id) => selectDevice(id)}
                onUpdateFurniture={(id, transform) => {
                  const item = roomFurniture.find((entry) => entry.id === id);
                  if (!item) return;
                  const resolved = resolveFurnitureTransform(item, transform, activeRoom, roomFurniture);
                  useHomeLabStore.getState().updateFurniture(id, { transform: resolved });
                }}
                onUpdateDevice={(id, transform) => useHomeLabStore.getState().updateDevice(id, { transform })}
              />
            ) : (
              <Canvas shadows camera={{ position: [8, 7, 9], fov: 42 }} dpr={[1, 2]}>
                {houseOverview ? <HouseOverviewScene /> : <RoomScene transformMode={transformMode} />}
              </Canvas>
            )}
            <div className="homelab-canvas-caption"><span className="canvas-live-dot" /> {housePlan2D ? 'PLANTA GERAL 2D' : floorPlan2D ? 'PLANTA BAIXA 2D' : houseOverview ? 'VISÃO 3D DA CASA' : 'VISUALIZAÇÃO 3D'} <span>·</span> {houseOverview ? (activeProject?.rooms.length ?? 0) + ' ambientes · ' + (activeProject?.devices.length ?? 0) + ' dispositivos' : roomDevices.length + ' dispositivos · ' + roomFurniture.length + ' móveis'}</div>
            {!floorPlan2D && !housePlan2D && <div className="homelab-canvas-controls"><span>{houseOverview ? 'CASA' : '3D'}</span><span>{houseOverview ? 'Visão geral' : 'Perspectiva'}</span></div>}
          </div>
          <footer className="homelab-bottom-bar"><span><kbd>{housePlan2D ? 'Arrastar cômodo/abertura' : floorPlan2D ? 'Arrastar item' : 'Botão esquerdo'}</kbd> {housePlan2D ? 'Reposicionar' : floorPlan2D ? 'Reposicionar' : 'Orbitar'}</span><span><kbd>{floorPlan2D || housePlan2D ? 'Grade' : 'Scroll'}</kbd> {floorPlan2D || housePlan2D ? '25 cm' : 'Zoom'}</span><span><kbd>Seleção</kbd> Móveis e dispositivos</span><span className="homelab-dimensions">{houseOverview ? `${activeProject?.rooms.length ?? 0} ambientes` : activeRoom ? `${activeRoom.width.toFixed(1)} × ${activeRoom.depth.toFixed(1)} m` : 'Sem ambiente'}</span></footer>
        </section>

        <aside className="homelab-inspector">
          <div className="inspector-header"><strong>Propriedades</strong><Settings2 size={17} /></div>
          {selectedFurniture ? (
            <div className="inspector-content">
              <div className="inspector-device-icon"><Box size={22} /></div>
              <label>Nome do móvel / objeto</label>
              <input value={selectedFurniture.name} onChange={(event) => useHomeLabStore.getState().updateFurniture(selectedFurniture.id, { name: event.target.value })} />
              <label>Categoria</label><div className="inspector-static-value">{furnitureCatalog.find((item) => item.type === selectedFurniture.type)?.label ?? selectedFurniture.type}</div>
              <label>DIMENSÕES (METROS)</label>
              <div className="inspector-opening-fields">
                <label>Largura<input type="number" min="0.1" step="0.05" max={activeRoom?.width ?? 30} value={selectedFurniture.size.width} onChange={(event) => updateSelectedFurnitureSize({ width: Math.min(activeRoom?.width ?? 30, Math.max(0.1, Number(event.target.value) || 0.1)) })} /></label>
                <label>Profundidade<input type="number" min="0.1" step="0.05" max={activeRoom?.depth ?? 30} value={selectedFurniture.size.depth} onChange={(event) => updateSelectedFurnitureSize({ depth: Math.min(activeRoom?.depth ?? 30, Math.max(0.1, Number(event.target.value) || 0.1)) })} /></label>
                <label>Altura<input type="number" min="0.1" step="0.05" max={activeRoom?.height ?? 6} value={selectedFurniture.size.height} onChange={(event) => updateSelectedFurnitureSize({ height: Math.min(activeRoom?.height ?? 6, Math.max(0.1, Number(event.target.value) || 0.1)) })} /></label>
              </div>
              <div className="inspector-binding"><strong>Posicionamento 3D</strong><small>Use o gizmo para mover, girar e redimensionar o item. As dimensões definem a geometria do modelo.</small></div>
              <button className="homelab-delete-button" type="button" onClick={() => removeFurniture(selectedFurniture.id)}><Trash2 size={15} /> Remover item</button>
            </div>
          ) : selectedDevice ? (
            <div className="inspector-content">
              <div className="inspector-device-icon"><Box size={22} /></div>
              <label>Nome do dispositivo</label>
              <input value={selectedDevice.name} onChange={(event) => useHomeLabStore.getState().updateDevice(selectedDevice.id, { name: event.target.value })} />
              <label>Tipo</label><div className="inspector-static-value">{deviceCatalog.find((item) => item.type === selectedDevice.type)?.label ?? selectedDevice.type}</div>
              <label>Vínculo de simulação</label><div className="inspector-binding">{selectedDevice.simulation ? 'ESP32 vinculada' : 'Não vinculado'}<small>{selectedDevice.simulation ? selectedDevice.simulation.language : 'Vincule uma placa no laboratório IoT'}</small></div>
              <label>FIXAÇÃO</label>
              <select value={selectedDevice.mount?.surface ?? 'floor'} onChange={(event) => {
                const surface = event.target.value as 'floor' | 'wall';
                const mount: DeviceMount = surface === 'wall'
                  ? { surface: 'wall', wall: selectedDevice.mount?.wall ?? 'north', offset: selectedDevice.mount?.offset ?? 0, height: selectedDevice.mount?.height ?? 1.2 }
                  : { surface: 'floor', offset: 0, height: 0 };
                const transform = surface === 'wall' ? getMountedTransform({ ...selectedDevice, mount }, activeRoom ?? undefined) : { ...selectedDevice.transform, position: [selectedDevice.transform.position[0], 0, selectedDevice.transform.position[2]] as [number, number, number] };
                useHomeLabStore.getState().updateDevice(selectedDevice.id, { mount, transform });
              }}>
                <option value="floor">No piso</option><option value="wall">Na parede</option>
              </select>
              {selectedDevice.mount?.surface === 'wall' && (
                <div className="homelab-mount-editor">
                  <label>Parede</label>
                  <select value={selectedDevice.mount.wall ?? 'north'} onChange={(event) => {
                    const mount = { ...selectedDevice.mount!, wall: event.target.value as WallSide };
                    useHomeLabStore.getState().updateDevice(selectedDevice.id, { mount, transform: getMountedTransform({ ...selectedDevice, mount }, activeRoom ?? undefined) });
                  }}>{wallSides.map((side) => <option key={side.value} value={side.value}>{side.label}</option>)}</select>
                  <div className="homelab-opening-fields">
                    <label>Posição na parede (m)<input type="number" step="0.1" value={selectedDevice.mount.offset} onChange={(event) => {
                      const mount = { ...selectedDevice.mount!, offset: Number(event.target.value) || 0 };
                      useHomeLabStore.getState().updateDevice(selectedDevice.id, { mount, transform: getMountedTransform({ ...selectedDevice, mount }, activeRoom ?? undefined) });
                    }} /></label>
                    <label>Altura do piso (m)<input type="number" min="0.15" step="0.05" value={selectedDevice.mount.height} onChange={(event) => {
                      const mount = { ...selectedDevice.mount!, height: Number(event.target.value) || 0.15 };
                      useHomeLabStore.getState().updateDevice(selectedDevice.id, { mount, transform: getMountedTransform({ ...selectedDevice, mount }, activeRoom ?? undefined) });
                    }} /></label>
                  </div>
                  <small>O dispositivo acompanha a parede e fica orientado para o interior do cômodo.</small>
                </div>
              )}
              {selectedDevice.mount?.surface === 'wall' ? (
                <div className="inspector-binding"><strong>Posição controlada pela fixação</strong><small>Ajuste parede, posição e altura nos campos acima. Para mover livremente, altere a fixação para piso.</small></div>
              ) : (
                <>
                  <label>POSIÇÃO (METROS)</label>
                  <div className="inspector-transform-grid">
                    {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                      <label key={axis}>{axis}
                        <input type="number" step="0.1" value={selectedDevice.transform.position[index]} onChange={(event) => {
                          const position = [...selectedDevice.transform.position] as [number, number, number];
                          position[index] = Number(event.target.value) || 0;
                          useHomeLabStore.getState().updateDevice(selectedDevice.id, { transform: { ...selectedDevice.transform, position } });
                        }} />
                      </label>
                    ))}
                  </div>
                  <label>ROTAÇÃO (GRAUS)</label>
                  <div className="inspector-transform-grid">
                    {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                      <label key={axis}>{axis}
                        <input type="number" step="5" value={Math.round(selectedDevice.transform.rotation[index] * 180 / Math.PI)} onChange={(event) => {
                          const rotation = [...selectedDevice.transform.rotation] as [number, number, number];
                          rotation[index] = (Number(event.target.value) || 0) * Math.PI / 180;
                          useHomeLabStore.getState().updateDevice(selectedDevice.id, { transform: { ...selectedDevice.transform, rotation } });
                        }} />
                      </label>
                    ))}
                  </div>
                </>
              )}
              <button className="homelab-delete-button" type="button" onClick={() => removeDevice(selectedDevice.id)}><Trash2 size={15} /> Remover dispositivo</button>
            </div>
          ) : activeRoom ? (
            <div className="inspector-content">
              <div className="inspector-device-icon"><Box size={22} /></div>
              <label>Nome do ambiente</label>
              <input value={activeRoom.name} onChange={(event) => updateRoom(activeRoom.id, { name: event.target.value })} />
              <label>Largura (metros)</label>
              <input type="number" min="1" max="30" step="0.1" value={activeRoom.width} onChange={(event) => updateRoom(activeRoom.id, { width: Math.max(1, Math.min(30, Number(event.target.value) || 1)) })} />
              <label>Profundidade (metros)</label>
              <input type="number" min="1" max="30" step="0.1" value={activeRoom.depth} onChange={(event) => updateRoom(activeRoom.id, { depth: Math.max(1, Math.min(30, Number(event.target.value) || 1)) })} />
              <label>Pé-direito (metros)</label>
              <input type="number" min="2" max="6" step="0.1" value={activeRoom.height} onChange={(event) => updateRoom(activeRoom.id, { height: Math.max(2, Math.min(6, Number(event.target.value) || 2)) })} />
              <label>POSIÇÃO NA PLANTA (METROS)</label>
              <div className="inspector-transform-grid">
                <label>X
                  <input type="number" step="0.25" value={activeRoom.position?.x ?? 0} onChange={(event) => updateRoom(activeRoom.id, { position: { x: Number(event.target.value) || 0, z: activeRoom.position?.z ?? 0 } })} />
                </label>
                <label>Z
                  <input type="number" step="0.25" value={activeRoom.position?.z ?? 0} onChange={(event) => updateRoom(activeRoom.id, { position: { x: activeRoom.position?.x ?? 0, z: Number(event.target.value) || 0 } })} />
                </label>
              </div>
              <div className="inspector-binding"><strong>Posicionamento manual</strong><small>Defina X e Z para aproximar ou encostar este cômodo aos demais. Use a visão da casa para conferir a planta.</small></div>
              <label>ABERTURAS</label>
              <div className="homelab-opening-actions">
                <button type="button" onClick={() => updateRoom(activeRoom.id, { openings: [...(activeRoom.openings ?? []), { id: crypto.randomUUID(), type: 'door', wall: 'north', offset: -0.9, width: 0.9, height: 2.1, sillHeight: 0 }] })}>+ Porta</button>
                <button type="button" onClick={() => updateRoom(activeRoom.id, { openings: [...(activeRoom.openings ?? []), { id: crypto.randomUUID(), type: 'window', wall: 'north', offset: 0.9, width: 1.2, height: 1, sillHeight: 0.9 }] })}>+ Janela</button>
              </div>
              {(activeRoom.openings ?? []).map((opening) => (
                <div className="homelab-opening-editor" key={opening.id}>
                  <div className="homelab-opening-editor-heading">
                    <strong>{opening.type === 'door' ? 'Porta' : 'Janela'}</strong>
                    <button type="button" aria-label={`Remover ${opening.type === 'door' ? 'porta' : 'janela'}`} onClick={() => updateRoom(activeRoom.id, { openings: (activeRoom.openings ?? []).filter((item) => item.id !== opening.id) })}>Remover</button>
                  </div>
                  <label>Parede</label>
                  <select value={opening.wall} onChange={(event) => updateOpening(opening.id, { wall: event.target.value as 'north' | 'south' | 'east' | 'west' })}>
                    <option value="north">Norte</option><option value="south">Sul</option><option value="east">Leste</option><option value="west">Oeste</option>
                  </select>
                  <div className="homelab-opening-fields">
                    <label>Posição (m)<input type="number" step="0.1" value={opening.offset} onChange={(event) => updateOpening(opening.id, { offset: Number(event.target.value) || 0 })} /></label>
                    <label>Largura (m)<input type="number" min="0.4" step="0.1" value={opening.width} onChange={(event) => updateOpening(opening.id, { width: Number(event.target.value) || 0.4 })} /></label>
                    <label>Altura (m)<input type="number" min="0.3" step="0.1" value={opening.height} onChange={(event) => updateOpening(opening.id, { height: Number(event.target.value) || 0.3 })} /></label>
                    {opening.type === 'window' && <label>Peitoril (m)<input type="number" min="0" step="0.1" value={opening.sillHeight} onChange={(event) => updateOpening(opening.id, { sillHeight: Number(event.target.value) || 0 })} /></label>}
                  </div>
                  <small className="homelab-opening-help">A posição é medida a partir do centro da parede. Os valores são limitados ao tamanho do ambiente.</small>
                </div>
              ))}
              <div className="inspector-binding"><strong>{roomDevices.length} dispositivos · {roomFurniture.length} móveis/objetos neste ambiente</strong><small>As dimensões atualizam a visualização 3D.</small></div>
            </div>
          ) : (
            <div className="inspector-empty"><div><Settings2 size={23} /></div><strong>Nenhum ambiente</strong><p>Adicione um ambiente para começar o projeto.</p></div>
          )}
          <div className="inspector-room-card"><span>AMBIENTE ATUAL</span><strong>{roomName}</strong><small>{activeRoom ? `${activeRoom.width.toFixed(1)} m × ${activeRoom.depth.toFixed(1)} m · Pé-direito ${activeRoom.height.toFixed(1)} m` : 'Sem dimensões'}</small></div>
        </aside>
      </div>
    </main>
  );
}
