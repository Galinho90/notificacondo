import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Package, PackagePlus, Search, PackageCheck, X, Building2, Loader2, CheckCircle2, Bell, HelpCircle, ArrowRight, PackageOpen } from "lucide-react";
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
import { PackageStatus } from "@/lib/packageConstants";
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
              *,
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
              signedPhotoUrl: signedPhotoUrl || pkg.photo_url,
            };
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

  const handleConfirmPickup = async (pickedUpByName: string) => {
    if (!selectedPackage || !user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    try {
      // Usa RPC para garantir que o timestamp seja do servidor
      const { error } = await supabase.rpc('confirm_package_pickup' as any, {
        p_package_id: selectedPackage.id,
        p_picked_up_by: user.id,
        p_picked_up_by_name: pickedUpByName,
      });

      if (error) {
        // Fallback para update direto se RPC não existir
        const { error: updateError } = await supabase
          .from("packages")
          .update({
            status: "retirada" as PackageStatus,
            picked_up_at: new Date().toISOString(),
            picked_up_by: user.id,
            picked_up_by_name: pickedUpByName,
          })
          .eq("id", selectedPackage.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Encomenda retirada!",
        description: `Encomenda baixada do sistema. Retirada por ${pickedUpByName}.`,
      });

      // Refresh packages
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
          pickup_code: pkg.pickup_code,
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
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Buscar Apartamento
              </CardTitle>
              <CardDescription className="text-xs">
                Digite o código da unidade para ver suas encomendas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="search-code" className="text-sm font-medium">
                    Código da unidade
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="search-code"
                        placeholder="Ex: 0344 (Bloco 03, Apto 44)"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-10 font-mono text-center tracking-widest"
                        maxLength={6}
                      />
                    </div>
                    <Button onClick={handleSearch} disabled={isSearching} className="gap-2 min-w-[100px]">
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
                      <Button variant="ghost" onClick={clearSearch} className="gap-2 text-muted-foreground px-3">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {searchError ? (
                    <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                      <X className="w-3.5 h-3.5" />
                      {searchError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Os 2 primeiros dígitos = bloco | os restantes = apartamento
                    </p>
                  )}
                </div>
              </div>

              {/* Informações do apartamento selecionado */}
              {selectedApartment && (
                <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">
                      {selectedApartment.blockName} - {selectedApartment.number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedApartment.condominiumName}
                    </p>
                  </div>
                  <Badge 
                    variant={pendingCount > 0 ? "default" : "secondary"} 
                    className="gap-1.5 text-sm px-3 py-1.5"
                  >
                    <Package className="w-4 h-4" />
                    {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                  </Badge>
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

        {/* Pickup Dialog */}
        <PackagePickupDialog
          open={isPickupDialogOpen}
          onOpenChange={setIsPickupDialogOpen}
          package_={selectedPackage}
          onConfirm={handleConfirmPickup}
        />

        {/* Details Dialog */}
        <PackageDetailsDialog
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          package_={detailsPackage}
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
