"use client";

import { EditProfileScreen, useNavigation } from "@storynest/features";

/** After a save, return to the profile and re-render server data (the profile page reads it on the server). */
export function EditProfilePage() {
  const navigation = useNavigation();
  return (
    <EditProfileScreen
      onSaved={() => {
        navigation.replace("/me");
        navigation.refresh();
      }}
    />
  );
}
