import React, { ReactNode, useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import ApartmentSwitcher from "@/components/resident/ApartmentSwitcher";
import {
  Building2,
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Shield,
  MessageCircle,
  Bell,
  BarChart3,
  Home,
  User,
  Scale,
  Receipt,
  ChevronRight,
  ChevronDown,
  Clock,
  PartyPopper,
  Mail,
  Package,
  PackageCheck,
  PackagePlus,
  DoorOpen,
  Wrench,
  Wallet,
  ClipboardList,
  ClipboardCheck,
  Cog,
  AlertTriangle,
  Megaphone,
  Search,
  Menu,
  ListChecks,
  CalendarDays,
  BookOpen,
  Trash2,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import logoIconAsset from "@/assets/logo-icon-v2.png.asset.json";
const logoIcon = logoIconAsset.url;
import logoDarkAsset from "@/assets/logo-branco-v2.png.asset.json";
const logoWhite = logoDarkAsset.url;
import logoLight from "@/assets/logo-preto.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

type NavStructure = (NavItem | NavGroup)[];

const isNavGroup = (item: NavItem | NavGroup): item is NavGroup => {
  return 'items' in item;
};

function ThemeLogo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <img
        src={logoWhite}
        alt="NotificaCondo"
        className="object-contain transition-all duration-200 w-full h-auto max-h-28"
      />
    );
  }

  const isLight = resolvedTheme === "light";

  return (
    <>
      <img
        src={logoLight}
        alt="NotificaCondo"
        className={cn(
          "object-contain transition-all duration-200 w-full h-auto max-h-28",
          isLight ? "block" : "hidden"
        )}
      />
      <img
        src={logoWhite}
        alt="NotificaCondo"
        className={cn(
          "object-contain transition-all duration-200 w-full h-auto max-h-28",
          isLight ? "hidden" : "block"
        )}
      />
    </>
  );
}

function ThemeLogoCollapsed() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <img
        src={logoIcon}
        alt="NotificaCondo"
        className="object-contain transition-all duration-200 w-full h-14"
      />
    );
  }

  return (
    <img
      src={logoIcon}
      alt="NotificaCondo"
      className="object-contain transition-all duration-200 w-full h-14"
    />
  );
}

function HeaderMobileLogo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <img src={logoIcon} alt="Logo" className="w-8 h-8 object-contain" />;
  }

  return <img src={logoIcon} alt="Logo" className="w-8 h-8 object-contain" />;
}

const getBaseSuperAdminNavItems = (): NavStructure => [
  { title: "Início", url: "/superadmin", icon: Home },
  {
    title: "Gestão",
    icon: Users,
    items: [
      { title: "Síndicos", url: "/superadmin/sindicos", icon: Users },
      { title: "Condomínios", url: "/superadmin/condominiums", icon: Building2 },
      { title: "Transferências", url: "/superadmin/transfers", icon: Scale },
    ],
  },
  {
    title: "Assinaturas",
    icon: CreditCard,
    items: [
      { title: "Assinantes", url: "/superadmin/subscriptions", icon: Users },
      { title: "Faturas", url: "/superadmin/invoices", icon: Receipt },
    ],
  },
  {
    title: "WhatsApp",
    icon: MessageCircle,
    items: [
      { title: "Templates", url: "/superadmin/whatsapp", icon: BarChart3 },
      { title: "BSUIDs", url: "/superadmin/bsuid-migration", icon: Users },
      { title: "Configurações", url: "/superadmin/whatsapp/config", icon: Cog },
    ],
  },
  { title: "Mensagens", url: "/superadmin/contact-messages", icon: Mail },
  {
    title: "Configurações",
    icon: Settings,
    items: [
      { title: "Geral", url: "/superadmin/settings", icon: Cog },
      { title: "SMTP / E-mail", url: "/superadmin/smtp", icon: Mail },
      { title: "Template PDF Ocorrência", url: "/superadmin/pdf-template", icon: FileText },
      { title: "Tipos de Encomenda", url: "/superadmin/package-types", icon: Package },
      { title: "Logs", url: "/superadmin/logs", icon: FileText },
      { title: "Cron Jobs", url: "/superadmin/cron-jobs", icon: Clock },
    ],
  },
];

