import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle, AlertCircle, TrendingUp, Clock } from "lucide-react";

interface ProfessorStats {
  total_etudiants: number;
  total_parcours: number;
  validations_attente: number;
  taux_reussite_global: number;
  etudiants_difficulte: number;
  moyenne_globale: number;
}

interface ProfessorStatsCardProps {
  stats: ProfessorStats;
}

export function ProfessorStatsCard({ stats }: ProfessorStatsCardProps) {
  const statsItems = [
    {
      label: "Étudiants",
      value: stats.total_etudiants,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    {
      label: "Parcours",
      value: stats.total_parcours,
      icon: BookOpen,
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
    {
      label: "Validations en attente",
      value: stats.validations_attente,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50"
    },
    {
      label: "Taux de réussite",
      value: `${stats.taux_reussite_global || 0}%`,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-50"
    },
    {
      label: "Moyenne globale",
      value: `${stats.moyenne_globale || 0}/20`,
      icon: CheckCircle,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      label: "En difficulté",
      value: stats.etudiants_difficulte,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-50"
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {statsItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="border-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
