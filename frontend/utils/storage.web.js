// Web: Use localStorage (tokens are not "secure" in browser context anyway)
export const storage = {
  getItemAsync: async (key) => localStorage.getItem(key),
  setItemAsync: async (key, value) => localStorage.setItem(key, value),
  deleteItemAsync: async (key) => localStorage.removeItem(key),
};
