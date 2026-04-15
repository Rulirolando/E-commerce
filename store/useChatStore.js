import { create } from "zustand";

const useChatStore = create((set) => ({
  unreadChatCount: 0,

  incrementUnreadChat: () =>
    set((state) => ({ unreadChatCount: state.unreadChatCount + 1 })),

  resetUnreadChat: () => set({ unreadChatCount: 0 }),

  setUnreadChatCount: (count) => set({ unreadChatCount: count }),
}));

export default useChatStore;
