import { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDateFormatter } from "@/hooks/useFormattedDate";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  PackageCheck,
  Clock,
  Building2,
  FileText,
  Download,
  Timer,
  Layers,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  MessageSquare,
  User,
  Hash,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Filter,
  Home,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";
import { DeliveryStatusTracker } from "@/components/packages/DeliveryStatusTracker";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import BlockApartmentDisplay from "@/components/common/BlockApartmentDisplay";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { QuickBlockApartmentSearch } from "@/components/packages/QuickBlockApartmentSearch";
import { getSignedPackagePhotoUrl } from "@/lib/packageStorage";

interface ApartmentResident {
  id: string;
  full_name: string;
  phone: string | null;
  is_responsible: boolean;
}

interface PackageWithRelations {
  id: string;
  status: "pendente" | "retirada";
  received_at: string;
  received_by: string;
  picked_up_at: string | null;
  picked_up_by: string | null;
  picked_up_by_name: string | null;
  pickup_code: string;
  photo_url: string;
  description: string | null;
  tracking_code: string | null;
  notification_sent: boolean | null;
  notification_sent_at: string | null;
  notification_count: number | null;
  block: { id: string; name: string } | null;
  apartment: { id: string; number: string; residents: ApartmentResident[] } | null;
  condominium: { id: string; name: string } | null;
  resident: { id: string; full_name: string; phone: string | null } | null;
  package_type: { id: string; name: string; icon: string | null } | null;
  received_by_name?: string | null;
  received_by_profile: { full_name: string } | null;
  picked_up_by_profile: { full_name: string } | null;
}

interface Block {
  id: string;
  name: string;
  condominium_id: string;
}

interface Condominium {
  id: string;
  name: string;
  address: string | null;
}

const STATUS_CONFIG = {
  pendente: {
    label: "Pendente",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    pdfColor: [245, 158, 11] as [number, number, number],
  },
  retirada: {
    label: "Retirada",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    pdfColor: [16, 185, 129] as [number, number, number],
  },
};

const PorteiroPackagesHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { dateTime: formatDateTime, date: formatDate } = useDateFormatter();

  const [condominiumIds, setCondominiumIds] = useState<string[]>([]);
  const [selectedCondominium, setSelectedCondominium] = useState<string>("");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [selectedApartment, setSelectedApartment] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  /** Campo de data usado no filtro: cadastro (received_at) ou retirada (picked_up_at) */
  const [dateField, setDateField] = useState<"received_at" | "picked_up_at">("received_at");
  const [trackingCodeSearch, setTrackingCodeSearch] = useState<string>("");
  // O índice trigram do banco permite pesquisar códigos curtos sem bloquear a tela.
  const [trackingFilter, setTrackingFilter] = useState<string>("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setTrackingFilter(trackingCodeSearch.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [trackingCodeSearch]);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPendingSummaryModal, setShowPendingSummaryModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageWithRelations | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [isResendingNotification, setIsResendingNotification] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const pageSize = 20;
  const selectedPackageStatus = (selectedPackage?.status ?? "").toString().trim().toLowerCase();
  const canResendSelectedPackageNotification = selectedPackageStatus === "pendente";

  // Fetch porter's condominiums
  useEffect(() => {
    const fetchCondominiums = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("user_condominiums")
        .select("condominium_id")
        .eq("user_id", user.id);

      if (data) {
        const ids = data.map((uc) => uc.condominium_id);
        setCondominiumIds(ids);
        // Auto-select if only one condominium
        if (ids.length === 1) {
          setSelectedCondominium(ids[0]);
        }
      }
    };

    fetchCondominiums();
  }, [user]);

  // Fetch condominiums details
  const { data: condominiums = [] } = useQuery({
    queryKey: ["porteiro-condominiums", condominiumIds],
    queryFn: async () => {
      if (condominiumIds.length === 0) return [];
      const { data, error } = await supabase
        .from("condominiums")
        .select("id, name, address")
        .in("id", condominiumIds)
        .order("name");
      if (error) throw error;
      return data as Condominium[];
    },
    enabled: condominiumIds.length > 0,
  });

  // Fetch blocks for selected condominium
  const { data: blocks = [] } = useQuery({
    queryKey: ["blocks", selectedCondominium],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocks")
        .select("id, name, condominium_id")
        .eq("condominium_id", selectedCondominium);
      if (error) throw error;
      return (data as Block[]).sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" })
      );
    },
    enabled: !!selectedCondominium,
  });

  // Fetch apartments for selected block
  const { data: apartments = [] } = useQuery({
    queryKey: ["apartments", selectedBlock],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apartments")
        .select("id, number")
        .eq("block_id", selectedBlock);
      if (error) throw error;
      return (data || []).sort((a, b) =>
        a.number.localeCompare(b.number, "pt-BR", { numeric: true, sensitivity: "base" })
      );
    },
    enabled: selectedBlock !== "all",
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCondominium, selectedBlock, selectedApartment, statusFilter, dateFrom, dateTo, dateField, trackingFilter]);

  // Fetch signed URL when package details modal opens
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (showDetailsModal && selectedPackage?.photo_url) {
        setIsLoadingPhoto(true);
        setSignedPhotoUrl(null);
        
        const signedUrl = await getSignedPackagePhotoUrl(selectedPackage.photo_url);
        setSignedPhotoUrl(signedUrl);
        setIsLoadingPhoto(false);
      } else {
        setSignedPhotoUrl(null);
      }
    };

    fetchSignedUrl();
  }, [showDetailsModal, selectedPackage?.photo_url]);

  // Fetch notification logs when details modal opens
  useEffect(() => {
    const fetchLogs = async () => {
      if (!showDetailsModal || !selectedPackage?.id) {
        setNotificationLogs([]);
        return;
      }
      setIsLoadingLogs(true);
      const { data, error } = await supabase
        .from("whatsapp_notification_logs")
        .select("*")
        .eq("package_id", selectedPackage.id)
        .order("created_at", { ascending: false });
      if (!error) setNotificationLogs(data || []);
      setIsLoadingLogs(false);
    };
    fetchLogs();
  }, [showDetailsModal, selectedPackage?.id]);

  const refetchNotificationLogs = async () => {
    if (!selectedPackage?.id) return;
    const { data, error } = await supabase
      .from("whatsapp_notification_logs")
      .select("*")
      .eq("package_id", selectedPackage.id)
      .order("created_at", { ascending: false });
    if (!error) setNotificationLogs(data || []);
  };

  const handleResendNotification = async () => {
    if (!selectedPackage) return;
    if (!canResendSelectedPackageNotification) return;
    setIsResendingNotification(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-package-arrival", {
        body: {
          package_id: selectedPackage.id,
          apartment_id: selectedPackage.apartment?.id,
          pickup_code: selectedPackage.pickup_code,
          photo_url: selectedPackage.photo_url,
        },
      });
      if (error) throw error;
      const count = data?.notifications_sent ?? 0;
      toast({
        title: count > 0 ? "Notificação reenviada" : "Nenhuma notificação enviada",
        description:
          count > 0
            ? `Mensagem enviada para ${count} morador(es).`
            : "Verifique se há moradores com telefone cadastrado.",
        variant: count > 0 ? "default" : "destructive",
      });
      await refetchNotificationLogs();
    } catch (err) {
      console.error("Error resending notification:", err);
      toast({
        title: "Erro ao reenviar",
        description: "Não foi possível reenviar a notificação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsResendingNotification(false);
    }
  };



  // Fetch total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["porteiro-packages-count", selectedCondominium, selectedBlock, selectedApartment, statusFilter, dateFrom, dateTo, dateField, trackingFilter],
    queryFn: async () => {
      let query = supabase
        .from("packages")
        .select("id", { count: "exact", head: true })
        .eq("condominium_id", selectedCondominium);

      if (!trackingFilter && selectedBlock !== "all") {
        query = query.eq("block_id", selectedBlock);
      }

      if (!trackingFilter && selectedApartment !== "all") {
        query = query.eq("apartment_id", selectedApartment);
      }

      if (!trackingFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pendente" | "retirada");
      }

      if (!trackingFilter && dateFrom) {
        query = query.gte(dateField, dateFrom);
      }

      if (!trackingFilter && dateTo) {
        query = query.lte(dateField, `${dateTo}T23:59:59`);
      }

      if (trackingFilter) {
        query = query.eq("tracking_code", trackingFilter);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedCondominium,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch packages for selected condominium with pagination
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["porteiro-condominium-packages", selectedCondominium, selectedBlock, selectedApartment, statusFilter, dateFrom, dateTo, dateField, currentPage, trackingFilter],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("packages")
        .select(`
          id,
          status,
          received_at,
          received_by,
          received_by_name,
          picked_up_at,
          picked_up_by,
          picked_up_by_name,
          pickup_code,
          photo_url,
          description,
          tracking_code,
          notification_sent,
          notification_sent_at,
          notification_count,
          block:blocks(id, name),
          apartment:apartments(id, number, residents(id, full_name, phone, is_responsible)),
          condominium:condominiums(id, name),
          resident:residents(id, full_name, phone),
          package_type:package_types(id, name, icon)
        `)
        .eq("condominium_id", selectedCondominium)
        .order("received_at", { ascending: false })
        .range(from, to);

      if (!trackingFilter && selectedBlock !== "all") {
        query = query.eq("block_id", selectedBlock);
      }

      if (!trackingFilter && selectedApartment !== "all") {
        query = query.eq("apartment_id", selectedApartment);
      }

      if (!trackingFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pendente" | "retirada");
      }

      if (!trackingFilter && dateFrom) {
        query = query.gte(dateField, dateFrom);
      }

      if (!trackingFilter && dateTo) {
        query = query.lte(dateField, `${dateTo}T23:59:59`);
      }

      if (trackingFilter) {
        query = query.eq("tracking_code", trackingFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for received_by and picked_up_by
      const receivedByIds = [...new Set(data?.map((p) => p.received_by).filter(Boolean) || [])];
      const pickedUpByIds = [...new Set(data?.map((p) => p.picked_up_by).filter(Boolean) || [])];
      const allPorteiroIds = [...new Set([...receivedByIds, ...pickedUpByIds])];
      let profilesMap: Record<string, { full_name: string }> = {};

      if (allPorteiroIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", allPorteiroIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = { full_name: p.full_name };
            return acc;
          }, {} as Record<string, { full_name: string }>);
        }
      }

      return (data || []).map((pkg) => ({
        ...pkg,
        received_by_name: profilesMap[pkg.received_by]?.full_name || pkg.received_by_name || null,
        received_by_profile: profilesMap[pkg.received_by] || null,
        picked_up_by_profile: pkg.picked_up_by ? profilesMap[pkg.picked_up_by] || null : null,
      })) as PackageWithRelations[];
    },
    enabled: !!selectedCondominium,
  });

  // Fetch pending packages for summary modal
  const { data: pendingPackages = [] } = useQuery({
    queryKey: ["pending-packages-summary", selectedCondominium],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(`
          id,
          block:blocks(id, name),
          apartment:apartments(id, number)
        `)
        .eq("condominium_id", selectedCondominium)
        .eq("status", "pendente");

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCondominium && showPendingSummaryModal,
  });

  // Group pending packages by block/apartment
  const pendingSummary = useMemo(() => {
    const grouped: Record<string, { 
      blockName: string;
      apartmentNumber: string; 
      count: number;
    }> = {};
    
    pendingPackages.forEach(pkg => {
      const key = `${pkg.block?.id}-${pkg.apartment?.id}`;
      if (!grouped[key]) {
        grouped[key] = {
          blockName: pkg.block?.name || "-",
          apartmentNumber: pkg.apartment?.number || "-",
          count: 0
        };
      }
      grouped[key].count++;
    });
    
    return Object.values(grouped)
      .sort((a, b) => {
        const blockCompare = a.blockName.localeCompare(b.blockName, 'pt-BR', { numeric: true });
        if (blockCompare !== 0) return blockCompare;
        return a.apartmentNumber.localeCompare(b.apartmentNumber, 'pt-BR', { numeric: true });
      });
  }, [pendingPackages]);

  // Fetch stats using separate count queries to avoid 1000-row limit
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["porteiro-packages-stats", selectedCondominium, selectedBlock, selectedApartment, statusFilter, dateFrom, dateTo, dateField, trackingFilter],
    queryFn: async () => {
      const buildQuery = (extraStatus?: string) => {
        let query = supabase
          .from("packages")
          .select("id", { count: "exact", head: true })
          .eq("condominium_id", selectedCondominium);

        if (!trackingFilter && selectedBlock !== "all") query = query.eq("block_id", selectedBlock);
        if (!trackingFilter && selectedApartment !== "all") query = query.eq("apartment_id", selectedApartment);
        if (!trackingFilter && statusFilter !== "all") query = query.eq("status", statusFilter as any);
        if (!trackingFilter && dateFrom) query = query.gte(dateField, dateFrom);
        if (!trackingFilter && dateTo) query = query.lte(dateField, `${dateTo}T23:59:59`);
        if (trackingFilter) query = query.eq("tracking_code", trackingFilter);
        if (extraStatus) query = query.eq("status", extraStatus as any);
        return query;
      };

      const [totalRes, pendenteRes, retiradaRes] = await Promise.all([
        buildQuery(),
        buildQuery("pendente"),
        buildQuery("retirada"),
      ]);

      // Fetch picked up packages for avg time (limited to 200 for performance)
      let avgQuery = supabase
        .from("packages")
        .select("received_at, picked_up_at")
        .eq("condominium_id", selectedCondominium)
        .eq("status", "retirada")
        .not("picked_up_at", "is", null)
        .order("picked_up_at", { ascending: false })
        .limit(200);

      if (!trackingFilter && selectedBlock !== "all") avgQuery = avgQuery.eq("block_id", selectedBlock);
      if (!trackingFilter && selectedApartment !== "all") avgQuery = avgQuery.eq("apartment_id", selectedApartment);
      if (!trackingFilter && dateFrom) avgQuery = avgQuery.gte(dateField, dateFrom);
      if (!trackingFilter && dateTo) avgQuery = avgQuery.lte(dateField, `${dateTo}T23:59:59`);
      if (trackingFilter) avgQuery = avgQuery.eq("tracking_code", trackingFilter);

      const { data: pickedUpData } = await avgQuery;

      let avgPickupTime = 0;
      if (pickedUpData && pickedUpData.length > 0) {
        let totalMinutes = 0;
        pickedUpData.forEach((pkg) => {
          totalMinutes += differenceInMinutes(parseISO(pkg.picked_up_at!), parseISO(pkg.received_at));
        });
        avgPickupTime = Math.round(totalMinutes / pickedUpData.length);
      }

      return {
        total: totalRes.count || 0,
        pendente: pendenteRes.count || 0,
        retirada: retiradaRes.count || 0,
        avgPickupTime,
      };
    },
    enabled: !!selectedCondominium,
  });

  // Fetch block stats for cards - only pending packages (ignores selectedBlock/selectedApartment/statusFilter so cards don't disappear)
  const { data: blockStatsData } = useQuery({
    queryKey: ["porteiro-packages-block-stats", selectedCondominium, dateFrom, dateTo, dateField],
    queryFn: async () => {
      let query = supabase
        .from("packages")
        .select(
          `
          id,
          status,
          received_at,
          block:blocks(id, name)
        `
        )
        .eq("condominium_id", selectedCondominium)
        .eq("status", "pendente");

      if (dateFrom) {
        query = query.gte(dateField, dateFrom);
      }

      if (dateTo) {
        query = query.lte(dateField, `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCondominium,
  });

  // Statistics from count queries
  const stats = useMemo(() => {
    if (!statsData) return { total: 0, pendente: 0, retirada: 0, avgPickupTime: 0 };
    return statsData;
  }, [statsData]);

  const blockCardsStats = useMemo(() => {
    const allPackages = blockStatsData || [];
    const s = {
      blockStats: {} as Record<string, { blockId: string; blockName: string; total: number; pendente: number; retirada: number }>,
    };

    allPackages.forEach((pkg) => {
      const status = pkg.status as "pendente" | "retirada";
      const blockId = pkg.block?.id || "no-block";
      const blockName = pkg.block?.name || "Sem Bloco";

      if (!s.blockStats[blockId]) {
        s.blockStats[blockId] = { blockId, blockName, total: 0, pendente: 0, retirada: 0 };
      }

      s.blockStats[blockId].total++;
      s.blockStats[blockId][status]++;
    });

    return s;
  }, [blockStatsData]);

  const formatPickupTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const getWaitingTime = (pkg: PackageWithRelations) => {
    if (pkg.status === "retirada" && pkg.picked_up_at) {
      const minutes = differenceInMinutes(
        parseISO(pkg.picked_up_at),
        parseISO(pkg.received_at)
      );
      return formatPickupTime(minutes);
    }
    if (pkg.status === "pendente") {
      const minutes = differenceInMinutes(new Date(), parseISO(pkg.received_at));
      return formatPickupTime(minutes);
    }
    return "-";
  };

  const getResidentName = (pkg: PackageWithRelations): string => {
    // First check if package has a direct resident
    if (pkg.resident?.full_name) {
      return pkg.resident.full_name;
    }
    // Fallback to apartment residents - prefer responsible resident
    if (pkg.apartment?.residents && pkg.apartment.residents.length > 0) {
      const responsibleResident = pkg.apartment.residents.find(r => r.is_responsible);
      if (responsibleResident) {
        return responsibleResident.full_name;
      }
      return pkg.apartment.residents[0].full_name;
    }
    return "-";
  };

  // Helper function to convert image URL to Base64
  const getBase64FromUrl = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      const timeout = setTimeout(() => {
        resolve("");
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          const maxSize = 100;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } catch {
          resolve("");
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve("");
      };

      img.src = url;
    });
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (packages.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Selecione um condomínio com encomendas para gerar o PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    toast({
      title: "Gerando PDF...",
      description: "Carregando imagens das encomendas, aguarde...",
    });

    // Pre-load all images as Base64 (using signed URLs for private bucket)
    const imagesBase64: Record<string, string> = {};

    await Promise.all(
      packages.map(async (pkg) => {
        if (pkg.photo_url) {
          try {
            // Get signed URL first (photos are in private bucket)
            const signedUrl = await getSignedPackagePhotoUrl(pkg.photo_url);
            if (signedUrl) {
              imagesBase64[pkg.id] = await getBase64FromUrl(signedUrl);
            } else {
              imagesBase64[pkg.id] = "";
            }
          } catch {
            imagesBase64[pkg.id] = "";
          }
        }
      })
    );

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const selectedCondo = condominiums.find((c) => c.id === selectedCondominium);
    const selectedBlk = selectedBlock !== "all" ? blocks.find((b) => b.id === selectedBlock) : null;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Histórico de Encomendas", pageWidth / 2, 20, { align: "center" });

    // Subtitle
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Relatório gerado pelo NotificaCondo", pageWidth / 2, 27, { align: "center" });

    // Info Section
    doc.setTextColor(0);
    doc.setFontSize(11);
    let yPos = 40;

    doc.setFont("helvetica", "bold");
    doc.text("Informações do Condomínio:", 14, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    doc.text(`Condomínio: ${selectedCondo?.name || "-"}`, 14, yPos);
    yPos += 6;
    if (selectedCondo?.address) {
      doc.text(`Endereço: ${selectedCondo.address}`, 14, yPos);
      yPos += 6;
    }
    if (selectedBlk) {
      doc.text(`Bloco: ${selectedBlk.name}`, 14, yPos);
      yPos += 6;
    } else {
      doc.text(`Blocos: Todos`, 14, yPos);
      yPos += 6;
    }

    const period = [];
    if (dateFrom) period.push(`De: ${format(parseISO(dateFrom), "dd/MM/yyyy")}`);
    if (dateTo) period.push(`Até: ${format(parseISO(dateTo), "dd/MM/yyyy")}`);
    if (period.length > 0) {
      doc.text(`Período: ${period.join(" | ")}`, 14, yPos);
      yPos += 6;
    }

    doc.text(`Data do relatório: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, yPos);
    yPos += 12;

    // Summary Table
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Geral:", 14, yPos);
    yPos += 2;

    autoTable(doc, {
      startY: yPos,
      head: [["Estatística", "Valor"]],
      body: [
        ["Total de Encomendas", stats.total.toString()],
        ["Retiradas", stats.retirada.toString()],
        ["Pendentes", stats.pendente.toString()],
        ["Tempo Médio de Retirada", formatPickupTime(stats.avgPickupTime)],
      ],
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });

    // Block Stats Table (if showing all blocks)
    if (selectedBlock === "all" && Object.keys(blockCardsStats.blockStats).length > 1) {
      const blockTableStartY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.text("Estatísticas por Bloco:", 14, blockTableStartY);

      autoTable(doc, {
        startY: blockTableStartY + 4,
        head: [["Bloco", "Pendentes"]],
        body: Object.values(blockCardsStats.blockStats)
          .sort((a, b) => a.blockName.localeCompare(b.blockName, "pt-BR", { numeric: true }))
          .map((bs) => [
            bs.blockName,
            bs.pendente.toString(),
          ]),
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
    }

    // Packages Table with Thumbnails
    const tableStartY = (doc as any).lastAutoTable.finalY + 12;

    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento das Encomendas:", 14, tableStartY);

    autoTable(doc, {
      startY: tableStartY + 4,
      head: [["Foto", "Data/Hora", "Bloco/Apt", "Tipo", "Status", "Retirado por", "Tempo"]],
      body: packages.map((pkg) => [
        "",
        format(parseISO(pkg.received_at), "dd/MM/yyyy HH:mm"),
        `${pkg.block?.name || "-"} / ${pkg.apartment?.number || "-"}`,
        pkg.package_type?.name || "Encomenda",
        STATUS_CONFIG[pkg.status].label,
        pkg.picked_up_by_name || pkg.picked_up_by_profile?.full_name || "-",
        getWaitingTime(pkg),
      ]),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      bodyStyles: { fontSize: 8, minCellHeight: 18 },
      columnStyles: {
        0: { cellWidth: 20 },
      },
      didDrawCell: (data) => {
        if (data.column.index === 0 && data.section === "body") {
          const pkg = packages[data.row.index];
          if (pkg) {
            const base64 = imagesBase64[pkg.id];
            if (base64) {
              const imgSize = 15;
              const x = data.cell.x + (data.cell.width - imgSize) / 2;
              const y = data.cell.y + (data.cell.height - imgSize) / 2;

              try {
                doc.addImage(base64, "JPEG", x, y, imgSize, imgSize);
              } catch {
                // Silent fail if image can't be added
              }
            }
          }
        }
      },
      didParseCell: (data) => {
        if (data.column.index === 4 && data.section === "body") {
          const status = packages[data.row.index]?.status;
          if (status) {
            const [r, g, b] = STATUS_CONFIG[status].pdfColor;
            data.cell.styles.textColor = [r, g, b];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} | Gerado pelo NotificaCondo`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const blockSuffix = selectedBlk ? `-${selectedBlk.name}` : "";
    const fileName = `historico-${selectedCondo?.name?.replace(/\s+/g, "-")}${blockSuffix}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
    doc.save(fileName);

    setIsExporting(false);

    toast({
      title: "PDF gerado com sucesso!",
      description: `Arquivo: ${fileName}`,
    });
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
    loading = false,
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
    loading?: boolean;
  }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:flex-col sm:items-start">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 sm:mt-2 sm:w-full">
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-12 sm:w-16 mb-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold leading-tight">{value}</p>
            )}
            <p className="text-[11px] sm:text-sm text-muted-foreground leading-tight">{title}</p>
            {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <Helmet>
        <title>Histórico de Encomendas | NotificaCondo</title>
        <meta name="description" content="Histórico de encomendas do condomínio" />
      </Helmet>

      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/porteiro")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <FileText className="w-7 h-7 text-primary" />
                Histórico de Encomendas
              </h1>
              <p className="text-muted-foreground mt-1">
                Visualize o histórico completo de encomendas e exporte em PDF
              </p>
            </div>
          </div>

          {selectedCondominium && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowPendingSummaryModal(true)}
                className="gap-2"
              >
                <Clock className="w-4 h-4" />
                Pendentes por Apto
              </Button>
              {packages.length > 0 && (
                <Button onClick={exportToPDF} disabled={isExporting}>
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? "Gerando..." : "Exportar PDF"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filters - Horizontal layout like Síndico */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 flex-wrap">
              {/* Condominium Select */}
              {condominiums.length > 1 && (
                <Select
                  value={selectedCondominium}
                  onValueChange={(v) => {
                    setSelectedCondominium(v);
                    setSelectedBlock("all");
                    setSelectedApartment("all");
                  }}
                >
                  <SelectTrigger className="w-full md:w-[220px]">
                    <Building2 className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Condomínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {condominiums.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Quick Search - visible when condominium is selected */}
              {selectedCondominium && (
                <QuickBlockApartmentSearch
                  condominiumId={selectedCondominium}
                  onBlockFound={(blockId) => {
                    setSelectedBlock(blockId);
                    setCurrentPage(1);
                  }}
                  onApartmentFound={(apartmentId) => {
                    setSelectedApartment(apartmentId);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-[200px]"
                  placeholder="Ex: 0344, AF"
                />
              )}

              {/* Tracking code search */}
              {selectedCondominium && (
                <div className="relative w-full sm:w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Código de rastreio"
                    value={trackingCodeSearch}
                    onChange={(e) => {
                      setTrackingCodeSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 pr-8"
                  />
                  {trackingCodeSearch && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => {
                        setTrackingCodeSearch("");
                        setCurrentPage(1);
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              {/* Block Select */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
              <Select
                value={selectedBlock}
                onValueChange={(v) => {
                  setSelectedBlock(v);
                  setSelectedApartment("all");
                  setCurrentPage(1);
                }}
                disabled={!selectedCondominium}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Bloco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os blocos</SelectItem>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Apartment Select */}
              <Select
                value={selectedApartment}
                onValueChange={(v) => {
                  setSelectedApartment(v);
                  setCurrentPage(1);
                }}
                disabled={selectedBlock === "all"}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Home className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Apto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {apartments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>

              {/* Status Select */}
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="retirada">Retiradas</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por período: cadastro ou retirada */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                <Select
                  value={dateField}
                  onValueChange={(v) => {
                    setDateField(v as "received_at" | "picked_up_at");
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[190px]">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Tipo de data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received_at">Data do cadastro</SelectItem>
                    <SelectItem value="picked_up_at">Data da retirada</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-muted-foreground" htmlFor="date-from">
                      De
                    </label>
                    <input
                      id="date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-muted-foreground" htmlFor="date-to">
                      Até
                    </label>
                    <input
                      id="date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-5"
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                        setCurrentPage(1);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {selectedCondominium && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total"
              value={stats.total}
              icon={Package}
              color="bg-primary"
              loading={isLoadingStats}
            />
            <StatCard
              title="Pendentes"
              value={stats.pendente}
              icon={Clock}
              color="bg-amber-500"
              loading={isLoadingStats}
            />
            <StatCard
              title="Retiradas"
              value={stats.retirada}
              icon={PackageCheck}
              color="bg-emerald-500"
              loading={isLoadingStats}
            />
            <StatCard
              title="Tempo Médio"
              value={formatPickupTime(stats.avgPickupTime)}
              icon={Timer}
              color="bg-blue-500"
              subtitle="para retirada"
              loading={isLoadingStats}
            />
          </div>
        )}

        {/* Block Stats - Pending only */}
        {selectedCondominium && Object.values(blockCardsStats.blockStats).some((s) => s.pendente > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Pendentes por Bloco
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  (clique para filtrar)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.values(blockCardsStats.blockStats)
                  .filter((blockStats) => blockStats.pendente > 0)
                  .sort((a, b) => a.blockName.localeCompare(b.blockName, "pt-BR", { numeric: true }))
                  .map((blockStats) => {
                    const isSelected = selectedBlock === blockStats.blockId;
                    return (
                      <div
                        key={blockStats.blockId}
                        onClick={() => {
                          if (isSelected) {
                            // Deselect if clicking on already selected block
                            setSelectedBlock("all");
                            setStatusFilter("all");
                          } else {
                            setSelectedBlock(blockStats.blockId);
                            setSelectedApartment("all");
                            setStatusFilter("pendente");
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-500 dark:bg-emerald-500/30"
                            : "bg-card hover:bg-accent hover:border-primary/50"
                        }`}
                      >
                        <p className={`font-medium text-sm ${isSelected ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                          {blockStats.blockName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-lg font-bold ${isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                            {blockStats.pendente}
                          </span>
                          <span className={`text-xs ${isSelected ? "text-emerald-600/70 dark:text-emerald-400/70" : "text-muted-foreground"}`}>
                            pendente{blockStats.pendente !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Packages Table */}
        {selectedCondominium && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Encomendas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : packages.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma encomenda encontrada</h3>
                  <p className="text-muted-foreground mt-1">
                    Não há encomendas no período selecionado
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Bloco/Apt</TableHead>
                        <TableHead>Morador</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recebido por</TableHead>
                        <TableHead>Retirado por</TableHead>
                        <TableHead>Data Retirada</TableHead>
                        <TableHead>Tempo Espera</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.map((pkg) => (
                        <TableRow key={pkg.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedPackage(pkg); setShowDetailsModal(true); }}>
                          <TableCell>
                            {format(parseISO(pkg.received_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <BlockApartmentDisplay
                              blockName={pkg.block?.name}
                              apartmentNumber={pkg.apartment?.number}
                            />
                          </TableCell>
                          <TableCell>{getResidentName(pkg)}</TableCell>
                          <TableCell>{pkg.package_type?.name || "Encomenda"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_CONFIG[pkg.status].color}>
                              {STATUS_CONFIG[pkg.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>{pkg.received_by_name || pkg.received_by_profile?.full_name || "-"}</TableCell>
                          <TableCell>
                            {pkg.picked_up_by_name || pkg.picked_up_by_profile?.full_name || "-"}
                          </TableCell>
                          <TableCell>
                            {pkg.picked_up_at
                              ? format(parseISO(pkg.picked_up_at), "dd/MM/yyyy HH:mm")
                              : "-"}
                          </TableCell>
                          <TableCell>{getWaitingTime(pkg)}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setSelectedPackage(pkg); setShowDetailsModal(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && packages.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            className="w-9 h-9 p-0"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No Selection Message */}
        {!selectedCondominium && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Selecione um condomínio</h3>
              <p className="text-muted-foreground mt-1">
                Escolha um condomínio para visualizar o histórico de encomendas
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pending Packages Summary Modal */}
        <Dialog open={showPendingSummaryModal} onOpenChange={setShowPendingSummaryModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Encomendas Pendentes
              </DialogTitle>
              <DialogDescription>
                Encomendas aguardando retirada por apartamento
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[400px]">
              {pendingSummary.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma encomenda pendente de retirada
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingSummary.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <Badge variant="outline" className="font-medium">
                        {item.blockName} / {item.apartmentNumber}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {item.count} {item.count === 1 ? 'encomenda' : 'encomendas'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm font-medium text-amber-600">
                Total: {pendingPackages.length} pendentes
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const header = "*Encomendas Cadastradas no Sistema NotificaCondo Pendentes de Entrega:*\n\n";
                    const text = header + pendingSummary
                      .map(item => `${item.blockName} / ${item.apartmentNumber} - ${item.count} ${item.count === 1 ? 'encomenda' : 'encomendas'}`)
                      .join('\n') + `\n\nTotal: ${pendingPackages.length} pendentes`;
                    navigator.clipboard.writeText(text);
                    toast({ title: "Lista copiada para área de transferência" });
                  }}
                  disabled={pendingSummary.length === 0}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
                <Button variant="outline" onClick={() => setShowPendingSummaryModal(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Package Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Detalhes da Encomenda
              </DialogTitle>
              <DialogDescription>
                Informações completas da encomenda
              </DialogDescription>
            </DialogHeader>
            
            {selectedPackage && (
              <div className="space-y-4">
                {/* Photo */}
                {selectedPackage.photo_url && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Foto da Encomenda
                    </h4>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      {isLoadingPhoto ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : signedPhotoUrl ? (
                        <img
                          src={signedPhotoUrl}
                          alt="Foto da encomenda"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <span className="text-sm">Não foi possível carregar a imagem</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={STATUS_CONFIG[selectedPackage.status].color + " text-sm px-3 py-1"}>
                    {STATUS_CONFIG[selectedPackage.status].label}
                  </Badge>
                </div>

                {/* Location Info */}
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Localização
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Bloco</p>
                      <p className="font-medium">{selectedPackage.block?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Apartamento</p>
                      <p className="font-medium">{selectedPackage.apartment?.number || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Morador</p>
                      <p className="font-medium">{getResidentName(selectedPackage)}</p>
                    </div>
                  </div>
                </div>

                {/* Dates Info */}
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Datas
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Recebida em</p>
                      <p className="font-medium">{format(parseISO(selectedPackage.received_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Recebida por</p>
                      <p className="font-medium">{selectedPackage.received_by_name || selectedPackage.received_by_profile?.full_name || "-"}</p>
                    </div>
                    {selectedPackage.picked_up_at && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Retirada em</p>
                          <p className="font-medium">{format(parseISO(selectedPackage.picked_up_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Retirada por</p>
                          <p className="font-medium">{selectedPackage.picked_up_by_name || selectedPackage.picked_up_by_profile?.full_name || "-"}</p>
                        </div>
                      </>
                    )}
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Tempo de Espera</p>
                      <p className="font-medium">{getWaitingTime(selectedPackage)}</p>
                    </div>
                  </div>
                </div>

                {/* Description & Tracking */}
                {(selectedPackage.description || selectedPackage.tracking_code) && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Informações Adicionais
                    </h4>
                    {selectedPackage.tracking_code && (
                      <div>
                        <p className="text-xs text-muted-foreground">Código de Rastreio</p>
                        <p className="font-mono font-medium">{selectedPackage.tracking_code}</p>
                      </div>
                    )}
                    {selectedPackage.description && (
                      <div>
                        <p className="text-xs text-muted-foreground">Descrição</p>
                        <p className="font-medium">{selectedPackage.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* WhatsApp Notification */}
                <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2 flex-1">
                      <MessageSquare className="w-4 h-4" />
                      Notificação WhatsApp
                      {notificationLogs.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {notificationLogs.length} {notificationLogs.length === 1 ? "envio" : "envios"}
                        </Badge>
                      )}
                    </h4>
                    {canResendSelectedPackageNotification && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResendNotification}
                        disabled={isResendingNotification || !selectedPackage?.apartment?.id}
                        className="h-8 gap-1.5"
                      >
                        {isResendingNotification ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        {isResendingNotification ? "Reenviando..." : "Reenviar"}
                      </Button>
                    )}
                  </div>


                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm">Carregando histórico...</span>
                    </div>
                  ) : notificationLogs.length > 0 ? (
                    <div className="space-y-2">
                      {notificationLogs.map((log, index) => (
                        <div
                          key={log.id}
                          className={cn(
                            "p-3 rounded-lg border text-sm",
                            log.success
                              ? "bg-[hsl(142,76%,97%)] border-[hsl(142,76%,80%)] dark:bg-[hsl(142,30%,12%)] dark:border-[hsl(142,30%,25%)]"
                              : "bg-destructive/5 border-destructive/20"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              {log.success ? (
                                <CheckCircle2 className="w-4 h-4 text-[hsl(142,72%,29%)] dark:text-[hsl(142,60%,50%)]" />
                              ) : (
                                <XCircle className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={cn("font-medium text-xs", log.success ? "text-[hsl(142,72%,25%)] dark:text-[hsl(142,60%,55%)]" : "")}>
                                  {log.success ? "Enviada com sucesso" : "Falha no envio"}
                                </span>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  #{notificationLogs.length - index}º envio
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 shrink-0" />
                                {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                              {log.debug_info?.sent_by_name && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <User className="w-3 h-3 shrink-0" />
                                  Enviado por: <span className="font-medium">{log.debug_info.sent_by_name}</span>
                                </p>
                              )}
                              {!log.success && log.error_message && (
                                <p className="text-xs text-destructive mt-1 truncate">
                                  {log.error_message}
                                </p>
                              )}
                            </div>
                          </div>
                          {log.success && (
                            <DeliveryStatusTracker
                              status={log.status}
                              timestamps={{
                                accepted_at: log.accepted_at,
                                sent_at: log.sent_at,
                                delivered_at: log.delivered_at,
                                read_at: log.read_at,
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-lg border border-dashed text-center">
                      <AlertCircle className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Nenhuma notificação enviada</p>
                    </div>
                  )}
                </div>

                <Button variant="outline" className="w-full" onClick={() => setShowDetailsModal(false)}>
                  Fechar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PorteiroPackagesHistory;
