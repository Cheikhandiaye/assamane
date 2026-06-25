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