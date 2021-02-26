/*
 * canWrite.js
 */

export default function canWrite(state) {
  const currentUser = state.users.itemsByID[state.auth.currentUserID]
  if (!currentUser)
    return false
  return currentUser.is_staff || currentUser.is_superuser
}
