export type HomeLabDeviceType =
  | 'esp32'
  | 'lamp'
  | 'switch'
  | 'motion_sensor'
  | 'outlet'
  | 'television'
  | 'air_conditioner';

export type FirmwareLanguage = 'arduino_cpp' | 'micropython';

export interface DeviceTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface GpioMapping {
  pin: number;
  direction: 'input' | 'output';
  signal: 'motion' | 'power' | 'switch' | 'custom';
  targetDeviceId: string;
}

export interface SimulationBinding {
  boardInstanceId: string;
  circuitProjectId?: string;
  language: FirmwareLanguage;
  gpioMappings: GpioMapping[];
}

export interface SmartDevice {
  id: string;
  projectId: string;
  roomId: string;
  type: HomeLabDeviceType;
  name: string;
  transform: DeviceTransform;
  state: {
    powered?: boolean;
    detected?: boolean;
    brightness?: number;
    temperature?: number;
  };
  simulation?: SimulationBinding;
}

export type OpeningType = 'door' | 'window';
export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface RoomOpening {
  id: string;
  type: OpeningType;
  wall: WallSide;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface HomeRoom {
  id: string;
  position?: { x: number; z: number };
  name: string;
  width: number;
  depth: number;
  height: number;
  openings?: RoomOpening[];
}

export interface HomeLabProject {
  id: string;
  name: string;
  rooms: HomeRoom[];
  devices: SmartDevice[];
  updatedAt: string;
}

export const createDeviceTransform = (): DeviceTransform => ({
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
});
