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
  const collision = furniture.some((other) => other.id !== item.id
    && overlaps(boundedFootprint, getFootprint(other, other.transform)));
  return collision ? item.transform : bounded;
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
        const resolved = resolveFurnitureTransform(item, candidate, room, furniture);
        if (resolved !== item.transform) return resolved;
        if (candidate.position[0] === item.transform.position[0]
          && candidate.position[2] === item.transform.position[2]
          && !furniture.some((other) => other.id !== item.id
            && overlaps(getFootprint(item, candidate), getFootprint(other, other.transform)))) {
          return candidate;
        }
      }
    }
  }
  return item.transform;
}
