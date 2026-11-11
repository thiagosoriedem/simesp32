import { create } from 'zustand';
import type { HomeLabProject, HomeRoom, SmartDevice } from './types';

interface HomeLabStore {
  project: HomeLabProject | null;
  selectedDeviceId: string | null;
  setProject: (project: HomeLabProject) => void;
  renameProject: (name: string) => void;
  addRoom: (room: HomeRoom) => void;
  addDevice: (device: SmartDevice) => void;
  updateDevice: (deviceId: string, patch: Partial<SmartDevice>) => void;
  removeDevice: (deviceId: string) => void;
  selectDevice: (deviceId: string | null) => void;
  clearProject: () => void;
}

export const useHomeLabStore = create<HomeLabStore>((set) => ({
  project: null,
  selectedDeviceId: null,

  setProject: (project) => set({ project, selectedDeviceId: null }),

  renameProject: (name) =>
    set((state) => state.project ? ({ project: { ...state.project, name, updatedAt: new Date().toISOString() } }) : state),

  addRoom: (room) =>
    set((state) => {
      if (!state.project || state.project.rooms.some((item) => item.id === room.id)) {
        return state;
      }
      return {
        project: {
          ...state.project,
          rooms: [...state.project.rooms, room],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  addDevice: (device) =>
    set((state) => {
      if (
        !state.project ||
        device.projectId !== state.project.id ||
        !state.project.rooms.some((room) => room.id === device.roomId) ||
        state.project.devices.some((item) => item.id === device.id)
      ) {
        return state;
      }
      return {
        project: {
          ...state.project,
          devices: [...state.project.devices, device],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  updateDevice: (deviceId, patch) =>
    set((state) => {
      if (!state.project) return state;
      const exists = state.project.devices.some((device) => device.id === deviceId);
      if (!exists) return state;
      return {
        project: {
          ...state.project,
          devices: state.project.devices.map((device) =>
            device.id === deviceId ? { ...device, ...patch, id: device.id } : device,
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  removeDevice: (deviceId) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          devices: state.project.devices.filter((device) => device.id !== deviceId),
          updatedAt: new Date().toISOString(),
        },
        selectedDeviceId:
          state.selectedDeviceId === deviceId ? null : state.selectedDeviceId,
      };
    }),

  selectDevice: (selectedDeviceId) => set({ selectedDeviceId }),

  clearProject: () => set({ project: null, selectedDeviceId: null }),
}));
