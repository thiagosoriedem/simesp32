import { useMemo, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DeviceTransform, HomeFurniture, HomeRoom, SmartDevice } from './types';

type DragTarget = { kind: 'furniture' | 'device'; id: string } | null;

interface FloorPlan2DProps {
  room: HomeRoom;
  furniture: HomeFurniture[];
  devices: SmartDevice[];
  selectedFurnitureId: string | null;
  selectedDeviceId: string | null;
  onSelectFurniture: (id: string) => void;
  onSelectDevice: (id: string) => void;
  onUpdateFurniture: (id: string, transform: DeviceTransform) => void;
  onUpdateDevice: (id: string, transform: DeviceTransform) => void;
}

const furnitureColors: Record<string, string> = {
  bed: '#647f91', sofa: '#526b7d', table: '#9a7555', chair: '#b18a62',
  wardrobe: '#80634c', refrigerator: '#94a3b8', sink: '#8da3b5', shower: '#7aa6c2',
};

export function FloorPlan2D({
  room, furniture, devices, selectedFurnitureId, selectedDeviceId,
  onSelectFurniture, onSelectDevice, onUpdateFurniture, onUpdateDevice,
}: FloorPlan2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragTarget>(null);
  const scale = useMemo(() => Math.min(740 / room.width, 470 / room.depth), [room.width, room.depth]);
  const px = (x: number) => 450 + x * scale;
  const py = (z: number) => 310 + z * scale;

  const toRoomPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return { x: (local.x - 450) / scale, z: (local.y - 310) / scale };
  };

  const startDrag = (event: ReactPointerEvent<SVGElement>, target: DragTarget) => {
    event.stopPropagation();
    if (!target) return;
    dragRef.current = target;
    svgRef.current?.setPointerCapture(event.pointerId);
    if (target.kind === 'furniture') onSelectFurniture(target.id);
    else onSelectDevice(target.id);
  };

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const target = dragRef.current;
    if (!target) return;
    const point = toRoomPoint(event);
    if (!point) return;
    const snap = (value: number) => Math.round(value * 4) / 4;
    if (target.kind === 'furniture') {
      const item = furniture.find((entry) => entry.id === target.id);
      if (!item) return;
      onUpdateFurniture(item.id, {
        ...item.transform,
        position: [snap(point.x), 0, snap(point.z)],
      });
    } else {
      const device = devices.find((entry) => entry.id === target.id);
      if (!device || device.mount?.surface === 'wall') return;
      onUpdateDevice(device.id, {
        ...device.transform,
        position: [snap(point.x), device.transform.position[1], snap(point.z)],
      });
    }
  };

  const openings = room.openings ?? [];
  return (
    <div className="homelab-plan2d">
      <svg
        ref={svgRef}
        viewBox="0 0 900 620"
        role="img"
        aria-label={`Planta baixa de ${room.name}`}
        onPointerMove={moveDrag}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        <defs>
          <pattern id="homelab-plan-grid" width={scale * 0.5} height={scale * 0.5} patternUnits="userSpaceOnUse">
            <path d={`M ${scale * 0.5} 0 L 0 0 0 ${scale * 0.5}`} fill="none" stroke="#334155" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="900" height="620" fill="#0d1626" />
        <rect x={px(-room.width / 2)} y={py(-room.depth / 2)} width={room.width * scale} height={room.depth * scale} fill="#c8c4b8" />
        <rect x={px(-room.width / 2)} y={py(-room.depth / 2)} width={room.width * scale} height={room.depth * scale} fill="url(#homelab-plan-grid)" />
        <rect x={px(-room.width / 2)} y={py(-room.depth / 2)} width={room.width * scale} height={room.depth * scale} fill="none" stroke="#e2e8f0" strokeWidth="8" />

        {openings.map((opening) => {
          const half = opening.width * scale / 2;
          const center = opening.offset * scale;
          const isDoor = opening.type === 'door';
          const stroke = isDoor ? '#0d1626' : '#38bdf8';
          const common = { stroke, strokeWidth: 10, strokeLinecap: 'square' as const };
          if (opening.wall === 'north') return <line key={opening.id} x1={px(0) + center - half} y1={py(-room.depth / 2)} x2={px(0) + center + half} y2={py(-room.depth / 2)} {...common} />;
          if (opening.wall === 'south') return <line key={opening.id} x1={px(0) + center - half} y1={py(room.depth / 2)} x2={px(0) + center + half} y2={py(room.depth / 2)} {...common} />;
          if (opening.wall === 'east') return <line key={opening.id} x1={px(room.width / 2)} y1={py(0) + center - half} x2={px(room.width / 2)} y2={py(0) + center + half} {...common} />;
          return <line key={opening.id} x1={px(-room.width / 2)} y1={py(0) + center - half} x2={px(-room.width / 2)} y2={py(0) + center + half} {...common} />;
        })}

        {furniture.map((item) => {
          const x = item.transform.position[0];
          const z = item.transform.position[2];
          const width = item.size.width * Math.abs(item.transform.scale[0]);
          const depth = item.size.depth * Math.abs(item.transform.scale[2]);
          const selected = selectedFurnitureId === item.id;
          return (
            <g key={item.id} transform={`translate(${px(x)} ${py(z)}) rotate(${-item.transform.rotation[1] * 180 / Math.PI})`}
              onPointerDown={(event) => startDrag(event, { kind: 'furniture', id: item.id })}
              style={{ cursor: 'grab', touchAction: 'none' }}>
              <rect x={-width * scale / 2} y={-depth * scale / 2} width={width * scale} height={depth * scale}
                rx="5" fill={furnitureColors[item.type] ?? '#64748b'} stroke={selected ? '#60a5fa' : '#26364b'} strokeWidth={selected ? 4 : 2} opacity="0.95" />
              <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize={Math.max(9, Math.min(14, scale * 0.18))} pointerEvents="none">{item.name}</text>
            </g>
          );
        })}

        {devices.map((device) => {
          const x = device.transform.position[0];
          const z = device.transform.position[2];
          const selected = selectedDeviceId === device.id;
          const wallMounted = device.mount?.surface === 'wall';
          return (
            <g key={device.id} transform={`translate(${px(x)} ${py(z)})`}
              onPointerDown={wallMounted ? undefined : (event) => startDrag(event, { kind: 'device', id: device.id })}
              style={{ cursor: wallMounted ? 'default' : 'grab', touchAction: 'none' }}>
              <circle r={Math.max(9, scale * 0.13)} fill={device.type === 'esp32' ? '#10b981' : device.type === 'lamp' ? '#fbbf24' : '#8b5cf6'}
                stroke={selected ? '#60a5fa' : '#f8fafc'} strokeWidth={selected ? 4 : 2} />
              <text y={Math.max(22, scale * 0.28)} textAnchor="middle" fill="#e2e8f0" fontSize="10" pointerEvents="none">{device.name}</text>
            </g>
          );
        })}

        <text x="450" y="35" textAnchor="middle" fill="#e2e8f0" fontSize="15" fontWeight="600">{room.name}</text>
        <text x="450" y="590" textAnchor="middle" fill="#94a3b8" fontSize="11">{room.width.toFixed(2)} m × {room.depth.toFixed(2)} m · grade de 25 cm</text>
      </svg>
      <div className="homelab-plan-legend">
        <span><i className="legend-furniture" /> Móveis</span>
        <span><i className="legend-device" /> Dispositivos IoT</span>
        <span><i className="legend-door" /> Portas</span>
        <span><i className="legend-window" /> Janelas</span>
        <small>Arraste os itens para reposicionar · posições ajustadas em passos de 25 cm</small>
      </div>
    </div>
  );
}
