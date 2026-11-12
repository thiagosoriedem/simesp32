import { useMemo } from 'react';
import { Html, OrbitControls } from '@react-three/drei';
import { useHomeLabStore } from './store';
import type { HomeRoom, SmartDevice, WallSide } from './types';
import { RoomArchitecture } from './RoomArchitecture';

type RoomPlacement = { room: HomeRoom; x: number; z: number };
type WallConnection = { firstRoomId: string; firstSide: WallSide; secondRoomId: string; secondSide: WallSide; ownerRoomId: string };

function getRoomPlacements(rooms: HomeRoom[]): RoomPlacement[] {
  if (!rooms.length) return [];
  const maxWidth = Math.max(...rooms.map((room) => room.width), 4);
  const maxDepth = Math.max(...rooms.map((room) => room.depth), 4);
  const columns = Math.min(2, rooms.length);
  const rows = Math.ceil(rooms.length / columns);
  return rooms.map((room, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      room,
      x: room.position?.x ?? column * (maxWidth + 1.5) - ((columns - 1) * (maxWidth + 1.5)) / 2,
      z: room.position?.z ?? row * (maxDepth + 1.5) - ((rows - 1) * (maxDepth + 1.5)) / 2,
    };
  });
}

function findWallConnections(placements: RoomPlacement[]): WallConnection[] {
  const connections: WallConnection[] = [];
  const tolerance = 0.08;

  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const a = placements[i];
      const b = placements[j];
      const aLeft = a.x - a.room.width / 2;
      const aRight = a.x + a.room.width / 2;
      const aTop = a.z - a.room.depth / 2;
      const aBottom = a.z + a.room.depth / 2;
      const bLeft = b.x - b.room.width / 2;
      const bRight = b.x + b.room.width / 2;
      const bTop = b.z - b.room.depth / 2;
      const bBottom = b.z + b.room.depth / 2;

      let sideA: WallSide | null = null;
      let sideB: WallSide | null = null;
      let overlapStart = 0;
      let overlapEnd = 0;
      let axis: 'x' | 'z' = 'x';

      if (Math.abs(aRight - bLeft) <= tolerance || Math.abs(bRight - aLeft) <= tolerance) {
        const aIsLeft = Math.abs(aRight - bLeft) <= tolerance;
        sideA = aIsLeft ? 'east' : 'west';
        sideB = aIsLeft ? 'west' : 'east';
        overlapStart = Math.max(aTop, bTop);
        overlapEnd = Math.min(aBottom, bBottom);
        axis = 'z';
      } else if (Math.abs(aBottom - bTop) <= tolerance || Math.abs(bBottom - aTop) <= tolerance) {
        const aIsTop = Math.abs(aBottom - bTop) <= tolerance;
        sideA = aIsTop ? 'south' : 'north';
        sideB = aIsTop ? 'north' : 'south';
        overlapStart = Math.max(aLeft, bLeft);
        overlapEnd = Math.min(aRight, bRight);
        axis = 'x';
      }

      if (!sideA || !sideB || overlapEnd - overlapStart < 0.5) continue;

      const candidates = [
        { room: a, side: sideA, center: axis === 'x' ? a.x : a.z },
        { room: b, side: sideB, center: axis === 'x' ? b.x : b.z },
      ];
      let ownerRoomId: string | null = null;
      for (const candidate of candidates) {
        const door = (candidate.room.openings ?? []).find((opening) => {
          if (opening.type !== 'door' || opening.wall !== candidate.side) return false;
          const worldCenter = candidate.center + opening.offset;
          return worldCenter - opening.width / 2 >= overlapStart - tolerance
            && worldCenter + opening.width / 2 <= overlapEnd + tolerance;
        });
        if (door) {
          ownerRoomId = candidate.room.id;
          break;
        }
      }

      if (ownerRoomId) {
        connections.push({
          firstRoomId: a.room.id,
          firstSide: sideA,
          secondRoomId: b.room.id,
          secondSide: sideB,
          ownerRoomId,
        });
      }
    }
  }
  return connections;
}

function getOverviewDeviceTransform(device: SmartDevice, room: HomeRoom) {
  const mount = device.mount;
  if (!mount || mount.surface !== 'wall') return device.transform;
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
  return { ...device.transform, position, rotation: [0, yaw, 0] as [number, number, number] };
}

function OverviewDevice({ device, room, offsetX, offsetZ, selected, onSelect }: {
  device: SmartDevice;
  room: HomeRoom;
  offsetX: number;
  offsetZ: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const transform = getOverviewDeviceTransform(device, room);
  const position = transform.position;
  return (
    <group
      position={[position[0] + offsetX, position[1], position[2] + offsetZ]}
      rotation={transform.rotation}
      scale={transform.scale}
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
  const connections = useMemo(() => findWallConnections(placements), [placements]);
  const hiddenWalls = useMemo(() => {
    const result = new Map<string, WallSide[]>();
    connections.forEach((connection) => {
      const hiddenRoomId = connection.ownerRoomId === connection.firstRoomId
        ? connection.secondRoomId
        : connection.firstRoomId;
      const hiddenSide = connection.ownerRoomId === connection.firstRoomId
        ? connection.secondSide
        : connection.firstSide;
      result.set(hiddenRoomId, [...(result.get(hiddenRoomId) ?? []), hiddenSide]);
    });
    return result;
  }, [connections]);

  const minX = Math.min(...placements.map(({ room, x }) => x - room.width / 2), -5);
  const maxX = Math.max(...placements.map(({ room, x }) => x + room.width / 2), 5);
  const minZ = Math.min(...placements.map(({ room, z }) => z - room.depth / 2), -5);
  const maxZ = Math.max(...placements.map(({ room, z }) => z + room.depth / 2), 5);
  const targetX = (minX + maxX) / 2;
  const targetZ = (minZ + maxZ) / 2;
  const cameraDistance = Math.max(maxX - minX, maxZ - minZ, 10);

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
          <RoomArchitecture room={room} hiddenWalls={hiddenWalls.get(room.id) ?? []} />
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
              room={room}
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
