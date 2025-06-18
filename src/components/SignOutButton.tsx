import { useAuthActions } from "@convex-dev/auth/react";

export default function SignOutButton() {
  const { signOut } = useAuthActions();
  return (
    <button
      className="bg-white shadow/30 px-2 py-1 cursor-pointer"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}
