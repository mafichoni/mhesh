import { redirect, notFound } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PageProps {
  params: {
    code: string;
  };
}

export default async function ShareRedirectPage({ params }: PageProps) {
  const { code } = params;

  let targetPath = `/mhesh/p/${code}`;

  try {
    const res = await fetch(`${API_BASE}/api/mhesh/s/${encodeURIComponent(code)}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.target) {
        // data.target is typically "/p/{slug}"
        const cleanTarget = data.target.startsWith("/")
          ? data.target
          : `/${data.target}`;
        targetPath = `/mhesh${cleanTarget}`;
      }
    } else if (res.status === 404) {
      // In case share code is not found, fallback to public directory
      redirect("/mhesh");
    }
  } catch {
    // If backend connection fails, attempt fallback to aspirant page with code as slug
    targetPath = `/mhesh/p/${code}`;
  }

  redirect(targetPath);
}
