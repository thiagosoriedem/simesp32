import { useMemo } from 'react';
import { DoubleSide, Shape, Path, ExtrudeGeometry } from 'three';
import type { HomeRoom, RoomOpening, WallSide } from './types';

function Wall({ room, side }: { room: HomeRoom; side: WallSide }) {
  const length = side === 'north' || side === 'south' ? room.width : room.depth;
  const openings = (room.openings ?? []).filter((opening) => opening.wall === side);
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-length / 2, 0);
    shape.lineTo(length / 2, 0);
    shape.lineTo(length / 2, room.height);
    shape.lineTo(-length / 2, room.height);
    shape.closePath();

    openings.forEach((opening) => {
      const left = Math.max(-length / 2 + 0.05, opening.offset - opening.width / 2);
      const right = Math.min(length / 2 - 0.05, opening.offset + opening.width / 2);
      const bottom = opening.type === 'door' ? 0 : opening.sillHeight;
      const top = Math.min(room.height - 0.05, bottom + opening.height);
      if (right <= left || top <= bottom) return;
      const hole = new Path();
      hole.moveTo(left, bottom);
      hole.lineTo(left, top);
      hole.lineTo(right, top);
      hole.lineTo(right, bottom);
      hole.closePath();
      shape.holes.push(hole);
    });

    const wallGeometry = new ExtrudeGeometry(shape, { depth: 0.16, steps: 1, bevelEnabled: false, curveSegments: 1 });
    wallGeometry.computeVertexNormals();
    return wallGeometry;
  }, [length, room.height, openings]);

  const position: [number, number, number] = side === 'north'
    ? [0, 0, -room.depth / 2]
    : side === 'south'
      ? [0, 0, room.depth / 2]
      : side === 'east'
        ? [room.width / 2, 0, 0]
        : [-room.width / 2, 0, 0];
  const rotation: [number, number, number] = side === 'east' || side === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0];

  return <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
    <meshStandardMaterial color="#e7e5e4" roughness={0.92} metalness={0} side={DoubleSide} transparent={false} opacity={1} depthWrite />
  </mesh>;
}

function OpeningFrame({ opening, room }: { opening: RoomOpening; room: HomeRoom }) {
  const isHorizontalWall = opening.wall === 'north' || opening.wall === 'south';
  const along = opening.offset;
  const bottom = opening.type === 'door' ? 0 : opening.sillHeight;
  const wallOffset = opening.wall === 'north' ? -room.depth / 2 - 0.065
    : opening.wall === 'south' ? room.depth / 2 + 0.065
      : opening.wall === 'east' ? room.width / 2 + 0.065 : -room.width / 2 - 0.065;
  const frameColor = opening.type === 'door' ? '#8b5e3c' : '#7dd3fc';
  const sideSize: [number, number, number] = isHorizontalWall
    ? [0.045, opening.height, 0.07]
    : [0.07, opening.height, 0.045];
  const topSize: [number, number, number] = isHorizontalWall
    ? [opening.width + 0.045, 0.045, 0.07]
    : [0.07, 0.045, opening.width + 0.045];
  const center: [number, number, number] = isHorizontalWall
    ? [along, bottom + opening.height / 2, wallOffset]
    : [wallOffset, bottom + opening.height / 2, along];
  const half = opening.width / 2;
  const sidePositions: [number, number, number][] = isHorizontalWall
    ? [[center[0] - half, center[1], center[2]], [center[0] + half, center[1], center[2]]]
    : [[center[0], center[1], center[2] - half], [center[0], center[1], center[2] + half]];
  return <group>
    {sidePositions.map((p, i) => <mesh key={i} position={p}><boxGeometry args={sideSize} /><meshStandardMaterial color={frameColor} /></mesh>)}
    <mesh position={[center[0], bottom + opening.height, center[2]]}>
      <boxGeometry args={topSize} /><meshStandardMaterial color={frameColor} />
    </mesh>
    {opening.type === 'window' && <mesh position={isHorizontalWall ? [along, bottom, wallOffset] : [wallOffset, bottom, along]}>
      <boxGeometry args={isHorizontalWall ? [opening.width, 0.045, 0.09] : [0.09, 0.045, opening.width]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>}
  </group>;
}

export function RoomArchitecture({ room }: { room: HomeRoom }) {
  return <>
    {(['north', 'south', 'east', 'west'] as WallSide[]).map((side) => <Wall key={side} room={room} side={side} />)}
    {(room.openings ?? []).map((opening) => <OpeningFrame key={opening.id} opening={opening} room={room} />)}
  </>;
}
