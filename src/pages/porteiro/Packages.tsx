import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Package, PackagePlus, Search, PackageCheck, X, Building2, Loader2, CheckCircle2, Bell, HelpCircle, ArrowRight, PackageOpen, ShieldCheck, Hash } from "lucide-react";
import SubscriptionGate from "@/components/sindico/SubscriptionGate";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PackageCard } from "@/components/packages/PackageCard";
import { PackagePickupDialog } from "@/components/packages/PackagePickupDialog";
import { PackageDetailsDialog } from "@/components/packages/PackageDetailsDialog";
import { Package as PackageType } from "@/hooks/usePackages";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSignedPackagePhotoUrl } from "@/lib/packageStorage";
import { usePackageNotificationStatus } from "@/hooks/usePackageNotificationStatus";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Extended type for packages with signed URLs
interface PackageWithSignedUrl extends PackageType {
  signedPhotoUrl?: string;
}

interface ApartmentInfo {
  id: string;
  number: string;
  blockId: string;
  blockName: string;
  condominiumId: string;
  condominiumName: string;
}

export default function PorteiroPackages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [condominiumIds, setCondominiumIds] = useState<string[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentInfo | null>(null);

  const PAGE_SIZE = 6;
  const [packages, setPackages] = useState<PackageWithSignedUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<"pendente" | "retirada" | "all">("pendente");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [selectedPackage, setSelectedPackage] = useState<PackageWithSignedUrl | null>(null);
  const [isPickupDialogOpen, setIsPickupDialogOpen] = useState(false);
  const [detailsPackage, setDetailsPackage] = useState<PackageWithSignedUrl | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Notification delivery statuses for cards
  const packageIds = packages.map((p) => p.id);
  const { statusMap: notificationStatusMap, dataMap: notificationDataMap } = usePackageNotificationStatus(packageIds);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationModalState, setNotificationModalState] = useState<"loading" | "success" | "error">("loading");
  const [notificationSuccessCount, setNotificationSuccessCount] = useState(0);
  const [notificationErrorMessage, setNotificationErrorMessage] = useState("");

  // Fetch porter's condominiums
  useEffect(() => {
    const fetchCondominiums = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("user_condominiums")
        .select("condominium_id")
        .eq("user_id", user.id);

      if (data) {
        setCondominiumIds(data.map((uc) => uc.condominium_id));
      }
    };

    fetchCondominiums();
  }, [user]);

  // Fetch packages for the selected apartment, filtered/paginated on the server
  const fetchPackages = useCallback(
    async (
      apartmentId: string,
      tab: "pendente" | "retirada" | "all",
      pageIndex: number,
      append = false,
    ) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // IMPORTANTE: `pickup_code` NUNCA é selecionado aqui — o porteiro não
        // pode ter acesso ao código de retirada por nenhum meio (tela, modal
        // ou resposta de rede). A conferência acontece somente no servidor.
        let query = supabase
          .from("packages")
          .select(
            `
              id, condominium_id, block_id, apartment_id, resident_id,
              received_by, received_by_name, description, photo_url, status,
              received_at, picked_up_at, picked_up_by, picked_up_by_name,
              created_at, deleted_at, tracking_code, package_type_id,
              notification_sent, notification_sent_at, notification_count,
              apartment:apartments(id, number),
              block:blocks(id, name),
              condominium:condominiums(id, name),
              package_type:package_types(id, name, icon)
            `
          )
          .eq("apartment_id", apartmentId)
          .order("received_at", { ascending: false });

        if (tab !== "all") {
          query = query.eq("status", tab);
        }

        // Paginação apenas para abas não-pendentes
        if (tab !== "pendente") {
          query = query.range(from, to);
        }

        const { data, error } = await query;
        if (error) throw error;

        const packagesWithSignedUrls = await Promise.all(
          (data || []).map(async (pkg) => {
            const signedPhotoUrl = await getSignedPackagePhotoUrl(pkg.photo_url);
            return {
              ...pkg,
              // Placeholder: o código real nunca chega ao cliente da portaria.
              pickup_code: "",
              signedPhotoUrl: signedPhotoUrl || pkg.photo_url,
            } as PackageWithSignedUrl;
          })
        );

        setHasMore(tab !== "pendente" && (data?.length || 0) === PAGE_SIZE);
        setPackages((prev) =>
          append ? [...prev, ...packagesWithSignedUrls] : packagesWithSignedUrls
        );
      } catch (error) {
        console.error("Error fetching packages:", error);
        toast({
          title: "Erro ao buscar encomendas",
          description: "Não foi possível carregar as encomendas",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [toast]
  );

  // Lightweight count of pending packages for the tab badge
  const fetchPendingCount = useCallback(async (apartmentId: string) => {
    const { count } = await supabase
      .from("packages")
      .select("id", { count: "exact", head: true })
      .eq("apartment_id", apartmentId)
      .eq("status", "pendente");
    setPendingCount(count || 0);
  }, []);

  // Search apartment by code (BBAA format)
  const handleSearch = async () => {
    if (condominiumIds.length === 0) {
      setSearchError("Nenhum condomínio vinculado");
      return;
    }

    const code = searchCode.trim();
    if (code.length < 3 || code.length > 6) {
      setSearchError("Digite de 3 a 6 dígitos (ex: 0344)");
      return;
    }

    if (!/^\d+$/.test(code)) {
      setSearchError("Digite apenas números");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      // Parse code - first 2 digits = block, rest = apartment
      const blockCode = code.substring(0, 2);
      const apartmentCode = code.substring(2);

      // Search for blocks in user's condominiums
      const { data: blocksData, error: blocksError } = await supabase
        .from("blocks")
        .select("id, name, condominium_id, condominiums(name)")
        .in("condominium_id", condominiumIds);

      if (blocksError) throw blocksError;

      // Find block that matches the code
      const matchedBlock = blocksData?.find((block) => {
        const blockName = block.name.toLowerCase();
        const numericPart = blockName.replace(/\D/g, "");
        return numericPart === blockCode ||
               numericPart.padStart(2, "0") === blockCode ||
               blockCode === numericPart.padStart(2, "0");
      });

      if (!matchedBlock) {
        setSearchError(`Bloco "${blockCode}" não encontrado`);
        setIsSearching(false);
        return;
      }

      // Search for apartment in that block
      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from("apartments")
        .select("id, number")
        .eq("block_id", matchedBlock.id);

      if (apartmentsError) throw apartmentsError;

      // Find apartment that matches
      const matchedApartment = apartmentsData?.find((apt) => {
        const aptNumber = apt.number.replace(/\D/g, "");
        return aptNumber === apartmentCode ||
               aptNumber.padStart(2, "0") === apartmentCode.padStart(2, "0");
      });

      if (!matchedApartment) {
        setSearchError(`Apartamento "${apartmentCode}" não encontrado no ${matchedBlock.name}`);
        setIsSearching(false);
        return;
      }

      // Set selected apartment
      const condoData = matchedBlock.condominiums as { name: string } | null;
      setSelectedApartment({
        id: matchedApartment.id,
        number: matchedApartment.number,
        blockId: matchedBlock.id,
        blockName: matchedBlock.name,
        condominiumId: matchedBlock.condominium_id,
        condominiumName: condoData?.name || "",
      });

      // Fetch packages for this apartment (reset to first page)
      setPage(0);
      await Promise.all([
        fetchPackages(matchedApartment.id, activeTab, 0, false),
        fetchPendingCount(matchedApartment.id),
      ]);
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Erro na busca");
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchCode("");
    setSearchError("");
    setSelectedApartment(null);
    setPackages([]);
  };

  const handlePackageClick = (pkg: PackageWithSignedUrl) => {
    if (pkg.status === "pendente") {
      setSelectedPackage(pkg);
      setIsPickupDialogOpen(true);
    }
  };

  const handleViewDetails = (pkg: PackageWithSignedUrl) => {
    setDetailsPackage(pkg);
    setIsDetailsDialogOpen(true);
  };

  /**
   * Confirma a retirada. O código digitado é conferido exclusivamente no
   * servidor (`confirm_package_pickup_debug`), de modo que o código correto
   * nunca precisa — nem pode — estar disponível na portaria.
   * 
   * Tentativas em ordem:
   * 1. RPC confirm_package_pickup_debug (com logs de debug no servidor)
   * 2. Update direto + verificação do status persistido
   */
  const handleConfirmPickup = async (pickedUpByName: string, code: string) => {
    if (!selectedPackage || !user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    try {
      // Tentativa 1: RPC nova com debug (confirm_package_pickup_debug)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "confirm_package_pickup_debug" as any,
        {
          p_package_id: selectedPackage.id,
          p_code: code,
          p_picked_up_by: user.id,
          p_picked_up_by_name: pickedUpByName,
        }
      );

      if (!rpcError && rpcData) {
        const result = rpcData as { success?: boolean; reason?: string; message?: string };

        if (!result.success) {
          const messages: Record<string, string> = {
            invalid_code:
              "Código de retirada incorreto. Peça ao morador o código recebido por WhatsApp.",
            already_picked_up: "Esta encomenda já foi retirada.",
            not_found: "Encomenda não encontrada.",
          };
          return {
            success: false,
            reason: result.reason,
            error: result.message ?? messages[result.reason ?? ""] ?? "Não foi possível confirmar a retirada.",
          };
        }

        toast({
          title: "Encomenda retirada!",
          description: `Encomenda baixada do sistema. Retirada por ${pickedUpByName}.`,
        });

        if (selectedApartment) {
          setPage(0);
          await Promise.all([
            fetchPackages(selectedApartment.id, activeTab, 0, false),
            fetchPendingCount(selectedApartment.id),
          ]);
        }

        setSelectedPackage(null);
        return { success: true };
      }

      // Tentativa 2: update direto + verificação do status
      console.warn(
        "confirm_package_pickup_debug não disponível, usando update direto:"
      );
      if (rpcError) {
        console.warn("RPC error (tentando fallback):", rpcError.message);
      }

      const { error: updateError } = await supabase
        .from("packages")
        .update({
          status: "retirada" as const,
          picked_up_at: new Date().toISOString(),
          picked_up_by: user.id,
          picked_up_by_name: pickedUpByName,
        })
        .eq("id", selectedPackage.id);

      if (updateError) throw updateError;

      // Verifica se o banco realmente persistiu
      const { data: verifyData, error: verifyError } = await supabase
        .from("packages")
        .select("id, status")
        .eq("id", selectedPackage.id)
        .maybeSingle();

      if (verifyError || !verifyData) {
        return { success: false, error: "Não foi possível confirmar a retirada." };
      }

      if (verifyData.status !== "retirada") {
        return {
          success: false,
          reason: "db_mismatch",
          error:
            "O banco não registrou a retirada. Verifique as permissões (RLS) e tente novamente.",
        };
      }

      toast({
        title: "Encomenda retirada!",
        description: `Encomenda baixada do sistema. Retirada por ${pickedUpByName}.`,
      });

      if (selectedApartment) {
        setPage(0);
        await Promise.all([
          fetchPackages(selectedApartment.id, activeTab, 0, false),
          fetchPendingCount(selectedApartment.id),
        ]);
      }

      setSelectedPackage(null);
      return { success: true };
    } catch (error) {
      console.error("Error marking pickup:", error);
      return { success: false, error: "Erro ao confirmar retirada" };
    }
  };

  const handleResendNotification = async (pkg: PackageWithSignedUrl) => {
    setNotificationModalState("loading");
    setIsNotificationModalOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-package-arrival", {
        body: {
          package_id: pkg.id,
          apartment_id: pkg.apartment_id,
          // pickup_code omitido de propósito: resolvido no servidor.
          photo_url: pkg.photo_url,
        },
      });

      if (error) throw error;

      const count = data?.notifications_sent ?? 1;
      setNotificationSuccessCount(count);
      setNotificationModalState("success");

      if (selectedApartment) {
        await fetchPackages(selectedApartment.id, activeTab, page, false);
      }
    } catch (error) {
      console.error("Error resending notification:", error);
      setNotificationErrorMessage("Não foi possível reenviar a notificação. Tente novamente.");
      setNotificationModalState("error");
    }
  };

  // Refetch when tab changes
  useEffect(() => {
    if (!selectedApartment) return;
    setPage(0);
    fetchPackages(selectedApartment.id, activeTab, 0, false);
  }, [activeTab, selectedApartment, fetchPackages]);

  const handleLoadMore = () => {
    if (!selectedApartment || loadingMore) return;
    const next = page + 1;
    setPage(next);
    fetchPackages(selectedApartment.id, activeTab, next, true);
  };

  // Helper to render loading skeletons
  const renderSkeletons = (count = 3) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-0 overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </Card>
      ))}
    </div>
  );

  // Helper to render empty state
  const renderEmptyState = (title: string, description: string, icon: React.ReactNode) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <SubscriptionGate>
        <div className="space-y-6">
          {/* Header com instruções */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                Encomendas
              </h1>
              <p className="text-muted-foreground text-sm">
                Gerencie as encomendas recebidas na portaria
              </p>
            </div>
            <Button
              onClick={() => navigate("/porteiro/registrar")}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/25"
            >
              <PackagePlus className="w-4 h-4" />
              Nova Encomenda
            </Button>
          </div>

          {/* Card de Busca */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-5 border-b border-border/50">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Buscar Apartamento</h2>
                  <p className="text-xs text-muted-foreground">Localize a unidade para gerenciar encomendas</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Layout em grid: busca rápida + instruções */}
              <div className="grid gap-6 lg:grid-cols-5">
                {/* Coluna principal: busca por código */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="search-code" className="text-sm font-medium flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                        Código da Unidade
                      </Label>
                      <span className={`text-xs font-mono transition-colors ${
                        searchCode.length === 0 ? 'text-muted-foreground' :
                        searchCode.length < 4 ? 'text-amber-500' :
                        searchCode.length >= 4 && searchCode.length <= 6 ? 'text-emerald-500' :
                        'text-muted-foreground'
                      }`}>
                        {searchCode.length}/6
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1 group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                          <Search className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <Input
                          id="search-code"
                          placeholder="0344"
                          value={searchCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setSearchCode(val);
                            setSearchError("");
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                          className={`pl-10 pr-16 font-mono text-xl tracking-[0.3em] text-center h-12 transition-all ${
                            searchError ? 'border-destructive ring-1 ring-destructive/30' :
                            searchCode.length >= 4 && searchCode.length <= 6 ? 'border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-400/30' :
                            searchCode.length > 0 ? 'border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/10' :
                            ''
                          }`}
                          maxLength={6}
                        />
                        {/* Preview visual do código */}
                        {searchCode.length > 0 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-6 rounded-sm border transition-all ${
                                  i < searchCode.length
                                    ? searchError
                                      ? 'bg-destructive/20 border-destructive'
                                      : searchCode.length >= 4
                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400'
                                        : 'bg-amber-100 dark:bg-amber-900/40 border-amber-400'
                                    : 'bg-muted border-border'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleSearch}
                        disabled={isSearching || searchCode.length < 3}
                        className="h-12 px-5 gap-2 bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            Buscar
                          </>
                        )}
                      </Button>
                      {selectedApartment && (
                        <Button
                          variant="outline"
                          onClick={clearSearch}
                          className="h-12 px-3 gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Feedback de erro ou dica */}
                    {searchError ? (
                      <p className="text-sm text-destructive flex items-center gap-1.5 font-medium">
                        <X className="w-3.5 h-3.5" />
                        {searchError}
                      </p>
                    ) : (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono px-1.5 py-0.5 rounded ${
                            searchCode.length >= 2 && searchCode.length <= 6 ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted'
                          }`}>34</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>Bloco</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono px-1.5 py-0.5 rounded ${
                            searchCode.length >= 4 ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted'
                          }`}>44</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>Apartamento</span>
                        </div>
                        {searchCode.length < 3 && searchCode.length > 0 && (
                          <span className="ml-auto text-amber-500 animate-pulse">
                            Digite mais {3 - searchCode.length} dígito(s)...
                          </span>
                        )}
                        {searchCode.length >= 4 && searchCode.length <= 6 && (
                          <span className="ml-auto text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Formato válido — pressione Enter
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna lateral: instruções visuais */}
                <div className="lg:col-span-2 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Como funciona</p>
                  <div className="space-y-2.5">
                    {[
                      { step: 1, label: 'Digite o código', sub: 'Ex: Bloco 03 + Apto 44 = 0344', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
                      { step: 2, label: 'Veja as encomendas', sub: 'Pendentes e histórico em um lugar', color: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800' },
                      { step: 3, label: 'Confirme a retirada', sub: 'Código sigiloso — morador informa', color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
                    ].map((item) => (
                      <div key={item.step} className={`flex items-center gap-3 p-2.5 rounded-lg border ${item.color}`}>
                        <div className="w-7 h-7 rounded-full bg-background border flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">{item.step}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Informações do apartamento selecionado */}
              {selectedApartment && (
                <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
                  <div className="flex flex-col gap-3 p-4 bg-gradient-to-r from-primary/8 via-primary/5 to-primary/8 border border-primary/20 rounded-xl sm:flex-row sm:items-center">
                    <div className="w-14 h-14 bg-primary/12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                      <Building2 className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg leading-tight">
                        {selectedApartment.blockName} — {selectedApartment.number}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {selectedApartment.condominiumName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge
                        variant={pendingCount > 0 ? "default" : "secondary"}
                        className={`gap-1.5 text-sm px-3.5 py-1.5 ${
                          pendingCount > 0 ? 'bg-primary/15 text-primary border-primary/25 hover:bg-primary/20' : ''
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>

                  {/* Aviso de segurança */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/40 backdrop-blur-sm">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-0.5">Código de retirada sigiloso</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Por segurança, o código não fica visível na portaria. Peça ao morador — a conferência é feita automaticamente pelo sistema ao confirmar a retirada.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estado inicial - antes de buscar */}
          {!selectedApartment && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <PackageOpen className="w-10 h-10 text-primary/60" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Busque uma unidade</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Digite o código do apartamento acima para visualizar as encomendas recebidas, registrar retiradas e muito mais.
                </p>
                
                {/* Exemplo visual */}
                <div className="bg-muted/50 rounded-lg p-4 text-left w-full max-w-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Exemplo de código:</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-lg px-3 py-2">
                      <span className="font-mono font-bold text-primary">0344</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">Bloco 03</p>
                      <p className="text-muted-foreground">Apto 44</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs section */}
          {selectedApartment && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="pendente" className="gap-1.5 relative">
                  <Package className="w-4 h-4" />
                  Pendentes
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 justify-center text-[10px]">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="retirada" className="gap-1.5">
                  <PackageCheck className="w-4 h-4" />
                  Retiradas
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-1.5">
                  <Bell className="w-4 h-4" />
                  Todas
                </TabsTrigger>
              </TabsList>

              {/* Tab: Pendentes */}
              <TabsContent value="pendente" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Encomendas aguardando retirada
                  </h3>
                </div>
                
                {loading ? (
                  renderSkeletons()
                ) : packages.length === 0 ? (
                  renderEmptyState(
                    "Tudo entregue!",
                    "Este apartamento não possui encomendas pendentes de retirada.",
                    <PackageCheck className="w-8 h-8 text-muted-foreground" />
                  )
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {packages.map((pkg) => (
                      <PackageCard
                        key={pkg.id}
                        id={pkg.id}
                        photoUrl={pkg.signedPhotoUrl || pkg.photo_url}
                        pickupCode={pkg.pickup_code}
                        status={pkg.status}
                        apartmentNumber={pkg.apartment?.number || ""}
                        blockName={pkg.block?.name || ""}
                        condominiumName={pkg.condominium?.name}
                        condominiumId={pkg.condominium_id || undefined}
                        receivedAt={pkg.received_at}
                        description={pkg.description || undefined}
                        notificationStatus={notificationStatusMap[pkg.id]}
                        notificationTimestamps={notificationDataMap[pkg.id]?.timestamps}
                        onClick={() => handlePackageClick(pkg)}
                        onViewDetails={() => handleViewDetails(pkg)}
                        onResendNotification={() => handleResendNotification(pkg)}
                        canRequestDeletion={false}
                        showPickupCode={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Retiradas */}
              <TabsContent value="retirada" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Histórico de encomendas retiradas
                  </h3>
                </div>
                
                {loading ? (
                  renderSkeletons()
                ) : packages.length === 0 ? (
                  renderEmptyState(
                    "Nenhuma retirada registrada",
                    "Quando uma encomenda for retirada, ela aparecerá aqui.",
                    <Package className="w-8 h-8 text-muted-foreground" />
                  )
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {packages.map((pkg) => (
                        <PackageCard
                          key={pkg.id}
                          id={pkg.id}
                          photoUrl={pkg.signedPhotoUrl || pkg.photo_url}
                          pickupCode={pkg.pickup_code}
                          status={pkg.status}
                          apartmentNumber={pkg.apartment?.number || ""}
                          blockName={pkg.block?.name || ""}
                          condominiumName={pkg.condominium?.name}
                          condominiumId={pkg.condominium_id || undefined}
                          receivedAt={pkg.received_at}
                          description={pkg.description || undefined}
                          onClick={() => handleViewDetails(pkg)}
                          onViewDetails={() => handleViewDetails(pkg)}
                          canRequestDeletion={false}
                          showPickupCode={false}
                        />
                      ))}
                    </div>
                    {hasMore && packages.length > 0 && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="gap-2"
                        >
                          {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                          Carregar mais
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Tab: Todas */}
              <TabsContent value="all" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Todas as encomendas deste apartamento
                  </h3>
                </div>
                
                {loading ? (
                  renderSkeletons()
                ) : packages.length === 0 ? (
                  renderEmptyState(
                    "Nenhuma encomenda encontrada",
                    "Este apartamento ainda não recebeu nenhuma encomenda.",
                    <Bell className="w-8 h-8 text-muted-foreground" />
                  )
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {packages.map((pkg) => (
                        <PackageCard
                          key={pkg.id}
                          id={pkg.id}
                          photoUrl={pkg.signedPhotoUrl || pkg.photo_url}
                          pickupCode={pkg.pickup_code}
                          status={pkg.status}
                          apartmentNumber={pkg.apartment?.number || ""}
                          blockName={pkg.block?.name || ""}
                          condominiumName={pkg.condominium?.name}
                          condominiumId={pkg.condominium_id || undefined}
                          receivedAt={pkg.received_at}
                          description={pkg.description || undefined}
                          notificationStatus={notificationStatusMap[pkg.id]}
                          notificationTimestamps={notificationDataMap[pkg.id]?.timestamps}
                          onClick={() => pkg.status === "pendente" ? handlePackageClick(pkg) : handleViewDetails(pkg)}
                          onViewDetails={() => handleViewDetails(pkg)}
                          onResendNotification={pkg.status === "pendente" ? () => handleResendNotification(pkg) : undefined}
                          canRequestDeletion={false}
                          showPickupCode={false}
                        />
                      ))}
                    </div>
                    {hasMore && packages.length > 0 && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="gap-2"
                        >
                          {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                          Carregar mais
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Pickup Dialog — código nunca exibido e conferido no servidor */}
        <PackagePickupDialog
          open={isPickupDialogOpen}
          onOpenChange={setIsPickupDialogOpen}
          package_={selectedPackage}
          onConfirm={handleConfirmPickup}
          revealPickupCode={false}
          serverValidation
        />

        {/* Details Dialog */}
        <PackageDetailsDialog
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          package_={detailsPackage}
          showPickupCode={false}
        />

        {/* Notification Modal */}
        <Dialog open={isNotificationModalOpen} onOpenChange={setIsNotificationModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reenviar Notificação</DialogTitle>
              <DialogDescription />
            </DialogHeader>
            <div className="py-4">
              {notificationModalState === "loading" && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Enviando notificação...</p>
                </div>
              )}
              {notificationModalState === "success" && (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <p className="font-semibold">Notificação enviada!</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {notificationSuccessCount} notificação(ões) reenviada(s) com sucesso.
                  </p>
                </div>
              )}
              {notificationModalState === "error" && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                    <X className="w-6 h-6 text-destructive" />
                  </div>
                  <p className="font-semibold text-destructive">Erro ao enviar</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {notificationErrorMessage}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SubscriptionGate>
    </DashboardLayout>
  );
}
