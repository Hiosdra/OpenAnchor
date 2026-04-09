import React from 'react';
import {
  Users,
  Clock,
  Settings,
  Printer,
  Download,
  Plus,
  Trash2,
  Anchor,
  RefreshCw,
  Share2,
  CalendarDays,
  Navigation,
  CheckCircle,
  XCircle,
  ArrowRight,
  Moon,
  Sun,
  Bell,
  Shield,
  ChefHat,
  User,
  BookOpen,
  QrCode,
  Upload,
  Save,
  Undo,
  Redo,
  HelpCircle,
  Globe,
  BarChart3,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Users,
  Clock,
  Settings,
  Printer,
  Download,
  Plus,
  Trash2,
  Anchor,
  RefreshCw,
  Share2,
  CalendarDays,
  Navigation,
  CheckCircle,
  XCircle,
  ArrowRight,
  Moon,
  Sun,
  Bell,
  Shield,
  ChefHat,
  User,
  BookOpen,
  QrCode,
  Upload,
  Save,
  Undo,
  Redo,
  HelpCircle,
  Globe,
  BarChart3,
  TrendingUp,
  ChevronDown,
};

interface IconProps extends LucideProps {
  name: string;
}

export const Icon: React.FC<IconProps> = ({ name, ...props }) => {
  const C = iconMap[name];
  return C ? <C {...props} /> : null;
};
