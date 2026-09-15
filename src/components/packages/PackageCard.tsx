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

const STATUS_BARS: Record<PackageStatus, { bg: string; text: string; icon: string; label: string }> = {
  pendente: {
    bg: "bg-gradient-to-r from-orange-500 to-amber-500",
    text: "text-white",
    icon: "text-white",
    label: "Aguardando retirada",
  },
  retirada: {
    bg: "bg-gradient-to-r from-emerald-500 to-teal-500",
    text: "text-white",
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
  const bar = STATUS_BARS[status];

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
            "overflow-hidden transition-all hover:shadow-lg",
            "border-0 shadow-md",
            onClick && "cursor-pointer"
          )}
          onClick={onClick}
        >
          {/* Barra de cor no topo */}
          <div className={cn("px-3 py-1.5", bar.bg)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {status === "pendente" ? (
                  <Package className={cn("w-3.5 h-3.5", bar.icon)} />
                ) : (
                  <CheckCircle2 className={cn("w-3.5 h-3.5", bar.icon)} />
                )}
                <span className="font-mono font-bold text-sm text-white tracking-wider">
                  {pickupCode}
                </span>
              </div>
              <span className="text-[10px] text-white/90 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {bar.label}
              </span>
            </div>
          </div>

          {/* Imagem compacta */}
          <div className="relative bg-muted/40">
            <div className="aspect-[4/3] relative">
              <PackageCardImage src={photoUrl} />
              <div className="absolute top-2 left-2">
                <PackageStatusBadge status={status} className="text-[10px] px-1.5 py-0.5" />
              </div>
              {(onViewDetails || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 shadow-md"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {onViewDetails && (
                      <DropdownMenuItem onClick={onViewDetails}>
                        <Info className="w-3.5 h-3.5 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => setDeleteOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Solicitar exclusão
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Rodapé compacto */}
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs uppercase text-foreground leading-tight">
                  {blockName} - Apto {apartmentNumber}
                </p>
                {showCondominium && condominiumName && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {condominiumName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{formattedDate}</span>
            </div>

            {notificationStatus && (
              <DeliveryStatusTracker
                status={notificationStatus}
                timestamps={notificationTimestamps}
                className="mt-0.5"
              />
            )}

            {description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 pt-0.5 border-t border-border/50">
                {description}
              </p>
            )}

            {canResend && status === "pendente" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-[11px] h-7 mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmOpen(true);
                }}
              >
                <RefreshCw className="h-3 w-3" />
                Reenviar notificação
              </Button>
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
