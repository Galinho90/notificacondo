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
  Package,
  PackageCheck,
  Clock,
  Building2,
  FileText,
  Home,
  User,
  Phone,
  Calendar,
  Download,
  Layers,
  Timer,
  Eye,
  Search,
  XCircle,
} from "lucide-react";
import { PackageDetailsDialog } from "@/components/packages/PackageDetailsDialog";
import type { Package as PackageType } from "@/hooks/usePackages";
import { format, parseISO, differenceInHours, differenceInMinutes } from "date-fns";
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

interface Apartment {
  id: string;
  number: string;
  block_id: string;
}

interface Condominium {
  id: string;
  name: string;
}

const STATUS_CONFIG = {
  pendente: {
    label: "Pendente",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    pdfColor: [245, 158, 11],
  },
  retirada: {
    label: "Retirada",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    pdfColor: [16, 185, 129],
  },
};

const PackagesHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { dateTime: formatDateTime, date: formatDate } = useDateFormatter();

  const [selectedCondominium, setSelectedCondominium] = useState<string>("");
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [selectedApartment, setSelectedApartment] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  /** Campo de data usado no filtro: cadastro (received_at) ou retirada (picked_up_at) */
  const [dateField, setDateField] = useState<"received_at" | "picked_up_at">("received_at");
  const [trackingCodeSearch, setTrackingCodeSearch] = useState<string>("");
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch condominiums
  const { data: condominiums = [] } = useQuery({
    queryKey: ["sindico-condominiums", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominiums")
        .select("id, name")
        .eq("owner_id", user?.id)
        .order("name");
      if (error) throw error;
      return data as Condominium[];
    },
    enabled: !!user,
  });

  // Fetch blocks for selected condominium (natural sort for "BLOCO 1", "BLOCO 10", etc.)
  const { data: blocks = [] } = useQuery({
    queryKey: ["blocks", selectedCondominium],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocks")
        .select("id, name, condominium_id")
        .eq("condominium_id", selectedCondominium);
      if (error) throw error;
      // Natural sort to handle "BLOCO 1", "BLOCO 2", "BLOCO 10" correctly
      return (data as Block[]).sort((a, b) => 
        a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' })
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
        .select("id, number, block_id")
        .eq("block_id", selectedBlock)
        .order("number");
      if (error) throw error;
      return data as Apartment[];
    },
    enabled: !!selectedBlock,
  });

  // Fetch resident info for selected apartment
  const { data: residentInfo } = useQuery({
    queryKey: ["resident-info", selectedApartment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, phone, email")
        .eq("apartment_id", selectedApartment)
        .eq("is_responsible", true)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!selectedApartment,
  });

  // Fetch packages for selected apartment
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["apartment-packages", selectedApartment, statusFilter, dateFrom, dateTo, dateField, trackingCodeSearch],
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
        .eq("apartment_id", selectedApartment)
        .order("received_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pendente" | "retirada");
      }

      if (dateFrom) {
        query = query.gte(dateField, dateFrom);
      }

      if (dateTo) {
        query = query.lte(dateField, `${dateTo}T23:59:59`);
      }

      if (trackingCodeSearch.trim()) {
        query = query.ilike("tracking_code", `%${trackingCodeSearch.trim()}%`);
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
    enabled: !!selectedApartment,
  });

  // Statistics
  const stats = useMemo(() => {
    const s = {
      total: packages.length,
      pendente: 0,
      retirada: 0,
      avgPickupTime: 0,
    };

    let totalPickupTimeMinutes = 0;
    let pickedUpCount = 0;

    packages.forEach((pkg) => {
      const status = pkg.status as "pendente" | "retirada";
      s[status]++;
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
  }, [packages]);

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
        resolve(""); // Timeout after 5 seconds
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          const maxSize = 100; // Max dimension for thumbnail
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
          resolve(canvas.toDataURL("image/jpeg", 0.7)); // 70% quality
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
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    if (packages.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Selecione um apartamento com encomendas para gerar o PDF.",
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
    const selectedBlk = blocks.find((b) => b.id === selectedBlock);
    const selectedApt = apartments.find((a) => a.id === selectedApartment);

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
    doc.text("Informações do Apartamento:", 14, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    doc.text(`Condomínio: ${selectedCondo?.name || "-"}`, 14, yPos);
    yPos += 6;
    doc.text(`Unidade: ${selectedBlk?.name || "-"} - Apt ${selectedApt?.number || "-"}`, 14, yPos);
    yPos += 6;

    if (residentInfo) {
      doc.text(`Responsável: ${residentInfo.full_name}`, 14, yPos);
      yPos += 6;
      if (residentInfo.phone) {
        doc.text(`Telefone: ${residentInfo.phone}`, 14, yPos);
        yPos += 6;
      }
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
    doc.text("Resumo:", 14, yPos);
    yPos += 2;

    autoTable(doc, {
      startY: yPos,
      head: [["Status", "Quantidade"]],
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

    // Packages Table with Thumbnails
    const tableStartY = (doc as any).lastAutoTable.finalY + 12;

    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento das Encomendas:", 14, tableStartY);

    autoTable(doc, {
      startY: tableStartY + 4,
      head: [["Foto", "Data/Hora", "Tipo", "Status", "Código", "Recebido", "Tempo"]],
      body: packages.map((pkg) => [
        "", // Empty cell for photo - will be filled by didDrawCell
        format(parseISO(pkg.received_at), "dd/MM/yyyy HH:mm"),
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
        0: { cellWidth: 20 }, // Photo column width
      },
      didDrawCell: (data) => {
        // Draw image in the first column (Foto)
        if (data.column.index === 0 && data.section === "body") {
          const pkg = packages[data.row.index];
          if (pkg) {
            const base64 = imagesBase64[pkg.id];
            if (base64) {
              const imgSize = 15; // 15mm x 15mm
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
        // Color status column (now index 3 instead of 2)
        if (data.column.index === 3 && data.section === "body") {
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

    const fileName = `historico-encomendas-${selectedBlk?.name}-${selectedApt?.number}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
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
        <meta name="description" content="Histórico de encomendas por apartamento" />
      </Helmet>

      <div className="space-y-6 animate-fade-up">
        <SindicoBreadcrumbs
          items={[
            { label: "Encomendas", href: "/sindico/encomendas" },
            { label: "Histórico por Apartamento" },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="w-7 h-7 text-primary" />
              Histórico por Apartamento
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize o histórico de encomendas de cada unidade e exporte em PDF
            </p>
          </div>

          {selectedApartment && packages.length > 0 && (
            <Button onClick={exportToPDF} disabled={isExporting}>
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Gerando..." : "Exportar PDF"}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Selecione a Unidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Condominium Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Condomínio</label>
                <Select
                  value={selectedCondominium}
                  onValueChange={(v) => {
                    setSelectedCondominium(v);
                    setSelectedBlock("");
                    setSelectedApartment("");
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
                <label className="text-sm font-medium">Bloco</label>
                <Select
                  value={selectedBlock}
                  onValueChange={(v) => {
                    setSelectedBlock(v);
                    setSelectedApartment("");
                  }}
                  disabled={!selectedCondominium}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o bloco" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Apartment Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Apartamento</label>
                <Select
                  value={selectedApartment}
                  onValueChange={setSelectedApartment}
                  disabled={!selectedBlock}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o apartamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {apartments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        Apt {a.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t">
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
            </div>
          </CardContent>
        </Card>

        {/* Resident Info */}
        {selectedApartment && residentInfo && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{residentInfo.full_name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {residentInfo.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {residentInfo.phone}
                      </span>
                    )}
                    {residentInfo.email && (
                      <span>{residentInfo.email}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {selectedApartment && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total"
              value={stats.total}
              icon={Package}
              color="bg-primary"
              loading={isLoading}
            />
            <StatCard
              title="Pendentes"
              value={stats.pendente}
              icon={Clock}
              color="bg-amber-500"
              loading={isLoading}
            />
            <StatCard
              title="Retiradas"
              value={stats.retirada}
              icon={PackageCheck}
              color="bg-emerald-500"
              loading={isLoading}
            />
            <StatCard
              title="Tempo Médio"
              value={formatPickupTime(stats.avgPickupTime)}
              icon={Timer}
              color="bg-blue-500"
              subtitle="para retirada"
              loading={isLoading}
            />
          </div>
        )}

        {/* Packages Table */}
        {selectedApartment && (
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
                    Este apartamento não possui encomendas no período selecionado
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
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
        {!selectedApartment && (
          <Card>
            <CardContent className="p-12 text-center">
              <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Selecione um apartamento</h3>
              <p className="text-muted-foreground mt-1">
                Escolha um condomínio, bloco e apartamento para visualizar o histórico de encomendas
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <PackageDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        package_={selectedPackage}
      />
    </DashboardLayout>
  );
};

export default PackagesHistory;
