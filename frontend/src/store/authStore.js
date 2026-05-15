import { create } from "zustand";
import { loginUser, registerUser } from "../services/api";

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("jansetu_token") || null,
  role: localStorage.getItem("jansetu_role") || null,
  loading: false,
  error: null,

  login: async (phone, password) => {
    set({ loading: true, error: null });
    try {
      const data = await loginUser({ phone, password });
      localStorage.setItem("jansetu_token", data.access_token);
      localStorage.setItem("jansetu_role", data.role || "citizen");
      set({
        token: data.access_token,
        user: { name: data.name, role: data.role },
        role: data.role || "citizen",
        loading: false,
      });
      return { success: true, role: data.role };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  register: async (name, phone, password) => {
    set({ loading: true, error: null });
    try {
      await registerUser({ name, phone, password });
      set({ loading: false });
      return { success: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  logout: () => {
    localStorage.removeItem("jansetu_token");
    localStorage.removeItem("jansetu_role");
    set({ user: null, token: null, role: null });
  },

  setRole: (role) => {
    localStorage.setItem("jansetu_role", role);
    set((s) => ({ user: { ...s.user, role }, role }));
  },
}));
