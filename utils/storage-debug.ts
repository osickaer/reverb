import AsyncStorage from "@react-native-async-storage/async-storage";

const REVERB_STORAGE_PREFIXES = [
  "@reverb_daily_session",
  "@reverb_freeplay_session",
  "@reverb_user_stats",
];

const getReverbStorageKeys = async () => {
  const keys = await AsyncStorage.getAllKeys();

  return keys.filter((key) =>
    REVERB_STORAGE_PREFIXES.some(
      (prefix) => key === prefix || key.startsWith(`${prefix}:`),
    ),
  );
};

export const debugReverbStorage = async () => {
  const keys = await getReverbStorageKeys();
  const values = await AsyncStorage.multiGet(keys);

  console.log("REVERB STORAGE:", values);
};

export const listAllStorage = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const values = await AsyncStorage.multiGet(keys);
  console.log("ALL ASYNC STORAGE:", values);
};

export const clearReverbStorage = async () => {
  const keys = await getReverbStorageKeys();
  await AsyncStorage.multiRemove(keys);
  console.log("Cleared Reverb storage");
};
