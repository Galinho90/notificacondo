import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDateFormatter } from "@/hooks/useFormattedDate";
import { getSignedPackagePhotoUrl } from "@/lib/packageStorage";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import SindicoBreadcrumbs from "@/components/sindico/SindicoBreadcrumbs";
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
  TrendingUp,
  Copy,
  Eye,
  Search,
  XCircle,
} from "lucide-react";
import { PackageDetailsDialog } from "@/components/packages/PackageDetailsDialog";
import type { Package as PackageType } from "@/hooks/usePackages";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import BlockApartmentDisplay from "@/components/common/BlockApartmentDisplay";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  block: { id: string; name: string } | null;
  apartment: { id: string; number: string } | null;
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

const PackagesCondominiumHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { dateTime: formatDateTime, date: formatDate } = useDateFormatter();

  const [selectedCondominium, setSelectedCondominium] = useState<string>("");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  /** Campo de data usado no filtro: cadastro (received_at) ou retirada (picked_up_at) */
  const [dateField, setDateField] = useState<"received_at" | "picked_up_at">("received_at");
  const [trackingCodeSearch, setTrackingCodeSearch] = useState<string>("");
  // Busca por rastreio: debounce de 500ms e mínimo de 3 caracteres (evita varredura pesada no banco)
  const [trackingFilter, setTrackingFilter] = useState<string>("");
  useEffect(() => {
    const timer = setTimeout(() => {
      const term = trackingCodeSearch.trim();
      setTrackingFilter(term.length >= 3 ? term : "");
    }, 500);
    return () => clearTimeout(timer);
  }, [trackingCodeSearch]);
  const [isExporting, setIsExporting] = useState(false);
  const [showPendingSummaryModal, setShowPendingSummaryModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch condominiums
  const { data: condominiums = [] } = useQuery({
    queryKey: ["sindico-condominiums", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominiums")
        .select("id, name, address")
        .eq("owner_id", user?.id)
        .order("name");
      if (error) throw error;
      return data as Condominium[];
    },
    enabled: !!user,
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

  // Fetch packages for selected condominium
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["condominium-packages", selectedCondominium, selectedBlock, statusFilter, dateFrom, dateTo, dateField, trackingFilter],
    queryFn: async () => {
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
          block:blocks(id, name),
          apartment:apartments(id, number),
          condominium:condominiums(id, name),
          resident:residents(id, full_name, phone),
          package_type:package_types(id, name, icon)
        `)
        .eq("condominium_id", selectedCondominium)
        .order("received_at", { ascending: false });

      if (selectedBlock !== "all") {
        query = query.eq("block_id", selectedBlock);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pendente" | "retirada");
      }

      if (dateFrom) {
        query = query.gte(dateField, dateFrom);
      }

      if (dateTo) {
        query = query.lte(dateField, `${dateTo}T23:59:59`);
      }

      if (trackingFilter) {
        query = query.ilike("tracking_code", `%${trackingFilter}%`);
      }

      const { data, error } = await query.range(0, 9999);
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

  // Fetch block stats for cards (ignores selectedBlock/statusFilter so cards don't disappear)
  const { data: blockStatsData } = useQuery({
    queryKey: ["sindico-packages-block-stats", selectedCondominium, dateFrom, dateTo, dateField, trackingFilter],
    queryFn: async () => {
      let query = supabase
        .from("packages")
        .select(`
          id,
          status,
          received_at,
          block:blocks(id, name)
        `)
        .eq("condominium_id", selectedCondominium);

      if (dateFrom) {
        query = query.gte(dateField, dateFrom);
      }

      if (dateTo) {
        query = query.lte(dateField, `${dateTo}T23:59:59`);
      }

      if (trackingFilter) {
        query = query.ilike("tracking_code", `%${trackingFilter}%`);
      }

      const { data, error } = await query.range(0, 9999);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCondominium,
  });

  // Count queries for accurate stats (not limited by row cap)
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["packages-count-total", selectedCondominium, selectedBlock, statusFilter, dateFrom, dateTo, dateField, trackingFilter],
    queryFn: async () => {
      let query = supabase
        .from("packages")
        .select("*", { count: "exact", head: true })
        .eq("condominium_id", selectedCondominium);

      if (selectedBlock !== "all") {
        query = query.eq("block_id", selectedBlock);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pendente" | "retirada");
      }
      if (dateFrom) {
        query = query.gte(dateField, dateFrom);
      }
      if (dateTo) {
        query = query.lte(dateField, `${dateTo}T23:59:59`);
      }
      if (trackingFilter) {
        query = query.ilike("tracking_code", `%${trackingFilter}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedCondominium,
  });

  const { data: pendenteCount = 0 } = useQuery({
    queryKey: ["packages-count-pendente", selectedCondominium, selectedBlock, dateFrom, dateTo, dateField, trackingFilter],
    queryFn: async () => {
      let query = supabase
        .from("packages")
        .select("*", { count: "exact", head: true })
        .eq("condominium_id", selectedCondominium)
        .eq("status", "pendente");

      if (selectedBlock !== "all") {
        query = query.eq("block_id", selectedBlock);
      }
      if (dateFrom) {
        query = query.gte(dateField, dateFrom);
      }
      if (dateTo) {
        query = query.lte(dateField, `${dateTo}T23:59:59`);
      }
      if (trackingFilter) {
        query = query.ilike("tracking_code", `%${trackingFilter}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedCondominium,
  });

  const { data: retiradaCount = 0 } = useQuery({
    queryKey: ["packages-count-retirada", selectedCondominium, selectedBlock, dateFrom, dateTo, dateField, trackingFilter],
    queryFn: async () => {
      let query = supabase
        .from("packages")
        .select("*", { count: "exact", head: true })
        .eq("condominium_id", selectedCondominium)
        .eq("status", "retirada");

      if (selectedBlock !== "all") {
        query = query.eq("block_id", selectedBlock);
      }
      if (dateFrom) {
        query = query.gte(dateField, dateFrom);
      }
      if (dateTo) {
        query = query.lte(dateField, `${dateTo}T23:59:59`);
      }
      if (trackingFilter) {
        query = query.ilike("tracking_code", `%${trackingFilter}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedCondominium,
  });

  // Fetch pending packages for summary modal
  const { data: pendingPackages = [] } = useQuery({
    queryKey: ["pending-packages-summary-sindico", selectedCondominium],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(`
          id,
          block:blocks(id, name),
          apartment:apartments(id, number)
        `)
        .eq("condominium_id", selectedCondominium)
        .eq("status", "pendente")
        .range(0, 9999);

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

  // Statistics - use count queries for accurate totals, packages array for avg pickup time
  const stats = useMemo(() => {
    const s = {
      total: statusFilter !== "all" ? totalCount : (pendenteCount + retiradaCount),
      pendente: pendenteCount,
      retirada: retiradaCount,
      avgPickupTime: 0,
      blockStats: {} as Record<string, { blockId: string; blockName: string; total: number; pendente: number; retirada: number }>,
    };

    let totalPickupTimeMinutes = 0;
    let pickedUpCount = 0;

    packages.forEach((pkg) => {
      const status = pkg.status as "pendente" | "retirada";

      // Track per-block stats
      const blockId = pkg.block?.id || "no-block";
      const blockName = pkg.block?.name || "Sem Bloco";
      if (!s.blockStats[blockId]) {
        s.blockStats[blockId] = { blockId, blockName, total: 0, pendente: 0, retirada: 0 };
      }
      s.blockStats[blockId].total++;
      s.blockStats[blockId][status]++;

      if (status === "retirada" && pkg.picked_up_at) {
        const minutes = differenceInMinutes(
          parseISO(pkg.picked_up_at),
          parseISO(pkg.received_at)
        );
        totalPickupTimeMinutes += minutes;
        pickedUpCount++;
      }
    });

    if (pickedUpCount > 0) {
      s.avgPickupTime = Math.round(totalPickupTimeMinutes / pickedUpCount);
    }

    return s;
  }, [packages, totalCount, pendenteCount, retiradaCount, statusFilter]);

  // Block stats for cards (independent of selectedBlock/statusFilter so cards don't disappear)
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

  // Export to PDF with thumbnails
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
    doc.text("Histórico de Encomendas por Condomínio", pageWidth / 2, 20, { align: "center" });

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
    if (selectedBlock === "all" && Object.keys(stats.blockStats).length > 1) {
      const blockTableStartY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.text("Estatísticas por Bloco:", 14, blockTableStartY);

      autoTable(doc, {
        startY: blockTableStartY + 4,
        head: [["Bloco", "Total", "Retiradas", "Pendentes"]],
        body: Object.entries(stats.blockStats)
          .sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true }))
          .map(([blockName, blockStats]) => [
            blockName,
            blockStats.total.toString(),
            blockStats.retirada.toString(),
            blockStats.pendente.toString(),
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
      head: [["Foto", "Data/Hora", "Bloco/Apt", "Tipo", "Status", "Código", "Recebido", "Tempo"]],
      body: packages.map((pkg) => [
        "",
        format(parseISO(pkg.received_at), "dd/MM/yyyy HH:mm"),
        `${pkg.block?.name || "-"} / ${pkg.apartment?.number || "-"}`,
        pkg.package_type?.name || "Encomenda",
        STATUS_CONFIG[pkg.status].label,
        pkg.pickup_code,
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
    const fileName = `historico-condominio-${selectedCondo?.name?.replace(/\s+/g, "-")}${blockSuffix}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
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
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <Helmet>
        <title>Histórico por Condomínio | NotificaCondo</title>
        <meta name="description" content="Histórico de encomendas por condomínio" />
      </Helmet>

      <div className="space-y-6 animate-fade-up">
        <SindicoBreadcrumbs
          items={[
            { label: "Encomendas", href: "/sindico/encomendas" },
            { label: "Histórico por Condomínio" },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <Building2 className="w-7 h-7 text-primary" />
              Histórico por Condomínio
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize o histórico completo de encomendas de todo o condomínio e exporte em PDF
            </p>
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Selecione o Condomínio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Condominium Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Condomínio</label>
                <Select
                  value={selectedCondominium}
                  onValueChange={(v) => {
                    setSelectedCondominium(v);
                    setSelectedBlock("all");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o condomínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {condominiums.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Block Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bloco (opcional)</label>
                <Select
                  value={selectedBlock}
                  onValueChange={setSelectedBlock}
                  disabled={!selectedCondominium}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os blocos" />
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
              </div>
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Data</label>
                <Select
                  value={dateField}
                  onValueChange={(v) => setDateField(v as "received_at" | "picked_up_at")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received_at">Data do cadastro</SelectItem>
                    <SelectItem value="picked_up_at">Data da retirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="retirada">Retiradas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Código de Rastreio</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por código de rastreio"
                    value={trackingCodeSearch}
                    onChange={(e) => setTrackingCodeSearch(e.target.value)}
                    className="pl-10 pr-8"
                  />
                  {trackingCodeSearch && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setTrackingCodeSearch("")}
                    >
                      <XCircle className="w-4 h-4" />
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
            />
            <StatCard
              title="Pendentes"
              value={stats.pendente}
              icon={Clock}
              color="bg-amber-500"
            />
            <StatCard
              title="Retiradas"
              value={stats.retirada}
              icon={PackageCheck}
              color="bg-emerald-500"
            />
            <StatCard
              title="Tempo Médio"
              value={formatPickupTime(stats.avgPickupTime)}
              icon={Timer}
              color="bg-blue-500"
              subtitle="para retirada"
            />
          </div>
        )}

        {/* Block Stats - Pending only (uses blockCardsStats so cards don't disappear when filtering) */}
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
                    Este condomínio não possui encomendas no período selecionado
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
                        <TableHead>Código</TableHead>
                        <TableHead>Recebido por</TableHead>
                        <TableHead>Retirado por</TableHead>
                        <TableHead>Data Retirada</TableHead>
                        <TableHead>Tempo Espera</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell>
                            {format(parseISO(pkg.received_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <BlockApartmentDisplay
                              blockName={pkg.block?.name}
                              apartmentNumber={pkg.apartment?.number}
                            />
                          </TableCell>
                          <TableCell>{pkg.resident?.full_name || "-"}</TableCell>
                          <TableCell>{pkg.package_type?.name || "Encomenda"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_CONFIG[pkg.status].color}>
                              {STATUS_CONFIG[pkg.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{pkg.pickup_code}</TableCell>
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
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedPackage({
                                  id: pkg.id,
                                  condominium_id: pkg.condominium?.id || "",
                                  block_id: pkg.block?.id || "",
                                  apartment_id: pkg.apartment?.id || "",
                                  resident_id: pkg.resident?.id || null,
                                  received_by: pkg.received_by,
                                  pickup_code: pkg.pickup_code,
                                  description: pkg.description,
                                  photo_url: pkg.photo_url,
                                  status: pkg.status,
                                  received_at: pkg.received_at,
                                  picked_up_at: pkg.picked_up_at,
                                  picked_up_by: pkg.picked_up_by,
                                  picked_up_by_name: pkg.picked_up_by_name,
                                  created_at: pkg.received_at,
                                  notification_sent: null,
                                  notification_sent_at: null,
                                  notification_count: null,
                                  condominium: pkg.condominium ? { name: pkg.condominium.name } : undefined,
                                  block: pkg.block ? { name: pkg.block.name } : undefined,
                                  apartment: pkg.apartment ? { number: pkg.apartment.number } : undefined,
                                } as PackageType);
                                setDetailsOpen(true);
                              }}
                              title="Ver detalhes e histórico de envios"
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
                Escolha um condomínio para visualizar o histórico completo de encomendas
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

        <PackageDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          package_={selectedPackage}
        />
      </div>
    </DashboardLayout>
  );
};

export default PackagesCondominiumHistory;
