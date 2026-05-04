import { supabase } from "@/lib/supabase";
import {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database.types";
import {
  fetchCurrentUserProfile,
  getCurrentUserId,
  normalizeUsername,
  Profile,
} from "./profiles";

export type Friendship = Tables<"friendships">;
type FriendshipInsert = TablesInsert<"friendships">;
type FriendshipUpdate = TablesUpdate<"friendships">;

export type FriendRelationship = Friendship & {
  profile: Profile;
};

export type FriendshipsSnapshot = {
  friends: FriendRelationship[];
  incomingRequests: FriendRelationship[];
  outgoingRequests: FriendRelationship[];
};

const profileSelect = "id, username, display_name, created_at, updated_at";
const friendshipSelect =
  "id, requester_id, addressee_id, status, created_at, responded_at";

const pendingStatus = "pending";
const acceptedStatus = "accepted";
const rejectedStatus = "rejected";

const fetchProfilesByIds = async (
  profileIds: string[],
): Promise<Map<string, Profile>> => {
  const uniqueIds = Array.from(new Set(profileIds));

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .in("id", uniqueIds)
    .returns<Profile[]>();

  if (error) {
    throw new Error(`Unable to load friend profiles: ${error.message}`);
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
};

const attachProfiles = async (
  friendships: Friendship[],
  getProfileId: (friendship: Friendship) => string,
): Promise<FriendRelationship[]> => {
  const profileById = await fetchProfilesByIds(friendships.map(getProfileId));

  return friendships.flatMap((friendship) => {
    const profile = profileById.get(getProfileId(friendship));

    if (!profile) {
      return [];
    }

    return [{ ...friendship, profile }];
  });
};

const fetchFriendshipsForCurrentUser = async (
  userId: string,
): Promise<Friendship[]> => {
  const { data, error } = await supabase
    .from("friendships")
    .select(friendshipSelect)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .returns<Friendship[]>();

  if (error) {
    throw new Error(`Unable to load friend requests: ${error.message}`);
  }

  return data ?? [];
};

export const fetchFriendshipsSnapshot =
  async (): Promise<FriendshipsSnapshot> => {
    const userId = await getCurrentUserId();
    const friendships = await fetchFriendshipsForCurrentUser(userId);
    const accepted = friendships.filter(
      (friendship) => friendship.status === acceptedStatus,
    );
    const incoming = friendships.filter(
      (friendship) =>
        friendship.status === pendingStatus && friendship.addressee_id === userId,
    );
    const outgoing = friendships.filter(
      (friendship) =>
        friendship.status === pendingStatus && friendship.requester_id === userId,
    );

    const [friends, incomingRequests, outgoingRequests] = await Promise.all([
      attachProfiles(accepted, (friendship) =>
        friendship.requester_id === userId
          ? friendship.addressee_id
          : friendship.requester_id,
      ),
      attachProfiles(incoming, (friendship) => friendship.requester_id),
      attachProfiles(outgoing, (friendship) => friendship.addressee_id),
    ]);

    return {
      friends,
      incomingRequests,
      outgoingRequests,
    };
  };

const fetchProfileByUsername = async (
  username: string,
): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("username", username)
    .maybeSingle<Profile>();

  if (error) {
    throw new Error(`Unable to search for that user: ${error.message}`);
  }

  return data;
};

const findExistingFriendship = async ({
  requesterId,
  addresseeId,
}: {
  requesterId: string;
  addresseeId: string;
}): Promise<Friendship | null> => {
  const { data, error } = await supabase
    .from("friendships")
    .select(friendshipSelect)
    .or(
      `and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`,
    )
    .limit(1)
    .maybeSingle<Friendship>();

  if (error) {
    throw new Error(`Unable to check friend status: ${error.message}`);
  }

  return data;
};

export const sendFriendRequest = async (
  rawUsername: string,
): Promise<FriendRelationship> => {
  const currentProfile = await fetchCurrentUserProfile();

  if (!currentProfile) {
    throw new Error("Create a social profile before adding friends.");
  }

  const username = normalizeUsername(rawUsername);

  if (username.length < 3) {
    throw new Error("Enter a username with at least 3 characters.");
  }

  const targetProfile = await fetchProfileByUsername(username);

  if (!targetProfile) {
    throw new Error("No user was found with that username.");
  }

  if (targetProfile.id === currentProfile.id) {
    throw new Error("You cannot send a friend request to yourself.");
  }

  const existingFriendship = await findExistingFriendship({
    requesterId: currentProfile.id,
    addresseeId: targetProfile.id,
  });

  if (existingFriendship?.status === acceptedStatus) {
    throw new Error("You are already friends with that user.");
  }

  if (existingFriendship?.status === pendingStatus) {
    throw new Error("A friend request is already pending with that user.");
  }

  const request: FriendshipInsert = {
    requester_id: currentProfile.id,
    addressee_id: targetProfile.id,
    status: pendingStatus,
  };

  const { data, error } = await supabase
    .from("friendships")
    .insert(request)
    .select(friendshipSelect)
    .single<Friendship>();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A friend request already exists with that user.");
    }

    throw new Error(`Unable to send friend request: ${error.message}`);
  }

  return {
    ...data,
    profile: targetProfile,
  };
};

const updateFriendshipStatus = async ({
  friendshipId,
  status,
}: {
  friendshipId: string;
  status: string;
}): Promise<Friendship> => {
  const userId = await getCurrentUserId();
  const update: FriendshipUpdate = {
    status,
    responded_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("friendships")
    .update(update)
    .eq("id", friendshipId)
    .eq("addressee_id", userId)
    .eq("status", pendingStatus)
    .select(friendshipSelect)
    .single<Friendship>();

  if (error) {
    throw new Error(`Unable to update friend request: ${error.message}`);
  }

  return data;
};

export const acceptFriendRequest = async (
  friendshipId: string,
): Promise<Friendship> =>
  updateFriendshipStatus({ friendshipId, status: acceptedStatus });

export const rejectFriendRequest = async (
  friendshipId: string,
): Promise<Friendship> =>
  updateFriendshipStatus({ friendshipId, status: rejectedStatus });

export const removeFriend = async (friendshipId: string): Promise<void> => {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .eq("status", acceptedStatus)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    throw new Error(`Unable to remove friend: ${error.message}`);
  }
};
