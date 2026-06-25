import { useOfflineSync } from "@/hooks/use-offline-sync";
import { cn } from "@/lib/utils";

export function ConnectionIndicator() {
  const { isOnline } = useOfflineSync();
  return (
    <span
      title={isOnline ? "Connecté" : "Hors connexion — tes données sont sauvegardées"}
      className={cn(
        "inline-block h-2 w-2 rounded-full transition-colors duration-300",
        isOnline ? "bg-green-500" : "bg-orange-500 animate-pulse",
      )}
    />
  );
}

export function OfflineBanner() {
  const { isOnline } = useOfflineSync();
  if (isOnline) return null;
  return (
    <div className="sticky top-0 z-40 bg-orange-500 px-4 py-2 text-center text-xs font-medium text-white">
      📵 Hors connexion — Tes réponses sont sauvegardées localement et seront synchronisées automatiquement.
    </div>
  );
}