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
                  <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Buscar
                  </Button>
                  {selectedApartment && (
                    <Button variant="ghost" onClick={clearSearch} className="gap-2 text-muted-foreground">
                      <X className="w-4 h-4" />
                      Limpar
                    </Button>
                  )}
                </div>
                {searchError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <X className="w-3 h-3" />
                    {searchError}
                  </p>
                )}
              </div>

              {/* Selected Apartment Info */}
              {selectedApartment && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {selectedApartment.blockName} - {selectedApartment.number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedApartment.condominiumName}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Package className="w-3 h-3" />
                    {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs section - TabsContent MUST be inside Tabs */}
        {selectedApartment && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="pendente" className="gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Pendentes
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 justify-center text-[10px]">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="retirada" className="gap-1.5">
                <PackageCheck className="w-3.5 h-3.5" />
                Retiradas
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-1.5">
                <Bell className="w-3.5 h-3.5" />
                Todas
              </TabsTrigger>
            </TabsList>

            {/* Tab: Pendentes */}
            <TabsContent value="pendente" className="mt-0">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-0 overflow-hidden">
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-5 w-24" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-9 w-full mt-2" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredPackages.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Nenhuma encomenda pendente</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Este apartamento não tem encomendas pendentes de retirada.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPackages.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      onClick={() => handlePackageClick(pkg)}
                      onViewDetails={() => handleViewDetails(pkg)}
                      notificationStatus={notificationStatusMap[pkg.id]}
                      notificationData={notificationDataMap[pkg.id]}
                      onResendNotification={() => handleResendNotification(pkg)}
                      showNotificationButton
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab: Retiradas */}
            <TabsContent value="retirada" className="mt-0">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
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
              ) : filteredPackages.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <PackageCheck className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Nenhuma encomenda retirada</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Este apartamento ainda não teve encomendas retiradas.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPackages.map((pkg) => (
                      <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        onClick={() => handleViewDetails(pkg)}
                        onViewDetails={() => handleViewDetails(pkg)}
                      />
                    ))}
                  </div>
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
                </>
              )}
            </TabsContent>

            {/* Tab: Todas */}
            <TabsContent value="all" className="mt-0">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
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
              ) : filteredPackages.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Nenhuma encomenda registrada</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Este apartamento ainda não recebeu nenhuma encomenda.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPackages.map((pkg) => (
                      <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        onClick={() => pkg.status === "pendente" ? handlePackageClick(pkg) : handleViewDetails(pkg)}
                        onViewDetails={() => handleViewDetails(pkg)}
                        notificationStatus={notificationStatusMap[pkg.id]}
                        notificationData={notificationDataMap[pkg.id]}
                        onResendNotification={() => handleResendNotification(pkg)}
                        showNotificationButton={pkg.status === "pendente"}
                      />
                    ))}
                  </div>
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
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Pickup Dialog */}
      <PackagePickupDialog
        isOpen={isPickupDialogOpen}
        onClose={() => setIsPickupDialogOpen(false)}
        onConfirm={handleConfirmPickup}
        package={selectedPackage}
      />

      {/* Details Dialog */}
      <PackageDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        package={detailsPackage}
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
                <p className="text-sm text-muted-foreground">
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
