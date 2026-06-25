import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="sticky top-0 z-40 bg-orange-500 px-4 py-2 text-center text-xs font-medium text-white">
      📵 Mode hors ligne — vos modifications sont sauvegardées localement
    </div>
  );
}