export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acces_module: {
        Row: {
          debloque_le: string | null
          etudiant_id: string | null
          id: string
          module_id: string | null
          parcours_id: string | null
          source_acces: string
        }
        Insert: {
          debloque_le?: string | null
          etudiant_id?: string | null
          id?: string
          module_id?: string | null
          parcours_id?: string | null
          source_acces: string
        }
        Update: {
          debloque_le?: string | null
          etudiant_id?: string | null
          id?: string
          module_id?: string | null
          parcours_id?: string | null
          source_acces?: string
        }
        Relationships: [
          {
            foreignKeyName: "acces_module_etudiant_id_fkey"
            columns: ["etudiant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acces_module_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_cours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acces_module_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          condition_type: string | null
          couleur: string | null
          description: string | null
          icone: string | null
          id: string
          nom: string
        }
        Insert: {
          condition_type?: string | null
          couleur?: string | null
          description?: string | null
          icone?: string | null
          id?: string
          nom: string
        }
        Update: {
          condition_type?: string | null
          couleur?: string | null
          description?: string | null
          icone?: string | null
          id?: string
          nom?: string
        }
        Relationships: []
      }
      badges_etudiants: {
        Row: {
          badge_id: string | null
          etudiant_id: string | null
          id: string
          obtenu_le: string | null
          parcours_id: string | null
        }
        Insert: {
          badge_id?: string | null
          etudiant_id?: string | null
          id?: string
          obtenu_le?: string | null
          parcours_id?: string | null
        }
        Update: {
          badge_id?: string | null
          etudiant_id?: string | null
          id?: string
          obtenu_le?: string | null
          parcours_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badges_etudiants_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_etudiants_etudiant_id_fkey"
            columns: ["etudiant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_etudiants_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
      bibliotheque_modules: {
        Row: {
          id: string
          module_id: string | null
          rendu_global_le: string | null
          rendu_global_par: string | null
        }
        Insert: {
          id?: string
          module_id?: string | null
          rendu_global_le?: string | null
          rendu_global_par?: string | null
        }
        Update: {
          id?: string
          module_id?: string | null
          rendu_global_le?: string | null
          rendu_global_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bibliotheque_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_cours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bibliotheque_modules_rendu_global_par_fkey"
            columns: ["rendu_global_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cahier_de_texte: {
        Row: {
          chapitres_traites: string | null
          created_at: string | null
          date_seance: string
          duree_minutes: number | null
          heure_debut: string | null
          heure_fin: string | null
          id: string
          liste_absents: string[] | null
          liste_presents: string[] | null
          mission_id: string | null
          modules_traites: string[] | null
          nb_presents: number | null
          objectifs_seance: string | null
          observations: string | null
          parcours_id: string | null
          partenaire_id: string | null
          professeur_id: string | null
          realise: string | null
          session_id: string | null
          signe_le: string | null
          signe_par: string | null
        }
        Insert: {
          chapitres_traites?: string | null
          created_at?: string | null
          date_seance: string
          duree_minutes?: number | null
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          liste_absents?: string[] | null
          liste_presents?: string[] | null
          mission_id?: string | null
          modules_traites?: string[] | null
          nb_presents?: number | null
          objectifs_seance?: string | null
          observations?: string | null
          parcours_id?: string | null
          partenaire_id?: string | null
          professeur_id?: string | null
          realise?: string | null
          session_id?: string | null
          signe_le?: string | null
          signe_par?: string | null
        }
        Update: {
          chapitres_traites?: string | null
          created_at?: string | null
          date_seance?: string
          duree_minutes?: number | null
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          liste_absents?: string[] | null
          liste_presents?: string[] | null
          mission_id?: string | null
          modules_traites?: string[] | null
          nb_presents?: number | null
          objectifs_seance?: string | null
          observations?: string | null
          parcours_id?: string | null
          partenaire_id?: string | null
          professeur_id?: string | null
          realise?: string | null
          session_id?: string | null
          signe_le?: string | null
          signe_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cahier_de_texte_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cahier_de_texte_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cahier_de_texte_partenaire_id_fkey"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cahier_de_texte_professeur_id_fkey"
            columns: ["professeur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cahier_de_texte_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_cours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cahier_de_texte_signe_par_fkey"
            columns: ["signe_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contenus_module: {
        Row: {
          contenu_texte: string | null
          created_at: string | null
          duree_video_secondes: number | null
          id: string
          module_id: string | null
          ordre: number
          titre: string | null
          type: string
          video_platform: string | null
          video_url: string | null
        }
        Insert: {
          contenu_texte?: string | null
          created_at?: string | null
          duree_video_secondes?: number | null
          id?: string
          module_id?: string | null
          ordre: number
          titre?: string | null
          type: string
          video_platform?: string | null
          video_url?: string | null
        }
        Update: {
          contenu_texte?: string | null
          created_at?: string | null
          duree_video_secondes?: number | null
          id?: string
          module_id?: string | null
          ordre?: number
          titre?: string | null
          type?: string
          video_platform?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contenus_module_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_cours"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_prolongation: {
        Row: {
          commentaire_admin: string | null
          created_at: string | null
          date_accordee: string | null
          date_souhaitee: string
          demandee_par: string | null
          id: string
          justification: string
          mission_id: string | null
          statut: string | null
          traitee_le: string | null
          traitee_par: string | null
        }
        Insert: {
          commentaire_admin?: string | null
          created_at?: string | null
          date_accordee?: string | null
          date_souhaitee: string
          demandee_par?: string | null
          id?: string
          justification: string
          mission_id?: string | null
          statut?: string | null
          traitee_le?: string | null
          traitee_par?: string | null
        }
        Update: {
          commentaire_admin?: string | null
          created_at?: string | null
          date_accordee?: string | null
          date_souhaitee?: string
          demandee_par?: string | null
          id?: string
          justification?: string
          mission_id?: string | null
          statut?: string | null
          traitee_le?: string | null
          traitee_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_prolongation_demandee_par_fkey"
            columns: ["demandee_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_prolongation_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_prolongation_traitee_par_fkey"
            columns: ["traitee_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      etapes: {
        Row: {
          champs: Json | null
          description: string | null
          id: string
          max_tentatives: number | null
          module_id: string | null
          ordre: number
          titre: string
          type: string | null
        }
        Insert: {
          champs?: Json | null
          description?: string | null
          id?: string
          max_tentatives?: number | null
          module_id?: string | null
          ordre: number
          titre: string
          type?: string | null
        }
        Update: {
          champs?: Json | null
          description?: string | null
          id?: string
          max_tentatives?: number | null
          module_id?: string | null
          ordre?: number
          titre?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etapes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_cours"
            referencedColumns: ["id"]
          },
        ]
      }
      groupe_membres: {
        Row: {
          etudiant_id: string
          groupe_id: string
        }
        Insert: {
          etudiant_id: string
          groupe_id: string
        }
        Update: {
          etudiant_id?: string
          groupe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupe_membres_etudiant_id_fkey"
            columns: ["etudiant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupe_membres_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
        ]
      }
      groupes: {
        Row: {
          created_at: string | null
          created_by: string | null
          historique_rapporteurs: Json | null
          id: string
          nom: string
          parcours_id: string | null
          rapporteur_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          historique_rapporteurs?: Json | null
          id?: string
          nom: string
          parcours_id?: string | null
          rapporteur_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          historique_rapporteurs?: Json | null
          id?: string
          nom?: string
          parcours_id?: string | null
          rapporteur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groupes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupes_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupes_rapporteur_id_fkey"
            columns: ["rapporteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          description: string | null
          dupliquee_depuis: string | null
          id: string
          nom: string
          partenaire_id: string | null
          statut: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          dupliquee_depuis?: string | null
          id?: string
          nom: string
          partenaire_id?: string | null
          statut?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          dupliquee_depuis?: string | null
          id?: string
          nom?: string
          partenaire_id?: string | null
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_dupliquee_depuis_fkey"
            columns: ["dupliquee_depuis"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_partenaire_id_fkey"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
        ]
      }
      modules_cours: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duplique_depuis: string | null
          est_global: boolean | null
          id: string
          ordre: number
          parcours_id: string | null
          titre: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duplique_depuis?: string | null
          est_global?: boolean | null
          id?: string
          ordre: number
          parcours_id?: string | null
          titre: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duplique_depuis?: string | null
          est_global?: boolean | null
          id?: string
          ordre?: number
          parcours_id?: string | null
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_cours_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_cours_duplique_depuis_fkey"
            columns: ["duplique_depuis"]
            isOneToOne: false
            referencedRelation: "modules_cours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_cours_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          destinataire_id: string | null
          id: string
          lien: string | null
          lu: boolean | null
          message: string
          titre: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          destinataire_id?: string | null
          id?: string
          lien?: string | null
          lu?: boolean | null
          message: string
          titre: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          destinataire_id?: string | null
          id?: string
          lien?: string | null
          lu?: boolean | null
          message?: string
          titre?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_destinataire_id_fkey"
            columns: ["destinataire_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duplique_depuis: string | null
          id: string
          mission_id: string | null
          nom: string
          pondere_groupe: number | null
          pondere_individuel: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duplique_depuis?: string | null
          id?: string
          mission_id?: string | null
          nom: string
          pondere_groupe?: number | null
          pondere_individuel?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duplique_depuis?: string | null
          id?: string
          mission_id?: string | null
          nom?: string
          pondere_groupe?: number | null
          pondere_individuel?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcours_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcours_duplique_depuis_fkey"
            columns: ["duplique_depuis"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcours_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_etudiants: {
        Row: {
          date_inscription: string | null
          etudiant_id: string
          mode: string | null
          modules_hybrides: string[] | null
          parcours_id: string
        }
        Insert: {
          date_inscription?: string | null
          etudiant_id: string
          mode?: string | null
          modules_hybrides?: string[] | null
          parcours_id: string
        }
        Update: {
          date_inscription?: string | null
          etudiant_id?: string
          mode?: string | null
          modules_hybrides?: string[] | null
          parcours_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcours_etudiants_etudiant_id_fkey"
            columns: ["etudiant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcours_etudiants_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_professeurs: {
        Row: {
          modules_assignes: string[] | null
          parcours_id: string
          professeur_id: string
        }
        Insert: {
          modules_assignes?: string[] | null
          parcours_id: string
          professeur_id: string
        }
        Update: {
          modules_assignes?: string[] | null
          parcours_id?: string
          professeur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcours_professeurs_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcours_professeurs_professeur_id_fkey"
            columns: ["professeur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partenaires: {
        Row: {
          adresse: string | null
          contact_email: string | null
          couleur_primaire: string | null
          couleur_secondaire: string | null
          created_at: string | null
          created_by: string | null
          id: string
          logo_url: string | null
          nom: string
        }
        Insert: {
          adresse?: string | null
          contact_email?: string | null
          couleur_primaire?: string | null
          couleur_secondaire?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          nom: string
        }
        Update: {
          adresse?: string | null
          contact_email?: string | null
          couleur_primaire?: string | null
          couleur_secondaire?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "partenaires_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presences: {
        Row: {
          acces_carnet_immediat: boolean | null
          created_at: string | null
          etudiant_id: string | null
          id: string
          present: boolean | null
          session_id: string | null
        }
        Insert: {
          acces_carnet_immediat?: boolean | null
          created_at?: string | null
          etudiant_id?: string | null
          id?: string
          present?: boolean | null
          session_id?: string | null
        }
        Update: {
          acces_carnet_immediat?: boolean | null
          created_at?: string | null
          etudiant_id?: string | null
          id?: string
          present?: boolean | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presences_etudiant_id_fkey"
            columns: ["etudiant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presences_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_cours"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          onboarding_done: boolean | null
          partenaire_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          onboarding_done?: boolean | null
          partenaire_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          onboarding_done?: boolean | null
          partenaire_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_partenaire"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
        ]
      }
      reponses_etudiant: {
        Row: {
          commentaire_prof: string | null
          contenu: Json | null
          created_at: string | null
          etape_id: string | null
          etudiant_id: string | null
          id: string
          nb_tentatives: number | null
          note: number | null
          parcours_id: string | null
          rouverte_le: string | null
          rouverte_par: string | null
          statut: string | null
          updated_at: string | null
          valide_en_letat: boolean | null
          valide_le: string | null
          valide_par: string | null
        }
        Insert: {
          commentaire_prof?: string | null
          contenu?: Json | null
          created_at?: string | null
          etape_id?: string | null
          etudiant_id?: string | null
          id?: string
          nb_tentatives?: number | null
          note?: number | null
          parcours_id?: string | null
          rouverte_le?: string | null
          rouverte_par?: string | null
          statut?: string | null
          updated_at?: string | null
          valide_en_letat?: boolean | null
          valide_le?: string | null
          valide_par?: string | null
        }
        Update: {
          commentaire_prof?: string | null
          contenu?: Json | null
          created_at?: string | null
          etape_id?: string | null
          etudiant_id?: string | null
          id?: string
          nb_tentatives?: number | null
          note?: number | null
          parcours_id?: string | null
          rouverte_le?: string | null
          rouverte_par?: string | null
          statut?: string | null
          updated_at?: string | null
          valide_en_letat?: boolean | null
          valide_le?: string | null
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reponses_etudiant_etape_id_fkey"
            columns: ["etape_id"]
            isOneToOne: false
            referencedRelation: "etapes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reponses_etudiant_etudiant_id_fkey"
            columns: ["etudiant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reponses_etudiant_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reponses_etudiant_rouverte_par_fkey"
            columns: ["rouverte_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reponses_etudiant_valide_par_fkey"
            columns: ["valide_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reponses_groupe: {
        Row: {
          commentaire_prof: string | null
          contenu: Json | null
          created_at: string | null
          etape_id: string | null
          groupe_id: string | null
          id: string
          nb_tentatives: number | null
          note: number | null
          parcours_id: string | null
          rouverte_le: string | null
          rouverte_par: string | null
          statut: string | null
          updated_at: string | null
          valide_en_letat: boolean | null
          valide_le: string | null
          valide_par: string | null
        }
        Insert: {
          commentaire_prof?: string | null
          contenu?: Json | null
          created_at?: string | null
          etape_id?: string | null
          groupe_id?: string | null
          id?: string
          nb_tentatives?: number | null
          note?: number | null
          parcours_id?: string | null
          rouverte_le?: string | null
          rouverte_par?: string | null
          statut?: string | null
          updated_at?: string | null
          valide_en_letat?: boolean | null
          valide_le?: string | null
          valide_par?: string | null
        }
        Update: {
          commentaire_prof?: string | null
          contenu?: Json | null
          created_at?: string | null
          etape_id?: string | null
          groupe_id?: string | null
          id?: string
          nb_tentatives?: number | null
          note?: number | null
          parcours_id?: string | null
          rouverte_le?: string | null
          rouverte_par?: string | null
          statut?: string | null
          updated_at?: string | null
          valide_en_letat?: boolean | null
          valide_le?: string | null
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reponses_groupe_etape_id_fkey"
            columns: ["etape_id"]
            isOneToOne: false
            referencedRelation: "etapes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reponses_groupe_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reponses_groupe_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reponses_groupe_rouverte_par_fkey"
            columns: ["rouverte_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reponses_groupe_valide_par_fkey"
            columns: ["valide_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions_cours: {
        Row: {
          chapitres_traites: string | null
          date_session: string
          heure_debut: string | null
          heure_fin: string | null
          id: string
          modules_dispenses: string[] | null
          objectifs_seance: string | null
          observations: string | null
          ouverte_le: string | null
          parcours_id: string | null
          professeur_id: string | null
          realise: string | null
          statut: string | null
          terminee_le: string | null
        }
        Insert: {
          chapitres_traites?: string | null
          date_session: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          modules_dispenses?: string[] | null
          objectifs_seance?: string | null
          observations?: string | null
          ouverte_le?: string | null
          parcours_id?: string | null
          professeur_id?: string | null
          realise?: string | null
          statut?: string | null
          terminee_le?: string | null
        }
        Update: {
          chapitres_traites?: string | null
          date_session?: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          modules_dispenses?: string[] | null
          objectifs_seance?: string | null
          observations?: string | null
          ouverte_le?: string | null
          parcours_id?: string | null
          professeur_id?: string | null
          realise?: string | null
          statut?: string | null
          terminee_le?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_cours_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_cours_professeur_id_fkey"
            columns: ["professeur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suivi_contenu: {
        Row: {
          complete: boolean | null
          contenu_id: string | null
          duree_totale_secondes: number | null
          etudiant_id: string | null
          id: string
          module_id: string | null
          parcours_id: string | null
          pourcentage_scroll: number | null
          temps_ecoute_secondes: number | null
          updated_at: string | null
        }
        Insert: {
          complete?: boolean | null
          contenu_id?: string | null
          duree_totale_secondes?: number | null
          etudiant_id?: string | null
          id?: string
          module_id?: string | null
          parcours_id?: string | null
          pourcentage_scroll?: number | null
          temps_ecoute_secondes?: number | null
          updated_at?: string | null
        }
        Update: {
          complete?: boolean | null
          contenu_id?: string | null
          duree_totale_secondes?: number | null
          etudiant_id?: string | null
          id?: string
          module_id?: string | null
          parcours_id?: string | null
          pourcentage_scroll?: number | null
          temps_ecoute_secondes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suivi_contenu_contenu_id_fkey"
            columns: ["contenu_id"]
            isOneToOne: false
            referencedRelation: "contenus_module"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suivi_contenu_etudiant_id_fkey"
            columns: ["etudiant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suivi_contenu_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_cours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suivi_contenu_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_partenaire: {
        Args: { _partenaire_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { _target: string }; Returns: boolean }
      fn_check_badges: {
        Args: { p_etudiant_id: string; p_parcours_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_partenaire_of_mission: {
        Args: { _mission_id: string }
        Returns: boolean
      }
      is_prof_of_mission: { Args: { _mission_id: string }; Returns: boolean }
      is_prof_of_parcours: { Args: { _parcours_id: string }; Returns: boolean }
      is_student_of_mission: { Args: { _mission_id: string }; Returns: boolean }
      is_student_of_parcours: {
        Args: { _parcours_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "professeur" | "etudiant" | "partenaire"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "professeur", "etudiant", "partenaire"],
    },
  },
} as const
