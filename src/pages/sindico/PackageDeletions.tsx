import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Trash2, CheckCircle2, XCircle, Loader2, Clock, User,
  Building2, ImageOff, Package as PackageIcon, Search, Filter,
  PackageCheck, X, ChevronDown, AlertCircle, Eye,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getSignedPackagePhotoUrl, deletePackagePhoto } from "@/lib/packageStorage";
import { cn } from "@/lib/utils";

type Status = "pendente" | "aprovada" | "rejeitada";

interface DeletionRequest {
  id: string;
  package_id: string | null;
  condominium_id: string;
  requested_by: string;
  requested_by_name: string | null;
  package_pickup_code: string | null;
  package_block_name: string | null;
  package_apartment_number: string | null;
  package_condominium_name: string | null;
  reason: string;
  status: Status;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  package?: {
    id: string;
    pickup_code: string;
    status: string;
    received_at: string;
    photo_url: string | null;
    tracking_code: string | null;
    description: string | null;
    received_by_name: string | null;
    picked_up_at: string | null;
    picked_up_by_name: string | null;
    condominium?: { name: string };
    block?: { name: string };
    apartment?: { number: string };
    resident?: { full_name: string; phone: string | null };
    package_type?: { name: string; icon: string | null };
  };
}

interface PackageDisplayInfo {
  pickupCode: string;
  location: string | null;
  condominiumName: string | null;
}

function getPackageDisplayInfo(req: DeletionRequest): PackageDisplayInfo {
  const blockName = req.package?.block?.name ?? req.package_block_name;
  const apartmentNumber = req.package?.apartment?.number ?? req.package_apartment_number;
  const location = blockName || apartmentNumber
    ? `${blockName ?? "Bloco —"} - Apto ${apartmentNumber ?? "—"}`
    : null;

  return {
    pickupCode: req.package?.pickup_code ?? req.package_pickup_code ?? "—",
    location,
    condominiumName: req.package?.condominium?.name ?? req.package_condominium_name,
  };
}

const STATUS_CONFIG = {
  pendente: {
    label: "Pendentes",
    color: "text-yellow-600",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-900",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: AlertCircle,
    iconBg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400",
    emptyTitle: "Nenhuma pendente",
    emptyDesc: "Solicitações de exclusão aparecerão aqui para sua aprovação.",
  },
  aprovada: {
    label: "Aprovadas",
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-900",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: CheckCircle2,
    iconBg: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400",
    emptyTitle: "Nenhuma aprovada",
    emptyDesc: "Solicitações aprovadas serão listadas aqui.",
  },
  rejeitada: {
    label: "Rejeitadas",
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: XCircle,
    iconBg: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400",
    emptyTitle: "Nenhuma rejeitada",
    emptyDesc: "Solicitações rejeitadas aparecerão aqui.",
  },
} as const;

