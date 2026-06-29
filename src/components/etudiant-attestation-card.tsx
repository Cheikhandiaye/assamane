import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, Download, RefreshCw, FileText, Award, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateAttestation } from "@/lib/attestation";

interface ModuleNote {
  module_id: string;
  module_titre: string;
  note_finale: number;
  seuil_reussite: number;
}

interface AttestationData {
  parcours_titre: string;
  complete: boolean;
  eligible: boolean;
  note_moyenne: number;
  modules_valides: number;
  modules_total: number;
  taux_reussite: number;
  modules_echoues: ModuleNote[];
  modules_a_reprendre: ModuleNote[];
  seuil_requis: number;
  message: string;
  peut_telecharger: boolean;
  peut_refaire_modules: boolean;
  date_generation: string;
}

interface EtudiantAttestationCardProps {
  etudiantId: string;
  parcoursId: string;
  parcoursTitre: string;
}

export function EtudiantAttestationCard({ etudiantId, parcoursId, parcoursTitre }: EtudiantAttestationCardProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<AttestationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc("fn_parcours_attestation", {
        p_etudiant_id: etudiantId,
        p_parcours_id: parcoursId,
      });

      if (rpcError) throw rpcError;
      setData(result);
    } catch (error: any) {
      console.error("Erreur chargement attestation:", error);
      setError(error.message || "Erreur de chargement");
      toast.error(error.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (etudiantId && parcoursId) {
      loadData();
    }
  }, [etudiantId, parcoursId]);

  const handleGenerateAttestation = async () => {
    setGenerating(true);
    try {
      await generateAttestation(etudiantId, parcoursId);
      toast.success("Attestation générée avec succès !");
    } catch (error: any) {
      console.error("Erreur génération:", error);
      toast.error(error.message || "Erreur lors de la génération de l'attestation");
    } finally {
      setGenerating(false);
    }
  };

  const handleReprendreModule = (moduleId: string) => {
    window.location.href = `/etudiant/module/${moduleId}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Chargement de l'éligibilité...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="text-red-500">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadData}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Aucune donnée disponible</p>
        </CardContent>
      </Card>
    );
  }

  const isEligible = data.eligible;
  const isComplete = data.complete;
  const noteMoyenne = data.note_moyenne || 0;
  const modulesAReprendre = data.modules_a_reprendre || [];
  const tauxReussite = data.taux_reussite || 0;

  return (
    <Card className={`border ${isEligible ? "border-green-200" : isComplete ? "border-amber-200" : "border-primary/10"}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className={`h-5 w-5 ${isEligible ? "text-green-500" : "text-muted-foreground"}`} />
          Attestation - {parcoursTitre}
        </CardTitle>
        <CardDescription>
          {isEligible 
            ? "✅ Vous êtes éligible à l'attestation de ce parcours !" 
            : isComplete 
              ? "⚠️ Parcours terminé mais note insuffisante" 
              : "📚 Parcours en cours"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statut */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {isEligible ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : isComplete ? (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-medium">
              {isEligible 
                ? "✅ Éligible" 
                : isComplete 
                  ? "⚠️ Note insuffisante" 
                  : "🔒 Non terminé"}
            </span>
          </div>
          <Badge variant={noteMoyenne >= 10 ? "default" : "destructive"}>
            Moyenne: {noteMoyenne.toFixed(1)}/20
          </Badge>
        </div>

        {/* Progression */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{tauxReussite.toFixed(1)}%</span>
          </div>
          <Progress value={tauxReussite} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {data.modules_valides} / {data.modules_total} modules validés
          </p>
        </div>

        {/* Modules à reprendre */}
        {modulesAReprendre.length > 0 && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Modules à repasser</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                {modulesAReprendre.map((module) => (
                  <li key={module.module_id} className="flex items-center justify-between">
                    <span>
                      {module.module_titre} - Note: {module.note_finale.toFixed(1)}/20
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => handleReprendreModule(module.module_id)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Repasser
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-2 text-muted-foreground">
                {data.peut_refaire_modules 
                  ? "Vous pouvez repasser ces modules pour améliorer votre note." 
                  : "Contactez votre formateur pour plus d'informations."}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Message */}
        <p className="text-sm text-muted-foreground">{data.message}</p>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        {isEligible ? (
          <Button 
            onClick={handleGenerateAttestation} 
            disabled={generating}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {generating ? "Génération..." : "Télécharger l'attestation"}
          </Button>
        ) : isComplete && modulesAReprendre.length > 0 ? (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              const firstModule = modulesAReprendre[0];
              if (firstModule) {
                handleReprendreModule(firstModule.module_id);
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Repasser les modules échoués
          </Button>
        ) : (
          <Button variant="secondary" className="flex-1" disabled>
            <FileText className="h-4 w-4 mr-2" />
            {isComplete ? "Note insuffisante" : "Parcours non terminé"}
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </CardFooter>
    </Card>
  );
}
