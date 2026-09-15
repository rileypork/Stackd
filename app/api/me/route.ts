import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();

  if (!user) {
    return Response.json({ user: null, signInPath: chatGPTSignInPath("/") });
  }

  const initials = (user.fullName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || user.email.slice(0, 2).toUpperCase();

  return Response.json({
    user: { email: user.email, displayName: user.displayName, initials },
    signOutPath: user.source === "chatgpt" ? chatGPTSignOutPath("/") : null,
  });
}
