import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HomeFurniture, HomeLabProject, HomeRoom, SmartDevice } from './types';

interface HomeLabStore {
  project: HomeLabProject | null;
  selectedDeviceId: string | null;
  selectedRoomId: string | null;
  selectedFurnitureId: string | null;
  setProject: (project: HomeLabProject) => void;
  renameProject: (name: string) => void;
  addRoom: (room: HomeRoom) => void;
  updateRoom: (roomId: string, patch: Partial<HomeRoom>) => void;
  selectRoom: (roomId: string) => void;
  addDevice: (device: SmartDevice) => void;
  updateDevice: (deviceId: string, patch: Partial<SmartDevice>) => void;
  removeDevice: (deviceId: string) => void;
  addFurniture: (item: HomeFurniture) => void;
  updateFurniture: (itemId: string, patch: Partial<HomeFurniture>) => void;
  removeFurniture: (itemId: string) => void;
  selectFurniture: (itemId: string | null) => void;
  selectDevice: (deviceId: string | null) => void;
  clearProject: () => void;
}

export const useHomeLabStore = create<HomeLabStore>()(persist((set) => ({
  project: null,
  selectedDeviceId: null,
  selectedRoomId: null,
  selectedFurnitureId: null,

  setProject: (project) => set({
    project,
    selectedDeviceId: null,
    selectedFurnitureId: null,
    selectedRoomId: project.rooms[0]?.id ?? null,
  }),

  renameProject: (name) =>
    set((state) => state.project
      ? { project: { ...state.project, name, updatedAt: new Date().toISOString() } }
      : state),

  addRoom: (room) =>
    set((state) => {
      if (!state.project || state.project.rooms.some((item) => item.id === room.id)) return state;
      return {
        project: {
          ...state.project,
          rooms: [...state.project.rooms, room],
          updatedAt: new Date().toISOString(),
        },
        selectedRoomId: room.id,
        selectedDeviceId: null,
      };
    }),

  updateRoom: (roomId, patch) =>
    set((state) => {
      if (!state.project || !state.project.rooms.some((room) => room.id === roomId)) return state;
      return {
        project: {
          ...state.project,
          rooms: state.project.rooms.map((room) =>
            room.id === roomId ? { ...room, ...patch, id: room.id } : room,
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  selectRoom: (selectedRoomId) => set({ selectedRoomId, selectedDeviceId: null, selectedFurnitureId: null }),

  addDevice: (device) =>
    set((state) => {
      if (
        !state.project ||
        device.projectId !== state.project.id ||
        !state.project.rooms.some((room) => room.id === device.roomId) ||
        state.project.devices.some((item) => item.id === device.id)
      ) return state;
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
      if (!state.project || !state.project.devices.some((device) => device.id === deviceId)) return state;
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
        selectedDeviceId: state.selectedDeviceId === deviceId ? null : state.selectedDeviceId,
      };
    }),

  addFurniture: (item) =>
    set((state) => {
      if (!state.project || item.projectId !== state.project.id ||
        !state.project.rooms.some((room) => room.id === item.roomId) ||
        (state.project.furniture ?? []).some((entry) => entry.id === item.id)) return state;
      return {
        project: { ...state.project, furniture: [...(state.project.furniture ?? []), item], updatedAt: new Date().toISOString() },
        selectedFurnitureId: item.id, selectedDeviceId: null,
      };
    }),

  updateFurniture: (itemId, patch) =>
    set((state) => {
      if (!state.project || !(state.project.furniture ?? []).some((item) => item.id === itemId)) return state;
      return {
        project: {
          ...state.project,
          furniture: (state.project.furniture ?? []).map((item) =>
            item.id === itemId ? { ...item, ...patch, id: item.id } : item),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  removeFurniture: (itemId) =>
    set((state) => state.project ? {
      project: { ...state.project, furniture: (state.project.furniture ?? []).filter((item) => item.id !== itemId), updatedAt: new Date().toISOString() },
      selectedFurnitureId: state.selectedFurnitureId === itemId ? null : state.selectedFurnitureId,
    } : state),

  selectFurniture: (selectedFurnitureId) => set({ selectedFurnitureId, selectedDeviceId: null }),
  selectDevice: (selectedDeviceId) => set({ selectedDeviceId, selectedFurnitureId: null }),

  clearProject: () => set({ project: null, selectedDeviceId: null, selectedFurnitureId: null, selectedRoomId: null }),
}), {
  name: 'homelab-studio-project-v1',
}));
