import { create } from "zustand";

const useNotificationStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decreaseCount: () => set({ unreadCount: 0 }),
}));

export default useNotificationStore;
