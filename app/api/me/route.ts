import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "../../chatgpt-auth";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  const host = new URL(request.url).hostname;
  const local = !user && (host === "localhost" || host === "127.0.0.1");

  if (!user && !local) {
    return Response.json({ user: null, signInPath: chatGPTSignInPath("/") });
  }

  const email = user?.email ?? "local@stackd.dev";
  const displayName = user?.displayName ?? "Local developer";
  const initials = (user?.fullName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || email.slice(0, 2).toUpperCase();

  return Response.json({
    user: { email, displayName, initials },
    signOutPath: user ? chatGPTSignOutPath("/") : null,
  });
}