export default function PackageDeletions() {
  const { user } = useAuth();
  const [items, setItems] = useState<DeletionRequest[]>([]);
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status>("pendente");
  const [approveTarget, setApproveTarget] = useState<DeletionRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DeletionRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [photoByRequestId, setPhotoByRequestId] = useState<Record<string, string>>({});
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [selectedApartment, setSelectedApartment] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("package_deletion_requests")
        .select(
          `*, package:packages(
            id, pickup_code, status, received_at, photo_url, tracking_code,
            description, received_by_name, picked_up_at, picked_up_by_name,
            condominium:condominiums(name),
            block:blocks(name),
            apartment:apartments(number),
            resident:residents(full_name, phone),
            package_type:package_types(name, icon)
          )`
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data as DeletionRequest[]) || [];
      setItems(list);

      const withPhotos = list.filter((r) => r.package?.photo_url);
      if (withPhotos.length > 0) {
        const entries = await Promise.all(
          withPhotos.map(async (r) => {
            const signed = await getSignedPackagePhotoUrl(r.package!.photo_url as string);
            return [r.id, signed] as const;
          })
        );
        const photoMap: Record<string, string> = {};
        entries.forEach(([id, url]) => {
          if (url) photoMap[id] = url;
        });
        setPhotoByRequestId(photoMap);
      } else {
        setPhotoByRequestId({});
      }

      const userIds = Array.from(new Set(list.map((r) => r.requested_by).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        const map: Record<string, string> = {};
        (profiles || []).forEach((p: any) => {
          if (p?.full_name) map[p.id] = p.full_name;
        });
        setNameByUserId(map);
      } else {
        setNameByUserId({});
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("pkg-del-req")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "package_deletion_requests" },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(
    () =>
      items
        .filter((i) => i.status === tab)
        .filter((i) => {
          const blockName = i.package?.block?.name ?? i.package_block_name ?? "";
          const apartmentNumber = i.package?.apartment?.number ?? i.package_apartment_number ?? "";
          const blockMatch = !selectedBlock || blockName === selectedBlock;
          const aptMatch = !selectedApartment || apartmentNumber === selectedApartment;
          return blockMatch && aptMatch;
        })
        .filter((i) => {
          if (!searchQuery.trim()) return true;
          const query = searchQuery.trim().toLowerCase();
          const pickupCode = (i.package?.pickup_code ?? i.package_pickup_code ?? "").toLowerCase();
          const residentName = (i.package?.resident?.full_name ?? "").toLowerCase();
          return pickupCode.includes(query) || residentName.includes(query);
        }),
    [items, tab, selectedBlock, selectedApartment, searchQuery]
  );

  const counts = useMemo(
    () => ({
      pendente: items.filter((i) => i.status === "pendente").length,
      aprovada: items.filter((i) => i.status === "aprovada").length,
      rejeitada: items.filter((i) => i.status === "rejeitada").length,
    }),
    [items]
  );

  const blockOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const blockName = i.package?.block?.name ?? i.package_block_name;
      if (blockName) set.add(blockName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [items]);

  const apartmentOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const apartmentNumber = i.package?.apartment?.number ?? i.package_apartment_number;
      if (apartmentNumber) set.add(String(apartmentNumber));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [items]);

  const reviewerName = user?.user_metadata?.full_name || user?.email || null;

  const handleApprove = async () => {
    if (!approveTarget || !user) return;
    setProcessing(true);
    try {
      const photoUrlToDelete = approveTarget.package?.photo_url ?? null;

      const { error: approveError } = await (supabase as any).rpc(
        "approve_package_deletion_request",
        {
          _request_id: approveTarget.id,
          _reviewer_name: reviewerName,
        }
      );
      if (approveError) throw approveError;

      if (approveTarget.package_id) {
        const { data: packageStillExists, error: verifyError } = await (supabase as any)
          .from("packages")
          .select("id")
          .eq("id", approveTarget.package_id)
          .maybeSingle();

        if (verifyError) throw verifyError;
        if (packageStillExists) {
          throw new Error("A solicitação foi aprovada, mas a encomenda ainda existe no banco de dados.");
        }
      }

      if (photoUrlToDelete) {
        const result = await deletePackagePhoto(photoUrlToDelete);
        if (!result.success) {
          console.warn("Falha ao excluir a foto da encomenda:", result.error);
          toast.warning("Encomenda excluída, mas a foto não pôde ser removida do armazenamento.");
        }
      }

      toast.success("Solicitação aprovada — encomenda e foto excluídas");
      setApproveTarget(null);
      fetchAll();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao aprovar");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !user) return;
    setProcessing(true);
    try {
      const { error } = await (supabase as any)
        .from("package_deletion_requests")
        .update({
          status: "rejeitada",
          reviewed_by: user.id,
          reviewed_by_name: reviewerName,
          reviewed_at: new Date().toISOString(),
          review_notes: rejectNotes.trim() || null,
        })
        .eq("id", rejectTarget.id);
      if (error) throw error;

      toast.success("Solicitação rejeitada");
      setRejectTarget(null);
      setRejectNotes("");
      fetchAll();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao rejeitar");
    } finally {
      setProcessing(false);
    }
  };

  const hasActiveFilters = selectedBlock || selectedApartment || searchQuery;

  return (
    <DashboardLayout>
      <Helmet>
        <title>NotificaCondo - Exclusões de Encomendas</title>
      </Helmet>

      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              Exclusões de Encomendas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie solicitações de exclusão de encomendas enviadas pela portaria.
            </p>
          </div>

          {/* Status counters */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium",
                counts.pendente > 0
                  ? "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300"
                  : "border-border text-muted-foreground"
              )}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{counts.pendente}</span>
              <span className="hidden sm:inline text-muted-foreground font-normal">pendente{counts.pendente !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300 text-sm font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{counts.aprovada}</span>
              <span className="hidden sm:inline text-green-600 dark:text-green-500 font-normal">aprovada{counts.aprovada !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 text-sm font-medium">
              <XCircle className="w-3.5 h-3.5" />
              <span>{counts.rejeitada}</span>
              <span className="hidden sm:inline text-red-600 dark:text-red-500 font-normal">rejeitada{counts.rejeitada !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Filters bar */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search-query"
                placeholder="Buscar por código da encomenda ou nome do destinatário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedBlock || "__all__"}
                onValueChange={(v) => setSelectedBlock(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Bloco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os blocos</SelectItem>
                  {blockOptions.map((block) => (
                    <SelectItem key={block} value={block}>{block}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedApartment || "__all__"}
                onValueChange={(v) => setSelectedApartment(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Apartamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {apartmentOptions.map((apt) => (
                    <SelectItem key={apt} value={apt}>{apt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedBlock("");
                    setSelectedApartment("");
                    setSearchQuery("");
                  }}
                  title="Limpar filtros"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Status tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
            <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
              <TabsTrigger value="pendente" className="gap-1.5 relative">
                <AlertCircle className="w-3.5 h-3.5" />
                Pendentes
                {counts.pendente > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 text-white text-[10px] font-bold px-1">
                    {counts.pendente}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="aprovada" className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aprovadas
                <span className="ml-1 text-xs text-muted-foreground">({counts.aprovada})</span>
              </TabsTrigger>
              <TabsTrigger value="rejeitada" className="gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Rejeitadas
                <span className="ml-1 text-xs text-muted-foreground">({counts.rejeitada})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState tab={tab} hasFilters={Boolean(hasActiveFilters)} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((req) => {
                    const packageInfo = getPackageDisplayInfo(req);
                    const cfg = STATUS_CONFIG[req.status];
                    const isExpanded = expandedCard === req.id;
                    const Photo = photoByRequestId[req.id];

                    return (
                      <Card
                        key={req.id}
                        className={cn(
                          "overflow-hidden transition-all duration-200 hover:shadow-md",
                          cfg.border
                        )}
                      >
                        {/* Card Header */}
                        <CardHeader className={cn("pb-3", cfg.bg)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.iconBg)}>
                                <PackageIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-mono font-bold text-base leading-tight block truncate">
                                  {packageInfo.pickupCode}
                                </span>
                                {packageInfo.location && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                    <Building2 className="w-3 h-3" />
                                    {packageInfo.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className={cn("shrink-0 text-xs font-semibold", cfg.badge)}>
                              {req.status === "pendente" ? "Pendente" : req.status === "aprovada" ? "Aprovada" : "Rejeitada"}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pt-3">
                          {/* Recipient info */}
                          {req.package?.resident?.full_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Destinatário:</span>
                              <span className="font-medium truncate">{req.package.resident.full_name}</span>
                            </div>
                          )}

                          {/* Condominium */}
                          {packageInfo.condominiumName && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{packageInfo.condominiumName}</span>
                            </div>
                          )}

                          {/* Package details preview */}
                          {req.package && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs bg-muted/40 rounded-lg p-2.5">
                              <div>
                                <span className="text-muted-foreground">Tipo: </span>
                                <span className="font-medium">{req.package.package_type?.name || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Rastreio: </span>
                                <span className="font-mono font-medium">{req.package.tracking_code || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Recebida em: </span>
                                <span className="font-medium">
                                  {format(new Date(req.package.received_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Recebida por: </span>
                                <span className="font-medium">{req.package.received_by_name || "—"}</span>
                              </div>
                            </div>
                          )}

                          {/* Reason */}
                          <div className="rounded-lg border p-2.5 bg-muted/20">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                              Motivo da solicitação
                            </p>
                            <p className="text-sm leading-relaxed line-clamp-2">
                              {req.reason}
                            </p>
                          </div>

                          {/* Photo thumbnail */}
                          {Photo && (
                            <button
                              type="button"
                              onClick={() => setZoomedPhoto(Photo)}
                              className="w-full h-24 rounded-lg border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring relative group"
                              aria-label={`Ver foto da encomenda ${packageInfo.pickupCode}`}
                            >
                              <img
                                src={Photo}
                                alt={`Foto da encomenda ${packageInfo.pickupCode}`}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              <span>
                                {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <span>
                              Solicitado por <strong>{nameByUserId[req.requested_by] || (req.requested_by_name && !req.requested_by_name.includes("@") ? req.requested_by_name : "Porteiro")}</strong>
                            </span>
                          </div>

                          {/* Review info */}
                          {req.status !== "pendente" && req.reviewed_by_name && (
                            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                              <p>
                                Revisado por <strong>{req.reviewed_by_name}</strong>
                                {req.reviewed_at &&
                                  ` em ${format(new Date(req.reviewed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                              </p>
                              {req.review_notes && (
                                <p className="italic mt-0.5 text-muted-foreground/80">
                                  "{req.review_notes}"
                                </p>
                              )}
                            </div>
                          )}

                          {/* Action buttons */}
                          {req.status === "pendente" && (
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                onClick={() => setApproveTarget(req)}
                                className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectTarget(req)}
                                className="flex-1 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Rejeitar
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Approve confirm */}
      <AlertDialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Aprovar exclusão?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A encomenda <strong>{approveTarget ? getPackageDisplayInfo(approveTarget).pickupCode : "—"}</strong> será
              removida definitivamente. A solicitação ficará preservada para auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processing ? "Processando..." : "Sim, aprovar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => {
        if (!o) {
          setRejectTarget(null);
          setRejectNotes("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Rejeitar solicitação
            </DialogTitle>
            <DialogDescription>
              Adicione uma observação (opcional) explicando o motivo da rejeição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notes">Observação</Label>
            <Textarea
              id="notes"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Ex.: encomenda ainda em uso pela portaria..."
            />
            <p className="text-xs text-muted-foreground text-right">{rejectNotes.length}/500</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectNotes("");
              }}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? "Processando..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zoom photo modal */}
      <Dialog open={!!zoomedPhoto} onOpenChange={(o) => !o && setZoomedPhoto(null)}>
        <DialogContent className="max-w-3xl p-1 md:p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização da foto</DialogTitle>
          </DialogHeader>
          {zoomedPhoto && (
            <img
              src={zoomedPhoto}
              alt="Foto ampliada da encomenda"
              className="w-full h-auto max-h-[80vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function EmptyState({
  tab,
  hasFilters,
}: {
  tab: Status;
  hasFilters: boolean;
}) {
  const cfg = STATUS_CONFIG[tab];
  const Icon = cfg.icon;

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4", cfg.iconBg)}>
          <Search className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-base text-foreground mb-1">
          Nenhum resultado encontrado
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Tente ajustar os filtros ou buscar por outros termos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4", cfg.iconBg)}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-semibold text-base text-foreground mb-1">{cfg.emptyTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{cfg.emptyDesc}</p>
    </div>
  );
}
