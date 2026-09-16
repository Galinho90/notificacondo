import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Package, PackagePlus, Search, PackageCheck, X, Building2, Loader2, CheckCircle2, Bell, ArrowRight, PackageOpen, ShieldCheck } from "lucide-react";
import SubscriptionGate from "@/components/sindico/SubscriptionGate";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      setSearchError("Digite de 3 a 6 dígitos");
      return;
    }

    if (!/^\d+$/.test(code)) {
      setSearchError("Digite apenas números");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const blockCode = code.substring(0, 2);
      const apartmentCode = code.substring(2);

      const { data: blocksData, error: blocksError } = await supabase
        .from("blocks")
        .select("id, name, condominium_id, condominiums(name)")
        .in("condominium_id", condominiumIds);

      if (blocksError) throw blocksError;

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

      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from("apartments")
        .select("id, number")
        .eq("block_id", matchedBlock.id);

      if (apartmentsError) throw apartmentsError;

      const matchedApartment = apartmentsData?.find((apt) => {
        const aptNumber = apt.number.replace(/\D/g, "");
        return aptNumber === apartmentCode ||
               aptNumber.padStart(2, "0") === apartmentCode.padStart(2, "0");
      });

      if (!matchedApartment) {
        setSearchError(`Apto "${apartmentCode}" não encontrado no ${matchedBlock.name}`);
        setIsSearching(false);
        return;
      }

      const condoData = matchedBlock.condominiums as { name: string } | null;
      setSelectedApartment({
        id: matchedApartment.id,
        number: matchedApartment.number,
        blockId: matchedBlock.id,
        blockName: matchedBlock.name,
        condominiumId: matchedBlock.condominium_id,
        condominiumName: condoData?.name || "",
      });

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

  const handleConfirmPickup = async (pickedUpByName: string, code: string) => {
    if (!selectedPackage || !user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    try {
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
              "Código incorreto. Confirme com o morador.",
            already_picked_up: "Encomenda já retirada.",
            not_found: "Encomenda não encontrada.",
          };
          return {
            success: false,
            reason: result.reason,
            error: result.message ?? messages[result.reason ?? ""] ?? "Não foi possível confirmar.",
          };
        }

        toast({
          title: "Retirada confirmada!",
          description: `Encomenda retirada por ${pickedUpByName}.`,
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

      const { data: verifyData, error: verifyError } = await supabase
        .from("packages")
        .select("id, status")
        .eq("id", selectedPackage.id)
        .maybeSingle();

      if (verifyError || !verifyData) {
        return { success: false, error: "Não foi possível confirmar." };
      }

      if (verifyData.status !== "retirada") {
        return {
          success: false,
          reason: "db_mismatch",
          error: "Banco não registrou. Tente novamente.",
        };
      }

      toast({
        title: "Retirada confirmada!",
        description: `Encomenda retirada por ${pickedUpByName}.`,
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
      return { success: false, error: "Erro ao confirmar" };
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
      setNotificationErrorMessage("Não foi possível reenviar. Tente novamente.");
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

  const inputLength = searchCode.length;
  const isValidFormat = inputLength >= 4 && inputLength <= 6;

  return (
    <DashboardLayout>
      <SubscriptionGate>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                Encomendas
              </h1>
              <p className="text-muted-foreground text-sm">Gerencie as encomendas recebidas</p>
            </div>
            <Button
              onClick={() => navigate("/porteiro/registrar")}
              className="gap-2"
            >
              <PackagePlus className="w-4 h-4" />
              Nova Encomenda
            </Button>
          </div>

          {/* Search Card */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Digite o código da unidade (ex: 0344)"
                    value={searchCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setSearchCode(val);
                      setSearchError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className={`pl-12 pr-20 h-14 text-lg font-medium tracking-wide transition-all ${
                      searchError 
                        ? 'border-destructive ring-1 ring-destructive/30 bg-destructive/5' 
                        : isValidFormat 
                          ? 'border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-400/30' 
                          : inputLength > 0 
                            ? 'border-amber-400/50' 
                            : 'border-border'
                    }`}
                    maxLength={6}
                  />
                  
                  {/* Character counter + validation */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    {searchCode.length > 0 && (
                      <span className={`text-sm font-medium transition-colors ${
                        searchError ? 'text-destructive' : 
                        isValidFormat ? 'text-emerald-500' : 
                        inputLength < 4 ? 'text-amber-500' : 'text-muted-foreground'
                      }`}>
                        {inputLength}/6
                      </span>
                    )}
                    {searchCode.length >= 4 && !searchError && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                </div>

                {/* Error message */}
                {searchError && (
                  <p className="text-sm text-destructive flex items-center gap-2 pl-1">
                    <X className="w-4 h-4" />
                    {searchError}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || inputLength < 3}
                    className="h-11 px-6 gap-2"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Buscar
                  </Button>
                  {selectedApartment && (
                    <Button
                      variant="outline"
                      onClick={clearSearch}
                      className="h-11 px-4 gap-2 text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Selected apartment info */}
                {selectedApartment && (
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">
                          {selectedApartment.blockName} — {selectedApartment.number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedApartment.condominiumName}
                        </p>
                      </div>
                      {pendingCount > 0 && (
                        <Badge variant="default" className="gap-1.5 px-3 py-1.5">
                          <Package className="w-4 h-4" />
                          {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Empty state */}
          {!selectedApartment && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <PackageOpen className="w-10 h-10 text-primary/60" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Busque uma unidade</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Digite o código do apartamento para visualizar as encomendas.
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                  <span className="font-mono font-semibold text-foreground">0344</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>Bloco 03, Apto 44</span>
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
                {loading ? (
                  renderSkeletons()
                ) : packages.length === 0 ? (
                  renderEmptyState(
                    "Tudo entregue!",
                    "Este apartamento não possui encomendas pendentes.",
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
                {loading ? (
                  renderSkeletons()
                ) : packages.length === 0 ? (
                  renderEmptyState(
                    "Nenhuma retirada",
                    "Encomendas retiradas aparecerão aqui.",
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
                {loading ? (
                  renderSkeletons()
                ) : packages.length === 0 ? (
                  renderEmptyState(
                    "Nenhuma encomenda",
                    "Este apartamento ainda não recebeu encomendas.",
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

        {/* Pickup Dialog */}
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
                  <p className="text-sm text-muted-foreground">Enviando...</p>
                </div>
              )}
              {notificationModalState === "success" && (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <p className="font-semibold">Enviado!</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {notificationSuccessCount} notificação(ões) reenviada(s).
                  </p>
                </div>
              )}
              {notificationModalState === "error" && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                    <X className="w-6 h-6 text-destructive" />
                  </div>
                  <p className="font-semibold text-destructive">Erro</p>
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
