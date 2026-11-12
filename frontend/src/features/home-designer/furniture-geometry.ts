import type { DeviceTransform, HomeFurniture, HomeRoom } from './types';

type Footprint = { minX: number; maxX: number; minZ: number; maxZ: number };

const WALL_CLEARANCE = 0.12;
const OBJECT_CLEARANCE = 0.06;

function getFootprint(item: HomeFurniture, transform: DeviceTransform): Footprint {
  const width = item.size.width * Math.abs(transform.scale[0]);
  const depth = item.size.depth * Math.abs(transform.scale[2]);
  const angle = transform.rotation[1] ?? 0;
  const halfX = (Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * depth) / 2;
  const halfZ = (Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * depth) / 2;
  const [x, , z] = transform.position;
  return { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ };
}

function getDoorClearance(room: HomeRoom): Footprint[] {
  const clearanceDepth = 0.85;
  return (room.openings ?? []).filter((opening) => opening.type === 'door').map((opening) => {
    const halfWidth = opening.width / 2 + 0.08;
    if (opening.wall === 'north') return {
      minX: opening.offset - halfWidth, maxX: opening.offset + halfWidth,
      minZ: -room.depth / 2 + WALL_CLEARANCE, maxZ: -room.depth / 2 + WALL_CLEARANCE + clearanceDepth,
    };
    if (opening.wall === 'south') return {
      minX: opening.offset - halfWidth, maxX: opening.offset + halfWidth,
      minZ: room.depth / 2 - WALL_CLEARANCE - clearanceDepth, maxZ: room.depth / 2 - WALL_CLEARANCE,
    };
    if (opening.wall === 'east') return {
      minX: room.width / 2 - WALL_CLEARANCE - clearanceDepth, maxX: room.width / 2 - WALL_CLEARANCE,
      minZ: opening.offset - halfWidth, maxZ: opening.offset + halfWidth,
    };
    return {
      minX: -room.width / 2 + WALL_CLEARANCE, maxX: -room.width / 2 + WALL_CLEARANCE + clearanceDepth,
      minZ: opening.offset - halfWidth, maxZ: opening.offset + halfWidth,
    };
  });
}

function overlaps(a: Footprint, b: Footprint, clearance = OBJECT_CLEARANCE): boolean {
  return a.minX < b.maxX + clearance && a.maxX > b.minX - clearance
    && a.minZ < b.maxZ + clearance && a.maxZ > b.minZ - clearance;
}

export function resolveFurnitureTransform(
  item: HomeFurniture,
  candidate: DeviceTransform,
  room: HomeRoom,
  furniture: HomeFurniture[],
): DeviceTransform {
  const footprint = getFootprint(item, candidate);
  const roomMinX = -room.width / 2 + WALL_CLEARANCE;
  const roomMaxX = room.width / 2 - WALL_CLEARANCE;
  const roomMinZ = -room.depth / 2 + WALL_CLEARANCE;
  const roomMaxZ = room.depth / 2 - WALL_CLEARANCE;

  if (footprint.maxX - footprint.minX > room.width - WALL_CLEARANCE * 2
    || footprint.maxZ - footprint.minZ > room.depth - WALL_CLEARANCE * 2
    || item.size.height * Math.abs(candidate.scale[1]) > room.height) {
    return item.transform;
  }

  const dx = Math.max(roomMinX - footprint.minX, Math.min(0, roomMaxX - footprint.maxX));
  const dz = Math.max(roomMinZ - footprint.minZ, Math.min(0, roomMaxZ - footprint.maxZ));
  const bounded: DeviceTransform = {
    ...candidate,
    position: [candidate.position[0] + dx, 0, candidate.position[2] + dz],
  };
  const boundedFootprint = getFootprint(item, bounded);
  const blocksDoor = getDoorClearance(room).some((doorZone) => overlaps(boundedFootprint, doorZone, 0));
  const collision = blocksDoor || furniture.some((other) => other.id !== item.id
    && overlaps(boundedFootprint, getFootprint(other, other.transform)));
  return collision ? item.transform : bounded;
}

function isPlacementFree(item: HomeFurniture, transform: DeviceTransform, room: HomeRoom, furniture: HomeFurniture[]): boolean {
  const footprint = getFootprint(item, transform);
  const inside = footprint.minX >= -room.width / 2 + WALL_CLEARANCE
    && footprint.maxX <= room.width / 2 - WALL_CLEARANCE
    && footprint.minZ >= -room.depth / 2 + WALL_CLEARANCE
    && footprint.maxZ <= room.depth / 2 - WALL_CLEARANCE
    && item.size.height * Math.abs(transform.scale[1]) <= room.height;
  return inside && !getDoorClearance(room).some((doorZone) => overlaps(footprint, doorZone, 0))
    && !furniture.some((other) => other.id !== item.id
      && overlaps(footprint, getFootprint(other, other.transform)));
}

export function findFurniturePlacement(
  item: HomeFurniture,
  room: HomeRoom,
  furniture: HomeFurniture[],
): DeviceTransform {
  const step = 0.25;
  const maxX = Math.max(0, room.width / 2 - item.size.width / 2 - WALL_CLEARANCE);
  const maxZ = Math.max(0, room.depth / 2 - item.size.depth / 2 - WALL_CLEARANCE);
  const rows = Math.ceil(maxZ * 2 / step);
  const columns = Math.ceil(maxX * 2 / step);

  for (let ring = 0; ring <= Math.max(rows, columns); ring += 1) {
    for (let row = -ring; row <= ring; row += 1) {
      for (let column = -ring; column <= ring; column += 1) {
        if (Math.max(Math.abs(row), Math.abs(column)) !== ring) continue;
        const candidate: DeviceTransform = {
          ...item.transform,
          position: [
            Math.max(-maxX, Math.min(maxX, column * step)),
            0,
            Math.max(-maxZ, Math.min(maxZ, row * step)),
          ],
        };
        if (isPlacementFree(item, candidate, room, furniture)) return candidate;
      }
    }
  }
  return item.transform;
}
