import { DollarSign, Home, Briefcase, GraduationCap, Heart, Globe, Sparkles } from 'lucide-react';
import React from 'react';

export interface DreamCategoryDef {
  id: string;
  displayName: string;
  icon: React.ElementType;
  description: string;
}

export const DREAM_CATEGORIES: DreamCategoryDef[] = [
  {
    id: "financial",
    displayName: "Financial",
    icon: DollarSign,
    description: "Financial goals, savings, investments, and wealth building."
  },
  {
    id: "lifestyle",
    displayName: "Lifestyle",
    icon: Home,
    description: "Living arrangements, health, daily routines, and material aspirations."
  },
  {
    id: "career",
    displayName: "Career",
    icon: Briefcase,
    description: "Professional milestones, businesses, and work aspirations."
  },
  {
    id: "education",
    displayName: "Education",
    icon: GraduationCap,
    description: "Degrees, continuous learning, and intellectual pursuits."
  },
  {
    id: "personal",
    displayName: "Personal",
    icon: Heart,
    description: "Relationships, self-improvement, and personal growth."
  },
  {
    id: "experiences",
    displayName: "Experiences",
    icon: Globe,
    description: "Travel, adventures, events, and unique life experiences."
  },
  {
    id: "other",
    displayName: "Other",
    icon: Sparkles,
    description: "Everything else you dream of achieving."
  }
];
