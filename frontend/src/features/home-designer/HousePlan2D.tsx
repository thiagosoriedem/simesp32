import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { HomeRoom, RoomOpening, WallSide } from './types';

interface HousePlan2DProps {
  rooms: HomeRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
  onUpdateRoom: (id: string, position: { x: number; z: number }) => void;
  onResizeRoom: (id: string, patch: { width: number; depth: number; position: { x: number; z: number } }) => void;
  onUpdateOpening: (roomId: string, openingId: string, offset: number) => void;
}

type DragMapping = { scale: number; originX: number; originY: number; zoom: number; panX: number; panY: number };
type DragState =
  | ({ kind: 'room'; roomId: string; start: { x: number; z: number }; origin: { x: number; z: number } } & DragMapping)
  | ({ kind: 'resize'; roomId: string; edge: 'east' | 'west' | 'north' | 'south'; start: { x: number; z: number }; width: number; depth: number; position: { x: number; z: number } } & DragMapping)
  | ({ kind: 'opening'; roomId: string; openingId: string; wall: WallSide } & DragMapping)
  | ({ kind: 'pan'; startX: number; startY: number; originPanX: number; originPanY: number } & DragMapping)
  | null;

const GRID = 0.25;

export function HousePlan2D({ rooms, selectedRoomId, onSelectRoom, onUpdateRoom, onResizeRoom, onUpdateOpening }: HousePlan2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const bounds = useMemo(() => {
    if (!rooms.length) return { minX: -5, maxX: 5, minZ: -4, maxZ: 4 };
    const minX = Math.min(...rooms.map((room) => (room.position?.x ?? 0) - room.width / 2)) - 1.5;
    const maxX = Math.max(...rooms.map((room) => (room.position?.x ?? 0) + room.width / 2)) + 1.5;
    const minZ = Math.min(...rooms.map((room) => (room.position?.z ?? 0) - room.depth / 2)) - 1.5;
    const maxZ = Math.max(...rooms.map((room) => (room.position?.z ?? 0) + room.depth / 2)) + 1.5;
    return { minX, maxX, minZ, maxZ };
  }, [rooms]);
  const scale = useMemo(() => Math.min(850 / (bounds.maxX - bounds.minX), 560 / (bounds.maxZ - bounds.minZ)), [bounds]);
  const originX = 500 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const originY = 345 - ((bounds.minZ + bounds.maxZ) / 2) * scale;
  const px = (x: number) => originX + x * scale;
  const py = (z: number) => originY + z * scale;

  const mappingNow = (): DragMapping => ({ scale, originX, originY, zoom, panX: pan.x, panY: pan.y });

  const toWorld = (event: ReactPointerEvent<SVGSVGElement>, mapping: DragMapping = mappingNow()) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return { x: (local.x - mapping.panX) / mapping.zoom / mapping.scale - mapping.originX / mapping.scale, z: (local.y - mapping.panY) / mapping.zoom / mapping.scale - mapping.originY / mapping.scale };
  };

  const pointerDownRoom = (event: ReactPointerEvent<SVGGElement>, room: HomeRoom) => {
    event.stopPropagation();
    onSelectRoom(room.id);
    const point = toWorld(event as unknown as ReactPointerEvent<SVGSVGElement>);
    if (!point) return;
    dragRef.current = {
      kind: 'room', roomId: room.id, start: point,
      origin: { x: room.position?.x ?? 0, z: room.position?.z ?? 0 },
      ...mappingNow(),
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const pointerDownOpening = (event: ReactPointerEvent<SVGElement>, room: HomeRoom, opening: RoomOpening) => {
    event.stopPropagation();
    onSelectRoom(room.id);
    dragRef.current = { kind: 'opening', roomId: room.id, openingId: opening.id, wall: opening.wall, ...mappingNow() };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === 'pan') {
      const svg = svgRef.current;
      const matrix = svg?.getScreenCTM();
      if (!svg || !matrix) return;
      const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
      const local = point.matrixTransform(matrix.inverse());
      setPan({ x: drag.originPanX + local.x - drag.startX, y: drag.originPanY + local.y - drag.startY });
      return;
    }
    const point = toWorld(event, drag);
    if (!point) return;
    if (drag.kind === 'resize') {
      const room = rooms.find((entry) => entry.id === drag.roomId);
      if (!room) return;
      const dx = point.x - drag.start.x;
      const dz = point.z - drag.start.z;
      const width = Math.max(1, Math.round((drag.width + (drag.edge === 'east' ? dx : drag.edge === 'west' ? -dx : 0)) / GRID) * GRID);
      const depth = Math.max(1, Math.round((drag.depth + (drag.edge === 'south' ? dz : drag.edge === 'north' ? -dz : 0)) / GRID) * GRID);
      const shiftX = drag.edge === 'east' ? (width - drag.width) / 2 : drag.edge === 'west' ? -(width - drag.width) / 2 : 0;
      const shiftZ = drag.edge === 'south' ? (depth - drag.depth) / 2 : drag.edge === 'north' ? -(depth - drag.depth) / 2 : 0;
      const position = { x: Math.round((drag.position.x + shiftX) / GRID) * GRID, z: Math.round((drag.position.z + shiftZ) / GRID) * GRID };
      const openingsFit = (room.openings ?? []).every((opening) => {
        const wallLength = opening.wall === 'north' || opening.wall === 'south' ? width : depth;
        return Math.abs(opening.offset) + opening.width / 2 <= wallLength / 2 - 0.05;
      });
      const overlapsRoom = rooms.some((other) => {
        if (other.id === room.id) return false;
        const ox = other.position?.x ?? 0; const oz = other.position?.z ?? 0;
        return Math.abs(position.x - ox) < (width + other.width) / 2 - 0.02 && Math.abs(position.z - oz) < (depth + other.depth) / 2 - 0.02;
      });
      if (openingsFit && !overlapsRoom) onResizeRoom(room.id, { width, depth, position });
      return;
    }
    if (drag.kind === 'room') {
      const x = Math.round((drag.origin.x + point.x - drag.start.x) / GRID) * GRID;
      const z = Math.round((drag.origin.z + point.z - drag.start.z) / GRID) * GRID;
      const movingRoom = rooms.find((room) => room.id === drag.roomId);
      if (!movingRoom) return;
      const overlapsRoom = rooms.some((room) => {
        if (room.id === drag.roomId) return false;
        const otherX = room.position?.x ?? 0;
        const otherZ = room.position?.z ?? 0;
        return Math.abs(x - otherX) < (movingRoom.width + room.width) / 2 - 0.02
          && Math.abs(z - otherZ) < (movingRoom.depth + room.depth) / 2 - 0.02;
      });
      if (!overlapsRoom) onUpdateRoom(drag.roomId, { x, z });
      return;
    }
    const room = rooms.find((entry) => entry.id === drag.roomId);
    const opening = room?.openings?.find((entry) => entry.id === drag.openingId);
    if (!room || !opening) return;
    const horizontal = drag.wall === 'north' || drag.wall === 'south';
    const center = horizontal ? room.position?.x ?? 0 : room.position?.z ?? 0;
    const value = horizontal ? point.x : point.z;
    const length = horizontal ? room.width : room.depth;
    const offset = Math.max(-length / 2 + opening.width / 2 + 0.05,
      Math.min(length / 2 - opening.width / 2 - 0.05, value - center));
    const snappedOffset = Math.round(offset / GRID) * GRID;
    const collides = (room.openings ?? []).some((other) => other.id !== opening.id && other.wall === drag.wall
      && Math.abs(snappedOffset - other.offset) < (opening.width + other.width) / 2 + 0.05);
    if (!collides) onUpdateOpening(room.id, opening.id, snappedOffset);
  };

  const pointerDownResize = (event: ReactPointerEvent<SVGCircleElement>, room: HomeRoom, edge: 'east' | 'west' | 'north' | 'south') => {
    event.stopPropagation();
    onSelectRoom(room.id);
    const point = toWorld(event as unknown as ReactPointerEvent<SVGSVGElement>);
    if (!point) return;
    dragRef.current = { kind: 'resize', roomId: room.id, edge, start: point, width: room.width, depth: room.depth, position: { x: room.position?.x ?? 0, z: room.position?.z ?? 0 }, ...mappingNow() };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const renderOpening = (room: HomeRoom, opening: RoomOpening) => {
    const cx = room.position?.x ?? 0;
    const cz = room.position?.z ?? 0;
    const half = opening.width / 2;
    const gap = opening.type === 'door' ? '#111c2d' : '#38bdf8';
    const common = { stroke: gap, strokeWidth: 8, strokeLinecap: 'square' as const };
    if (opening.wall === 'north') return <line key={opening.id} x1={px(cx + opening.offset - half)} y1={py(cz - room.depth / 2)} x2={px(cx + opening.offset + half)} y2={py(cz - room.depth / 2)} {...common} onPointerDown={(event) => pointerDownOpening(event, room, opening)} />;
    if (opening.wall === 'south') return <line key={opening.id} x1={px(cx + opening.offset - half)} y1={py(cz + room.depth / 2)} x2={px(cx + opening.offset + half)} y2={py(cz + room.depth / 2)} {...common} onPointerDown={(event) => pointerDownOpening(event, room, opening)} />;
    if (opening.wall === 'east') return <line key={opening.id} x1={px(cx + room.width / 2)} y1={py(cz + opening.offset - half)} x2={px(cx + room.width / 2)} y2={py(cz + opening.offset + half)} {...common} onPointerDown={(event) => pointerDownOpening(event, room, opening)} />;
    return <line key={opening.id} x1={px(cx - room.width / 2)} y1={py(cz + opening.offset - half)} x2={px(cx - room.width / 2)} y2={py(cz + opening.offset + half)} {...common} onPointerDown={(event) => pointerDownOpening(event, room, opening)} />;
  };

  const beginPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget && (event.target as Element).tagName.toLowerCase() !== 'rect') return;
    const svg = svgRef.current; const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    dragRef.current = { kind: 'pan', startX: local.x, startY: local.y, originPanX: pan.x, originPanY: pan.y, ...mappingNow() };
    svg.setPointerCapture(event.pointerId);
  };

  const changeZoom = (factor: number) => setZoom((current) => Math.max(0.35, Math.min(3, current * factor)));

  return (
    <div className="homelab-plan2d homelab-house-plan2d">
      <div className="homelab-plan-controls">
        <button type="button" onClick={() => changeZoom(1.2)} aria-label="Aumentar zoom">+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => changeZoom(1 / 1.2)} aria-label="Diminuir zoom">−</button>
        <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Enquadrar</button>
      </div>
      <svg ref={svgRef} viewBox="0 0 1000 690" role="img" aria-label="Planta baixa geral da residência"
        onPointerDown={beginPan} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
        <defs>
          <pattern id="homelab-house-grid" width={scale * GRID} height={scale * GRID} patternUnits="userSpaceOnUse">
            <path d={`M ${scale * GRID} 0 L 0 0 0 ${scale * GRID}`} fill="none" stroke="#26364b" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="1000" height="690" fill="#0d1626" />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
        <rect width="1000" height="690" fill="url(#homelab-house-grid)" />
        {rooms.map((room) => {
          const x = room.position?.x ?? 0;
          const z = room.position?.z ?? 0;
          const selected = selectedRoomId === room.id;
          return (
            <g key={room.id} onPointerDown={(event) => pointerDownRoom(event, room)} style={{ cursor: 'grab', touchAction: 'none' }}>
              <rect x={px(x - room.width / 2)} y={py(z - room.depth / 2)} width={room.width * scale} height={room.depth * scale}
                fill={selected ? '#d6d3c8' : '#b9c1c9'} stroke={selected ? '#60a5fa' : '#e2e8f0'} strokeWidth={selected ? 7 : 5} />
              <text x={px(x)} y={py(z) - 5} textAnchor="middle" fill="#172334" fontSize="15" fontWeight="700" pointerEvents="none">{room.name}</text>
              <text x={px(x)} y={py(z) + 16} textAnchor="middle" fill="#334155" fontSize="11" pointerEvents="none">{room.width.toFixed(1)} × {room.depth.toFixed(1)} m</text>
              {(room.openings ?? []).map((opening) => renderOpening(room, opening))}
              <g pointerEvents="none" fill="#93c5fd" stroke="#93c5fd" fontSize="11">
                <line x1={px(x - room.width / 2)} y1={py(z - room.depth / 2) - 18} x2={px(x + room.width / 2)} y2={py(z - room.depth / 2) - 18} strokeWidth="1" />
                <line x1={px(x - room.width / 2)} y1={py(z - room.depth / 2) - 23} x2={px(x - room.width / 2)} y2={py(z - room.depth / 2) - 13} />
                <line x1={px(x + room.width / 2)} y1={py(z - room.depth / 2) - 23} x2={px(x + room.width / 2)} y2={py(z - room.depth / 2) - 13} />
                <text x={px(x)} y={py(z - room.depth / 2) - 23} textAnchor="middle" stroke="none" fill="#bfdbfe">{room.width.toFixed(2)} m</text>
                <line x1={px(x + room.width / 2) + 18} y1={py(z - room.depth / 2)} x2={px(x + room.width / 2) + 18} y2={py(z + room.depth / 2)} strokeWidth="1" />
                <line x1={px(x + room.width / 2) + 13} y1={py(z - room.depth / 2)} x2={px(x + room.width / 2) + 23} y2={py(z - room.depth / 2)} />
                <line x1={px(x + room.width / 2) + 13} y1={py(z + room.depth / 2)} x2={px(x + room.width / 2) + 23} y2={py(z + room.depth / 2)} />
                <text x={px(x + room.width / 2) + 25} y={py(z)} textAnchor="middle" stroke="none" fill="#bfdbfe" transform={`rotate(90 ${px(x + room.width / 2) + 25} ${py(z)})`}>{room.depth.toFixed(2)} m</text>
              </g>
              {selected && <g>
                <circle cx={px(x + room.width / 2)} cy={py(z)} r="7" fill="#60a5fa" stroke="#dbeafe" strokeWidth="2" style={{cursor:'ew-resize',touchAction:'none'}} onPointerDown={(event) => pointerDownResize(event, room, 'east')} />
                <circle cx={px(x - room.width / 2)} cy={py(z)} r="7" fill="#60a5fa" stroke="#dbeafe" strokeWidth="2" style={{cursor:'ew-resize',touchAction:'none'}} onPointerDown={(event) => pointerDownResize(event, room, 'west')} />
                <circle cx={px(x)} cy={py(z + room.depth / 2)} r="7" fill="#60a5fa" stroke="#dbeafe" strokeWidth="2" style={{cursor:'ns-resize',touchAction:'none'}} onPointerDown={(event) => pointerDownResize(event, room, 'south')} />
                <circle cx={px(x)} cy={py(z - room.depth / 2)} r="7" fill="#60a5fa" stroke="#dbeafe" strokeWidth="2" style={{cursor:'ns-resize',touchAction:'none'}} onPointerDown={(event) => pointerDownResize(event, room, 'north')} />
              </g>}

            </g>
          );
        })}
        </g>
        <text x="500" y="28" textAnchor="middle" fill="#e2e8f0" fontSize="15" fontWeight="600" pointerEvents="none">Planta geral · {rooms.length} ambientes</text>
      </svg>
      <div className="homelab-plan-legend">
        <span><i className="legend-furniture" /> Cômodos</span>
        <span><i className="legend-door" /> Portas</span>
        <span><i className="legend-window" /> Janelas</span>
        <small>Arraste cômodos e aberturas · use os puxadores azuis para redimensionar · grade de 25 cm</small>
      </div>
    </div>
  );
}