const residentNavItems: NavStructure = [
  { title: "Início", url: "/resident", icon: Home },
  { title: "Minhas Ocorrências", url: "/resident/occurrences", icon: FileText },
  { title: "Minhas Encomendas", url: "/resident/packages", icon: Package },
  { title: "Meu Perfil", url: "/resident/profile", icon: User },
];

const getPorteiroNavItems = (pendingPackages: number, openPorterOccs: number): NavStructure => [
  { title: "Início", url: "/porteiro", icon: Home },
  { title: "Condomínio", url: "/porteiro/condominio", icon: Building2 },
  {
    title: "Encomendas",
    icon: Package,
    items: [
      { title: "Registrar Encomenda", url: "/porteiro/registrar", icon: PackagePlus },
      { title: "Retirar Encomenda", url: "/porteiro/encomendas", icon: PackageCheck, badge: pendingPackages },
      { title: "Histórico", url: "/porteiro/historico", icon: FileText },
    ],
  },
  { title: "Passagem de Plantão", url: "/porteiro/portaria/plantao", icon: ClipboardCheck },
  { title: "Livro de Ocorrências", url: "/porteiro/portaria/ocorrencias", icon: AlertTriangle, badge: openPorterOccs },
  { title: "Configurações", url: "/porteiro/configuracoes", icon: Settings },
];

const getZeladorNavItems = (): NavStructure => [
  { title: "Início", url: "/zelador", icon: Home },
  { title: "Manutenções", url: "/zelador/manutencoes", icon: ClipboardCheck },
  { title: "Configurações", url: "/zelador/configuracoes", icon: Settings },
];

