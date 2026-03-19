import AsyncStorage from "@react-native-async-storage/async-storage";

export const debugReverbStorage = async () => {
  const session = await AsyncStorage.getItem("@reverb_daily_session");
  const stats = await AsyncStorage.getItem("@reverb_user_stats");

  console.log("SESSION RAW:", session);
  console.log("STATS RAW:", stats);
  console.log("SESSION PARSED:", session ? JSON.parse(session) : null);
  console.log("STATS PARSED:", stats ? JSON.parse(stats) : null);
};

export const listAllStorage = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const values = await AsyncStorage.multiGet(keys);
  console.log("ALL ASYNC STORAGE:", values);
};

export const clearReverbStorage = async () => {
  await AsyncStorage.multiRemove([
    "@reverb_daily_session",
    "@reverb_user_stats",
  ]);
  console.log("Cleared Reverb storage");
};
