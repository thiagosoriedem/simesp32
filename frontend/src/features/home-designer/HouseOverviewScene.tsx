import { useMemo } from 'react';
import { Html, OrbitControls } from '@react-three/drei';
import { useHomeLabStore } from './store';
import type { HomeRoom, SmartDevice } from './types';

type RoomPlacement = { room: HomeRoom; x: number; z: number };

function getRoomPlacements(rooms: HomeRoom[]): RoomPlacement[] {
  if (!rooms.length) return [];
  const cellWidth = Math.max(...rooms.map((room) => room.width), 4) + 1.5;
  const cellDepth = Math.max(...rooms.map((room) => room.depth), 4) + 1.5;
  const columns = Math.min(2, rooms.length);
  const rows = Math.ceil(rooms.length / columns);
  return rooms.map((room, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      room,
      x: column * cellWidth - ((columns - 1) * cellWidth) / 2,
      z: row * cellDepth - ((rows - 1) * cellDepth) / 2,
    };
  });
}

function OverviewDevice({ device, offsetX, offsetZ, selected, onSelect }: {
  device: SmartDevice;
  offsetX: number;
  offsetZ: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const position = device.transform.position;
  return (
    <group
      position={[position[0] + offsetX, position[1], position[2] + offsetZ]}
      rotation={device.transform.rotation}
      scale={device.transform.scale}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
    >
      {device.type === 'lamp' ? (
        <>
          <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.055, 0.08, 0.16, 16]} /><meshStandardMaterial color="#64748b" /></mesh>
          <mesh position={[0, 0.27, 0]}><sphereGeometry args={[0.14, 16, 16]} /><meshStandardMaterial color={device.state.powered ? '#fff3b0' : '#cbd5e1'} emissive={device.state.powered ? '#fbbf24' : '#000000'} emissiveIntensity={device.state.powered ? 1.2 : 0} /></mesh>
        </>
      ) : device.type === 'esp32' ? (
        <mesh position={[0, 0.07, 0]}><boxGeometry args={[0.72, 0.08, 0.42]} /><meshStandardMaterial color="#087f5b" /></mesh>
      ) : device.type === 'motion_sensor' ? (
        <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.32, 0.18, 0.24]} /><meshStandardMaterial color="#a78bfa" /></mesh>
      ) : (
        <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.22, 0.16, 0.08]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
      )}
      {selected && <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.35, 0.4, 24]} /><meshBasicMaterial color="#60a5fa" side={2} /></mesh>}
      <Html position={[0, 0.5, 0]} center distanceFactor={13} style={{ pointerEvents: 'none' }}>
        <div className={`homelab-object-label ${selected ? 'is-selected' : ''}`}>{device.name}</div>
      </Html>
    </group>
  );
}

export function HouseOverviewScene() {
  const project = useHomeLabStore((state) => state.project);
  const selectedDeviceId = useHomeLabStore((state) => state.selectedDeviceId);
  const selectedRoomId = useHomeLabStore((state) => state.selectedRoomId);
  const selectRoom = useHomeLabStore((state) => state.selectRoom);
  const selectDevice = useHomeLabStore((state) => state.selectDevice);
  const placements = useMemo(() => getRoomPlacements(project?.rooms ?? []), [project?.rooms]);
  const cellWidth = Math.max(...(project?.rooms ?? []).map((room) => room.width), 4) + 1.5;
  const cellDepth = Math.max(...(project?.rooms ?? []).map((room) => room.depth), 4) + 1.5;
  const columns = Math.min(2, placements.length);
  const rows = Math.ceil(placements.length / Math.max(columns, 1));
  const targetX = 0;
  const targetZ = 0;
  const cameraDistance = Math.max(cellWidth * Math.max(columns, 1), cellDepth * Math.max(rows, 1), 10);

  return (
    <>
      <color attach="background" args={['#111827']} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[8, 12, 7]} intensity={2} castShadow />
      {placements.map(({ room, x, z }) => (
        <group key={room.id} position={[x, 0, z]}>
          <mesh position={[0, -0.025, 0]} receiveShadow onClick={() => { selectRoom(room.id); selectDevice(null); }}>
            <boxGeometry args={[room.width, 0.05, room.depth]} />
            <meshStandardMaterial color={room.id === selectedRoomId ? '#d7e3ef' : '#b9c4cf'} roughness={0.9} />
          </mesh>
          <mesh position={[0, room.height / 2, -room.depth / 2]} receiveShadow>
            <boxGeometry args={[room.width, room.height, 0.1]} />
            <meshStandardMaterial color="#e7e5e4" transparent opacity={0.76} />
          </mesh>
          <mesh position={[-room.width / 2, room.height / 2, 0]} receiveShadow>
            <boxGeometry args={[0.1, room.height, room.depth]} />
            <meshStandardMaterial color="#d6d3d1" transparent opacity={0.76} />
          </mesh>
          <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[room.width, room.depth]} />
            <meshBasicMaterial color="#64748b" wireframe transparent opacity={0.22} />
          </mesh>
          <Html position={[0, room.height + 0.18, 0]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
            <div className="homelab-room-label">{room.name}</div>
          </Html>
          {(project?.devices ?? []).filter((device) => device.roomId === room.id).map((device) => (
            <OverviewDevice
              key={device.id}
              device={device}
              offsetX={0}
              offsetZ={0}
              selected={selectedDeviceId === device.id}
              onSelect={() => { selectRoom(room.id); selectDevice(device.id); }}
            />
          ))}
        </group>
      ))}
      <OrbitControls makeDefault target={[targetX, 0, targetZ]} minDistance={Math.max(5, cameraDistance * 0.45)} maxDistance={cameraDistance * 2.8} maxPolarAngle={Math.PI / 2.05} />
    </>
  );
}