function SidebarNavigation() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = isMobile ? false : state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { role, residentInfo, profileInfo, loading, porteiroCondominiums } = useUserRole();
  const { toast } = useToast();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const prevPendingDefensesRef = useRef<number>(0);
  const prevUnreadMessagesRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sindico condominium IDs (cached via React Query)
  const { data: condoIds = [] } = useQuery({
    queryKey: ["sindico-condo-ids", user?.id],
    queryFn: async () => {
      const { data: condos } = await supabase
        .from("condominiums")
        .select("id")
        .eq("owner_id", user!.id);
      return condos?.map((c) => c.id) || [];
    },
    enabled: !!user && role === "sindico",
    staleTime: 1000 * 60 * 5,
  });

  // Porteiro condominium IDs from context
  const porteiroCondoIds = porteiroCondominiums.map(c => c.id);

  // Badge: pending defenses for sindico
  const { data: pendingDefenses = 0 } = useQuery({
    queryKey: ["badge-pending-defenses", condoIds],
    queryFn: async () => {
      if (condoIds.length === 0) return 0;
      const { count } = await supabase
        .from("occurrences")
        .select("*", { count: "exact", head: true })
        .in("condominium_id", condoIds)
        .eq("status", "em_defesa");
      return count || 0;
    },
    enabled: !!user && role === "sindico" && condoIds.length > 0,
    staleTime: 1000 * 60,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  // Badge: open occurrences for sindico
  const { data: openOccurrences = 0 } = useQuery({
    queryKey: ["badge-open-occurrences", condoIds],
    queryFn: async () => {
      if (condoIds.length === 0) return 0;
      const { count } = await supabase
        .from("occurrences")
        .select("*", { count: "exact", head: true })
        .in("condominium_id", condoIds)
        .in("status", ["registrada", "notificado"]);
      return count || 0;
    },
    enabled: !!user && role === "sindico" && condoIds.length > 0,
    staleTime: 1000 * 60,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  // Badge: open porter occurrences for sindico
  const { data: openPorterOccurrences = 0 } = useQuery({
    queryKey: ["badge-porter-occurrences-sindico", condoIds],
    queryFn: async () => {
      if (condoIds.length === 0) return 0;
      const { count } = await supabase
        .from("porter_occurrences")
        .select("*", { count: "exact", head: true })
        .in("condominium_id", condoIds)
        .eq("status", "aberta");
      return count || 0;
    },
    enabled: !!user && role === "sindico" && condoIds.length > 0,
    staleTime: 1000 * 60,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  // Badge: pending package deletion requests for sindico
  const { data: pendingDeletions = 0 } = useQuery({
    queryKey: ["badge-package-deletions-sindico", condoIds],
    queryFn: async () => {
      if (condoIds.length === 0) return 0;
      const { count } = await (supabase as any)
        .from("package_deletion_requests")
        .select("*", { count: "exact", head: true })
        .in("condominium_id", condoIds)
        .eq("status", "pendente");
      return count || 0;
    },
    enabled: !!user && role === "sindico" && condoIds.length > 0,
    staleTime: 1000 * 60,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  // Badge: pending packages for porteiro
  const { data: pendingPackages = 0 } = useQuery({
    queryKey: ["badge-pending-packages", porteiroCondoIds],
    queryFn: async () => {
      if (porteiroCondoIds.length === 0) return 0;
      const { count } = await supabase
        .from("packages")
        .select("*", { count: "exact", head: true })
        .in("condominium_id", porteiroCondoIds)
        .eq("status", "pendente");
      return count || 0;
    },
    enabled: !!user && role === "porteiro" && porteiroCondoIds.length > 0,
    staleTime: 1000 * 60,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  // Badge: open porter occurrences for porteiro
  const { data: openPorterOccurrencesPorteiro = 0 } = useQuery({
    queryKey: ["badge-porter-occurrences-porteiro", porteiroCondoIds],
    queryFn: async () => {
      if (porteiroCondoIds.length === 0) return 0;
      const { count } = await supabase
        .from("porter_occurrences")
        .select("*", { count: "exact", head: true })
        .in("condominium_id", porteiroCondoIds)
        .eq("status", "aberta");
      return count || 0;
    },
    enabled: !!user && role === "porteiro" && porteiroCondoIds.length > 0,
    staleTime: 1000 * 60,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  // Badge: unread messages for super_admin
  const { data: unreadMessagesQuery = 0 } = useQuery({
    queryKey: ["badge-unread-messages"],
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user && role === "super_admin",
    staleTime: 1000 * 60,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  // Sync query result to state for realtime updates
  useEffect(() => {
    setUnreadMessages(unreadMessagesQuery);
  }, [unreadMessagesQuery]);

  // Som para defesas pendentes (tom ascendente - urgência)
  const playDefenseNotificationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
      
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (error) {
      console.error("Error playing defense notification sound:", error);
    }
  }, []);

  // Som para mensagens de contato (tom duplo suave - atenção gentil)
  const playMessageNotificationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc1.type = "sine";
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.18);
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc2.start(ctx.currentTime + 0.18);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (error) {
      console.error("Error playing message notification sound:", error);
    }
  }, []);

  // Keep ONLY the realtime subscription for contact messages (super_admin) for sound alerts
  useEffect(() => {
    if (!user || role !== "super_admin") return;

    const channel = supabase
      .channel("contact-messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contact_messages",
        },
        async (payload) => {
          const newMessage = payload.new as { name?: string; subject?: string };
          
          playMessageNotificationSound();
          
          toast({
            title: "📬 Nova mensagem de contato",
            description: newMessage.name 
              ? `${newMessage.name}: ${newMessage.subject || "Sem assunto"}`
              : "Uma nova mensagem foi recebida",
            action: (
              <button
                onClick={() => navigate("/superadmin/contact-messages")}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Ver
              </button>
            ),
          });

          const { count } = await supabase
            .from("contact_messages")
            .select("*", { count: "exact", head: true })
            .eq("is_read", false);

          setUnreadMessages(count || 0);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contact_messages",
        },
        async () => {
          const { count } = await supabase
            .from("contact_messages")
            .select("*", { count: "exact", head: true })
            .eq("is_read", false);

          setUnreadMessages(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role, playMessageNotificationSound, toast, navigate]);

  useEffect(() => {
    prevPendingDefensesRef.current = pendingDefenses;
  }, [pendingDefenses]);

  useEffect(() => {
    prevUnreadMessagesRef.current = unreadMessages;
  }, [unreadMessages]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getSuperAdminNavItems = (): NavStructure => {
    // Deep clone while preserving icon references
    const items: NavStructure = getBaseSuperAdminNavItems().map(item => {
      if (isNavGroup(item)) {
        return {
          ...item,
          items: item.items.map(subItem => ({ ...subItem }))
        };
      }
      // Add badge to Mensagens item if there are unread messages
      if (!isNavGroup(item) && item.url === "/superadmin/contact-messages" && unreadMessages > 0) {
        return { ...item, badge: unreadMessages };
      }
      return { ...item };
    });
    
    return items;
  };

  const getSindicoNavItems = (): NavStructure => [
    { title: "Início", url: "/dashboard", icon: Home },
    {
      title: "Gestão",
      icon: Building2,
      items: [
        { title: "Condomínios", url: "/condominiums", icon: Building2 },
        { title: "Assinaturas", url: "/sindico/subscriptions", icon: CreditCard },
        { title: "Faturas", url: "/sindico/invoices", icon: Receipt },
      ],
    },
    {
      title: "Serviços",
      icon: Package,
      items: [
        { title: "Encomendas", url: "/sindico/encomendas", icon: Package },
        { title: "Exclusões", url: "/sindico/exclusoes", icon: Trash2, badge: pendingDeletions },
        { title: "Advertências e Multas", url: "/occurrences", icon: FileText },
        { title: "Análise de Defesas", url: "/defenses", icon: Scale, badge: pendingDefenses },
        { title: "Livro de Ocorrências", url: "/sindico/portaria/ocorrencias", icon: AlertTriangle, badge: openPorterOccurrences },
        { title: "Espaços", url: "/party-hall", icon: PartyPopper },
      ],
    },
    {
      title: "Portaria",
      icon: DoorOpen,
      items: [
        { title: "Passagens de Plantão", url: "/sindico/portaria/plantoes", icon: ClipboardCheck },
        { title: "Livro de Recados", url: "/sindico/portaria/recados", icon: BookOpen },
        { title: "Checklist Portaria", url: "/sindico/portaria/checklist", icon: Cog },
        { title: "Banners Portaria", url: "/sindico/banners", icon: Megaphone },
      ],
    },
    {
      title: "Manutenção",
      icon: Wrench,
      items: [
        { title: "Dashboard", url: "/sindico/manutencoes", icon: LayoutDashboard },
        { title: "Calendário", url: "/sindico/manutencoes/calendario", icon: CalendarDays },
        { title: "Condomínios", url: "/sindico/manutencoes/condominios", icon: Building2 },
        { title: "Tarefas", url: "/sindico/manutencoes/tarefas", icon: ListChecks },
        { title: "Categorias", url: "/sindico/manutencoes/categorias", icon: ClipboardList },
        { title: "Histórico", url: "/sindico/manutencoes/historico", icon: Clock },
      ],
    },
    {
      title: "Usuários",
      icon: Users,
      items: [
        { title: "Porteiros", url: "/sindico/porteiros", icon: DoorOpen },
        { title: "Zeladores", url: "/sindico/zeladores", icon: Wrench },
      ],
    },
    
    { title: "Notificações", url: "/notifications", icon: Bell },
    { title: "Relatórios", url: "/reports", icon: BarChart3 },
    { title: "Configurações", url: "/sindico/settings", icon: Settings },
  ];

  const navItems: NavStructure =
    role === "super_admin"
      ? getSuperAdminNavItems()
      : role === "sindico"
      ? getSindicoNavItems()
      : role === "porteiro"
      ? getPorteiroNavItems(pendingPackages, openPorterOccurrencesPorteiro)
      : role === "zelador"
      ? getZeladorNavItems()
      : residentNavItems;

  const getRoleConfig = () => {
    switch (role) {
      case "super_admin":
        return {
          title: "NOTIFICACONDO",
          subtitle: "Super Admin",
          icon: Shield,
        };
      case "sindico":
        return {
          title: "NOTIFICACONDO",
          subtitle: "Gestão Condominial",
          icon: Building2,
        };
      case "porteiro":
        return {
          title: "NOTIFICACONDO",
          subtitle: "Portaria",
          icon: DoorOpen,
        };
      case "zelador":
        return {
          title: "NOTIFICACONDO",
          subtitle: "Manutenção",
          icon: Wrench,
        };
      default:
        return {
          title: "NOTIFICACONDO",
          subtitle: "Área do Morador",
          icon: Home,
        };
    }
  };

  const config = getRoleConfig();
  const Icon = config.icon;

  const getUserInitials = () => {
    if (residentInfo?.full_name) {
      return residentInfo.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    if (profileInfo?.full_name) {
      return profileInfo.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() || "U";
  };

  const getUserName = () => {
    if (residentInfo?.full_name) {
      return residentInfo.full_name.split(" ")[0].toUpperCase();
    }
    if (profileInfo?.full_name) {
      return profileInfo.full_name.split(" ")[0].toUpperCase();
    }
    return user?.email?.split("@")[0]?.toUpperCase() || "USUÁRIO";
  };

  const getRoleLabel = () => {
    switch (role) {
      case "super_admin":
        return "Administrador";
      case "sindico":
        return "Síndico";
      case "porteiro":
        return "Porteiro";
      case "zelador":
        return "Zelador";
      default:
        return "Morador";
    }
  };

  return (
    <Sidebar
      className={cn(
        "border-r-0 transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
      collapsible="icon"
      variant="sidebar"
    >
      {/* Header with Logo */}
      <SidebarHeader className="p-4 pb-6">
        <div className="flex items-center justify-center w-full">
          {collapsed ? (
            <ThemeLogoCollapsed />
          ) : (
            <ThemeLogo />
          )}
        </div>
      </SidebarHeader>

      {/* Apartment Switcher for Residents */}
      {role === "morador" && !collapsed && <ApartmentSwitcher />}

      {/* Navigation */}
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                if (isNavGroup(item)) {
                  // Check if any child is active
                  const hasActiveChild = item.items.some(child => location.pathname === child.url);
                  const groupBadgeCount = item.items.reduce((acc, child) => acc + (child.badge || 0), 0);
                  
                  return (
                    <React.Fragment key={item.title}>
                      {collapsed ? (
                        <SidebarMenuItem className="relative group/hover-menu">
                          <SidebarMenuButton
                            tooltip={item.title}
                            className={cn(
                              "w-full h-11 rounded-full transition-all duration-300 ease-out",
                              hasActiveChild
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary hover:scale-[1.01]"
                            )}
                          >
                            <div className="flex w-full items-center py-2.5 justify-center px-0 gap-0">
                              <item.icon className="w-5 h-5 shrink-0 mx-auto" />
                            </div>
                          </SidebarMenuButton>
                          <div className="invisible opacity-0 scale-95 origin-left group-hover/hover-menu:visible group-hover/hover-menu:opacity-100 group-hover/hover-menu:scale-100 group-hover/hover-menu:translate-x-0 transition-[opacity,transform,visibility] duration-250 ease-out absolute left-full top-0 ml-3 z-50 min-w-52 rounded-xl border border-border/60 bg-card p-1.5 shadow-elevated backdrop-blur-sm translate-x-2">
                            <p className="px-3 pt-2 pb-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{item.title}</p>
                            <div className="h-px bg-border/50 mx-2 mb-1" />
                            {item.items.map((subItem) => {
                              const isSubActive = location.pathname === subItem.url;
                              return (
                                <NavLink
                                  key={subItem.title}
                                  to={subItem.url}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                                    isSubActive
                                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                      : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                                  )}
                                  activeClassName=""
                                  onClick={() => isMobile && setOpenMobile(false)}
                                >
                                  <subItem.icon className={cn("w-4 h-4 shrink-0", isSubActive ? "text-primary-foreground" : "text-muted-foreground")} />
                                  <span className="font-medium">{subItem.title}</span>
                                  {subItem.badge !== undefined && subItem.badge > 0 && (
                                    <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold ml-auto animate-pulse-slow">
                                      {subItem.badge > 99 ? "99+" : subItem.badge}
                                    </span>
                                  )}
                                </NavLink>
                              );
                            })}
                          </div>
                        </SidebarMenuItem>
                      ) : (
                        <Collapsible defaultOpen={hasActiveChild} className="group/collapsible">
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                className={cn(
                                  "w-full h-11 rounded-full transition-all duration-300 ease-out",
                                  hasActiveChild
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary hover:scale-[1.01]"
                                )}
                              >
                                <div className="flex w-full items-center py-2.5 gap-3 px-3">
                                  <item.icon className="w-5 h-5 shrink-0" />
                                  <span className="font-medium flex-1 text-sm">{item.title}</span>
                                  {groupBadgeCount > 0 && (
                                    <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold mr-1">
                                      {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                                    </span>
                                  )}
                                  <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                </div>
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-1 space-y-1">
                              {item.items.map((subItem) => {
                                const isSubActive = location.pathname === subItem.url;
                                return (
                                  <SidebarMenuButton
                                    key={subItem.title}
                                    asChild
                                    isActive={isSubActive}
                                    className={cn(
                                      "w-full h-10 rounded-full transition-all duration-300 ease-out ml-4",
                                      isSubActive
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                    )}
                                  >
                                    <NavLink
                                      to={subItem.url}
                                      className="flex w-full items-center gap-3 px-3 py-2"
                                      activeClassName=""
                                      onClick={() => isMobile && setOpenMobile(false)}
                                    >
                                      <subItem.icon className="w-4 h-4 shrink-0" />
                                      <span className="font-medium flex-1 text-sm">{subItem.title}</span>
                                      {subItem.badge !== undefined && subItem.badge > 0 && (
                                        <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                                          {subItem.badge > 99 ? "99+" : subItem.badge}
                                        </span>
                                      )}
                                      {isSubActive && (
                                        <ChevronRight className="w-4 h-4 text-sidebar-primary" />
                                      )}
                                    </NavLink>
                                  </SidebarMenuButton>
                                );
                              })}
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      )}
                    </React.Fragment>
                  );
                }
                
                // Regular nav item
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={collapsed ? item.title : undefined}
                      className={cn(
                        "w-full h-11 rounded-full transition-all duration-300 ease-out",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary hover:scale-[1.01]"
                      )}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/superadmin" || item.url === "/dashboard" || item.url === "/resident"}
                        className={cn(
                          "flex w-full items-center py-2.5",
                          collapsed
                            ? "justify-center px-0 gap-0"
                            : "gap-3 px-3"
                        )}
                        activeClassName=""
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <item.icon className={cn("w-5 h-5 shrink-0", collapsed && "mx-auto")} />
                        {!collapsed && (
                          <>
                            <span className="font-medium flex-1 text-sm">{item.title}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                                {item.badge > 99 ? "99+" : item.badge}
                              </span>
                            )}
                            {isActive && (
                              <ChevronRight className="w-4 h-4 text-sidebar-primary" />
                            )}
                          </>
                        )}
                        {collapsed && item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <SidebarMenuButton
                  tooltip="Sair"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você será desconectado da sua conta e precisará fazer login novamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSignOut}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>



    </Sidebar>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { profileInfo, role, porteiroCondominiums } = useUserRole();
  const navigate = useNavigate();
  const savedState = localStorage.getItem("sidebar-open");
  const initialOpen = savedState !== null ? savedState === "true" : false;

  const [open, setOpen] = useState(initialOpen);

  const porteiroCondoIds = porteiroCondominiums.map((c) => c.id);

  const { data: pendingPackages = 0 } = useQuery({
    queryKey: ["header-pending-packages", porteiroCondoIds],
    queryFn: async () => {
      if (porteiroCondoIds.length === 0) return 0;
      const { count } = await supabase
        .from("packages")
        .select("*", { count: "exact", head: true })
        .in("condominium_id", porteiroCondoIds)
        .eq("status", "pendente");
      return count || 0;
    },
    enabled: !!user && role === "porteiro" && porteiroCondoIds.length > 0,
    staleTime: 1000 * 60,
    refetchInterval: 60000,
  });

  const { data: openPorterOccurrencesPorteiro = 0 } = useQuery({
    queryKey: ["header-porter-occurrences-porteiro", porteiroCondoIds],
    queryFn: async () => {
      if (porteiroCondoIds.length === 0) return 0;
      const { count } = await supabase
        .from("porter_occurrences")
        .select("*", { count: "exact", head: true })
        .in("condominium_id", porteiroCondoIds)
        .eq("status", "aberta");
      return count || 0;
    },
    enabled: !!user && role === "porteiro" && porteiroCondoIds.length > 0,
    staleTime: 1000 * 60,
    refetchInterval: 60000,
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    localStorage.setItem("sidebar-open", String(newOpen));
  };

  const [signOutOpen, setSignOutOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };


  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <div className="min-h-screen flex w-full bg-background font-body overflow-hidden">
        <SidebarNavigation />
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden w-full min-w-0">
          <header className="sticky top-0 z-40 h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hidden md:flex text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-lg transition-colors" />
              <MobileSidebarTrigger className="md:hidden" />
              <div className="flex items-center gap-2 md:hidden">
                <HeaderMobileLogo />
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center gap-1">
                {role === "porteiro" ? (
                  (() => {
                    const totalPorteiroNotif = (pendingPackages || 0) + (openPorterOccurrencesPorteiro || 0);
                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground relative rounded-full"
                            aria-label="Notificações"
                          >
                            <Bell className="w-5 h-5" />
                            {totalPorteiroNotif > 0 && (
                              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-card" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72 mt-2 rounded-xl border-border shadow-elevated">
                          <DropdownMenuLabel className="font-display font-semibold flex items-center justify-between">
                            Notificações
                            <span className="text-xs text-muted-foreground font-normal">{totalPorteiroNotif} pendente(s)</span>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => navigate("/porteiro/encomendas")}
                            className="gap-3 cursor-pointer py-2 rounded-lg m-1"
                          >
                            <PackageCheck className="w-4 h-4 text-primary" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">Encomendas pendentes</div>
                              <div className="text-xs text-muted-foreground">
                                {pendingPackages > 0 ? `${pendingPackages} aguardando retirada` : "Nenhuma pendente"}
                              </div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate("/porteiro/portaria/ocorrencias")}
                            className="gap-3 cursor-pointer py-2 rounded-lg m-1"
                          >
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">Ocorrências abertas</div>
                              <div className="text-xs text-muted-foreground">
                                {openPorterOccurrencesPorteiro > 0 ? `${openPorterOccurrencesPorteiro} em aberto` : "Nenhuma aberta"}
                              </div>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })()
                ) : (
                  <Button variant="ghost" size="icon" className="text-muted-foreground relative rounded-full" aria-label="Notificações">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-card" />
                  </Button>
                )}
                <ThemeToggle />
              </div>
              
              <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 p-1 pl-2 hover:bg-muted rounded-full transition-colors">
                    <div className="hidden sm:flex flex-col items-end mr-1">
                      <span className="text-sm font-semibold text-foreground leading-none">{profileInfo?.full_name?.split(" ")[0] || "Usuário"}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                        {role === "super_admin" ? "Super Admin" : role === "sindico" ? "Síndico" : role === "porteiro" ? "Porteiro" : role === "zelador" ? "Zelador" : role === "morador" ? "Morador" : "Usuário"}
                      </span>
                    </div>
                    <Avatar className="h-8 w-8 border border-border shadow-sm">
                      <AvatarImage src={profileInfo?.avatar_url || ""} alt={profileInfo?.full_name || "Usuário"} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {profileInfo?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl border-border shadow-elevated">
                  <DropdownMenuLabel className="font-display font-semibold">Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(role === "morador" ? "/resident/profile" : role === "porteiro" ? "/porteiro/configuracoes" : "/sindico/settings")} className="gap-2 cursor-pointer py-2 rounded-lg m-1">
                    <User className="w-4 h-4" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSignOutOpen(true); }} className="gap-2 cursor-pointer text-destructive focus:text-destructive py-2 rounded-lg m-1">
                    <LogOut className="w-4 h-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você será desconectado da sua conta e precisará fazer login novamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sair
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-8 w-full">
            <div className="max-w-[1600px] mx-auto w-full">{children}</div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function MobileSidebarTrigger({ className }: { className?: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-10 w-10 text-muted-foreground hover:text-foreground", className)}
      onClick={() => setOpenMobile(true)}
    >
      <Menu className="h-6 w-6" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
