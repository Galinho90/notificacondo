import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Package, PackagePlus, Search, PackageCheck, X, Building2, Loader2, CheckCircle2, MapPin, Bell } from "lucide-react";
import SubscriptionGate from "@/components/sindico/SubscriptionGate";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

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
  
  const PAGE_SIZE = 3;
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

  const handlePackageClick = (pkg: PackageType) => {
    if (pkg.status === "pendente") {
      setSelectedPackage(pkg);
      setIsPickupDialogOpen(true);
    }
  };

  const handleViewDetails = (pkg: PackageType) => {
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

      if (error) throw error;

      toast({
        title: "Encomenda retirada!",
        description: `Encomenda baixada do sistema corretamente. Retirada por ${pickedUpByName}.`,
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

  const filteredPackages = packages;

  const handleLoadMore = () => {
    if (!selectedApartment || loadingMore) return;
    const next = page + 1;
    setPage(next);
    fetchPackages(selectedApartment.id, activeTab, next, true);
  };


  return (
    <DashboardLayout>
      <SubscriptionGate>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Encomendas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Busque por unidade para gerenciar as encomendas
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

        {/* Search Card */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Search className="w-4 h-4 text-primary" />
                Buscar Unidade
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm hidden sm:inline">Bloco + Apto</span>
                  </div>
                  <Input
                    placeholder="Ex: 0344"
                    value={searchCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setSearchCode(val);
                      setSearchError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    disabled={isSearching}
                    className={cn(
                      "pl-10 sm:pl-28 h-12 text-base font-mono tracking-wider",
                      searchError ? "border-destructive ring-1 ring-destructive/20" : "focus:ring-2 focus:ring-primary/20"
                    )}
                    maxLength={6}
                  />
                  {searchCode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted"
                      onClick={clearSearch}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !searchCode}
                  className="h-12 px-6 gap-2"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Buscar</span>
                </Button>
              </div>
              
              {searchError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-destructive" />
                  {searchError}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Apartment Display */}
        {selectedApartment && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent shadow-md">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg uppercase">
                        {selectedApartment.blockName} - APTO {selectedApartment.number}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {selectedApartment.condominiumName}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {pendingCount > 0 ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}` : 'Nenhuma pendente'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearSearch}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Trocar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Packages List - Only shown when apartment is selected */}
        {selectedApartment && (
          <>
            {/* Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 rounded-lg">
                  <TabsTrigger 
                    value="pendente" 
                    className={cn(
                      "gap-2 py-2.5 px-4 rounded-md transition-all",
                      activeTab === "pendente" && "bg-background shadow-sm"
                    )}
                  >
                    <Package className="w-4 h-4" />
                    <span className="hidden sm:inline">Pendentes</span>
                    {pendingCount > 0 && (
                      <Badge 
                        variant="default" 
                        className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-500 hover:bg-yellow-600"
                      >
                        {pendingCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="retirada" 
                    className={cn(
                      "gap-2 py-2.5 px-4 rounded-md transition-all",
                      activeTab === "retirada" && "bg-background shadow-sm"
                    )}
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Retiradas</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="all"
                    className={cn(
                      "py-2.5 px-4 rounded-md transition-all",
                      activeTab === "all" && "bg-background shadow-sm"
                    )}
                  >
                    Todas
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-72 rounded-xl" />
                  ))}
                </div>
              ) : filteredPackages.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      {activeTab === "pendente" ? (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      ) : activeTab === "retirada" ? (
                        <PackageCheck className="w-8 h-8 text-muted-foreground" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      {activeTab === "pendente"
                        ? "Nenhuma encomenda pendente"
                        : activeTab === "retirada"
                        ? "Nenhuma encomenda retirada"
                        : "Nenhuma encomenda"}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-sm">
                      {activeTab === "pendente"
                        ? "Todas as encomendas foram retiradas pelos moradores."
                        : activeTab === "retirada"
                        ? "Ainda não há encomendas retiradas nesta unidade."
                        : "Não há encomendas registradas para esta unidade."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPackages.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      id={pkg.id}
                      photoUrl={pkg.signedPhotoUrl || pkg.photo_url}
                      pickupCode={pkg.pickup_code}
                      status={pkg.status}
                      apartmentNumber={pkg.apartment?.number || ""}
                      blockName={pkg.block?.name || ""}
                      condominiumName={pkg.condominium?.name}
                      condominiumId={pkg.condominium_id}
                      receivedAt={pkg.received_at}
                      description={pkg.description || undefined}
                      onClick={() => handlePackageClick(pkg)}
                      onViewDetails={() => handleViewDetails(pkg)}
                      onResendNotification={() => handleResendNotification(pkg)}
                      onRequestDeletion={() => selectedApartment && fetchPackages(selectedApartment.id, activeTab, 0, false)}
                      showCondominium={false}
                      showPickupCode={false}
                      canRequestDeletion
                      notificationStatus={notificationStatusMap[pkg.id] || null}
                      notificationTimestamps={notificationDataMap[pkg.id]?.timestamps}
                    />
                  ))}
                </div>
              )}
              {activeTab !== "pendente" && hasMore && filteredPackages.length > 0 && (
                <div className="flex justify-center mt-6">
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
            </TabsContent>
          </>
        )}

        {/* Initial State - No apartment selected */}
        {!selectedApartment && !isSearching && (
          <Card className="border-dashed bg-gradient-to-b from-muted/50 to-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Busque uma unidade
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Digite o código da unidade no formato BBAA<br />
                <span className="text-sm">(ex: 0344 para Bloco 03, Apto 44)</span>
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                  <MapPin className="w-4 h-4" />
                  <span className="font-mono">BB</span>
                  <span className="text-xs">= Bloco</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                  <Building2 className="w-4 h-4" />
                  <span className="font-mono">AA</span>
                  <span className="text-xs">= Apto</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </SubscriptionGate>

      {/* Pickup Confirmation Dialog */}
      <PackagePickupDialog
        open={isPickupDialogOpen}
        onOpenChange={setIsPickupDialogOpen}
        package_={selectedPackage}
        onConfirm={handleConfirmPickup}
        revealPickupCode={false}
      />

      {/* Package Details Dialog */}
      <PackageDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        package_={detailsPackage}
        showPickupCode={false}
      />

      {/* Notification Success Modal */}
      {/* Notification Modal */}
      <Dialog open={isNotificationModalOpen} onOpenChange={setIsNotificationModalOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              {notificationModalState === "loading" && (
                <div className="rounded-full bg-muted p-4">
                  <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
                </div>
              )}
              {notificationModalState === "success" && (
                <div className="rounded-full bg-primary/10 p-4">
                  <Bell className="w-10 h-10 text-primary" />
                </div>
              )}
              {notificationModalState === "error" && (
                <div className="rounded-full bg-destructive/10 p-4">
                  <X className="w-10 h-10 text-destructive" />
                </div>
              )}
            </div>
            <DialogTitle className="text-center text-lg">
              {notificationModalState === "loading" && "Enviando notificação..."}
              {notificationModalState === "success" && "Notificação enviada!"}
              {notificationModalState === "error" && "Falha ao enviar"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {notificationModalState === "loading" && "Aguarde, estamos enviando a notificação via WhatsApp."}
              {notificationModalState === "success" && (
                notificationSuccessCount > 0
                  ? `${notificationSuccessCount} morador(es) notificado(s) via WhatsApp com sucesso.`
                  : "O morador foi notificado via WhatsApp com sucesso."
              )}
              {notificationModalState === "error" && notificationErrorMessage}
            </DialogDescription>
          </DialogHeader>
          {notificationModalState !== "loading" && (
            <Button
              className="w-full mt-2"
              variant={notificationModalState === "error" ? "destructive" : "default"}
              onClick={() => setIsNotificationModalOpen(false)}
            >
              OK
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}