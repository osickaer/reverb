import { supabase } from "@/lib/supabase";
import { Tables, TablesInsert } from "@/types/database.types";

export type Profile = Tables<"profiles">;

type ProfileInsert = TablesInsert<"profiles">;

export const normalizeUsername = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

export const validateProfileInput = ({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}): string | null => {
  if (username.length < 3) {
    return "Choose a username with at least 3 characters.";
  }

  if (username.length > 20) {
    return "Usernames can be no longer than 20 characters.";
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    return "Usernames can only use lowercase letters, numbers, and underscores.";
  }

  if (displayName.trim().length < 2) {
    return "Enter a display name with at least 2 characters.";
  }

  if (displayName.trim().length > 40) {
    return "Display names can be no longer than 40 characters.";
  }

  return null;
};

export const getCurrentUserId = async (): Promise<string> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Unable to load signed-in user: ${error.message}`);
  }

  if (!user) {
    throw new Error("You need to be signed in to use social features.");
  }

  return user.id;
};

export const fetchCurrentUserProfile = async (): Promise<Profile | null> => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle<Profile>();

  if (error) {
    throw new Error(`Unable to load social profile: ${error.message}`);
  }

  return data;
};

export const createCurrentUserProfile = async ({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}): Promise<Profile> => {
  const normalizedUsername = normalizeUsername(username);
  const trimmedDisplayName = displayName.trim();
  const validationError = validateProfileInput({
    username: normalizedUsername,
    displayName: trimmedDisplayName,
  });

  if (validationError) {
    throw new Error(validationError);
  }

  const userId = await getCurrentUserId();
  const profile: ProfileInsert = {
    id: userId,
    username: normalizedUsername,
    display_name: trimmedDisplayName,
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(profile)
    .select("id, username, display_name, created_at, updated_at")
    .single<Profile>();

  if (error) {
    if (error.code === "23505") {
      throw new Error("That username is already taken.");
    }

    throw new Error(`Unable to create social profile: ${error.message}`);
  }

  return data;
};
