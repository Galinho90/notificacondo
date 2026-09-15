import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, Clock, Building2, MoreVertical, Info, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import { PackageDeleteRequestDialog } from "./PackageDeleteRequestDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PackageStatusBadge } from "./PackageStatusBadge";
import { PackageCardImage } from "./PackageCardImage";
import { PackageStatus } from "@/lib/packageConstants";
import { cn } from "@/lib/utils";
import { DeliveryStatusTracker, type DeliveryTimestamps } from "./DeliveryStatusTracker";

interface PackageCardProps {
  id: string;
  photoUrl: string;
  pickupCode: string;
  status: PackageStatus;
  apartmentNumber: string;
  blockName: string;
  condominiumName?: string;
  condominiumId?: string;
  receivedAt: string;
  description?: string;
  notificationStatus?: string | null;
  notificationTimestamps?: DeliveryTimestamps;
  onClick?: () => void;
  onResendNotification?: () => void;
  onViewDetails?: () => void;
  onRequestDeletion?: () => void;
  showCondominium?: boolean;
  compact?: boolean;
  showPickupCode?: boolean;
  canRequestDeletion?: boolean;
}

const STATUS_STYLES: Record<PackageStatus, { banner: string; icon: string; label: string }> = {
  pendente: {
    banner: "from-amber-500 to-orange-500",
    icon: "text-white",
    label: "Aguardando retirada",
  },
  retirada: {
    banner: "from-emerald-500 to-teal-500",
    icon: "text-white",
    label: "Retirada confirmada",
  },
};

export function PackageCard({
  id,
  photoUrl,
  pickupCode,
  status,
  apartmentNumber,
  blockName,
  condominiumName,
  condominiumId,
  notificationStatus,
  notificationTimestamps,
  receivedAt,
  description,
  onClick,
  onResendNotification,
  onViewDetails,
  onRequestDeletion,
  showCondominium = false,
  compact = false,
  showPickupCode = true,
  canRequestDeletion = false,
}: PackageCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canResend = Boolean(onResendNotification);
  const canDelete = canRequestDeletion && Boolean(condominiumId) && status !== "retirada";
  const style = STATUS_STYLES[status];

  const formattedDate = format(new Date(receivedAt), "dd/MM/yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  const handleConfirm = () => {
    setConfirmOpen(false);
    onResendNotification?.();
  };

  if (compact) {
    return (
      <>
        <div className="flex flex-col gap-1">
          <Card
            className={cn(
              "overflow-hidden transition-all hover:shadow-md",
              onClick && "cursor-pointer"
            )}
            onClick={onClick}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 relative">
                  <PackageCardImage src={photoUrl} compact />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {showPickupCode && (
                      <span className="font-mono font-bold text-sm text-primary">
                        {pickupCode}
                      </span>
                    )}
                    <PackageStatusBadge status={status} />
                  </div>
                  <p className="text-sm text-muted-foreground truncate uppercase">
                    {blockName} - {apartmentNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formattedDate}
                  </p>
                  {notificationStatus && (
                    <DeliveryStatusTracker status={notificationStatus} timestamps={notificationTimestamps} className="mt-1" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {canResend && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmOpen(true);
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reenviar notificação
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Solicitar exclusão
            </Button>
          )}
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Reenviar Notificação
              </AlertDialogTitle>
              <AlertDialogDescription>
                Deseja enviar uma nova notificação via WhatsApp para os moradores do{" "}
                <strong>{blockName} - Apto {apartmentNumber}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>
                Sim, reenviar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <Card
          className={cn(
            "overflow-hidden transition-all hover:shadow-lg group",
            "border-0 shadow-md",
            onClick && "cursor-pointer"
          )}
          onClick={onClick}
        >
          {showPickupCode && (
            <div className={cn("bg-gradient-to-r px-4 py-2.5", style.banner)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className={cn("w-5 h-5", style.icon)} />
                  <span className="font-mono font-bold text-lg text-white tracking-wider">
                    {pickupCode}
                  </span>
                </div>
                <span className="text-xs text-white/90 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {style.label}
                </span>
              </div>
            </div>
          )}

          <div className="relative bg-gradient-to-br from-muted to-muted/50">
            <div className="aspect-[4/3] relative">
              <PackageCardImage src={photoUrl} />
              <div className="absolute top-3 left-3">
                <PackageStatusBadge status={status} />
              </div>
              {(onViewDetails || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 shadow-lg"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {onViewDetails && (
                      <DropdownMenuItem onClick={onViewDetails}>
                        <Info className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => setDeleteOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Solicitar exclusão
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm uppercase text-foreground">
                  {blockName} - Apto {apartmentNumber}
                </p>
                {showCondominium && condominiumName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {condominiumName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formattedDate}</span>
            </div>

            {notificationStatus && (
              <DeliveryStatusTracker
                status={notificationStatus}
                timestamps={notificationTimestamps}
                className="mt-1"
              />
            )}

            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 pt-1 border-t">
                {description}
              </p>
            )}

            {canResend && status === "pendente" && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmOpen(true);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reenviar notificação WhatsApp
                </Button>
              </div>
            )}

            {canDelete && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Solicitar exclusão
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Reenviar Notificação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja enviar uma nova notificação via WhatsApp para os moradores do{" "}
              <strong>{blockName} - Apto {apartmentNumber}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Sim, reenviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canDelete && condominiumId && (
        <PackageDeleteRequestDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          packageId={id}
          condominiumId={condominiumId}
          packageLabel={`${pickupCode} — ${blockName} Apto ${apartmentNumber}`}
          onSubmitted={onRequestDeletion}
        />
      )}
    </>
  );
}
