import { useState, useEffect, useRef } from "react";
import {
  PackageCheck,
  Check,
  X,
  Loader2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Package as PackageIcon,
  ArrowLeft,
} from "lucide-react";
import { getSignedPackagePhotoUrl } from "@/lib/packageStorage";
import { PackageCardImage } from "./PackageCardImage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Package } from "@/hooks/usePackages";

/** Resultado da confirmação de retirada. */
export interface PickupConfirmResult {
  success: boolean;
  error?: string;
  /** Motivo estrutural da falha (ex.: `invalid_code`) para feedback visual. */
  reason?: string;
}

interface PackagePickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package_: Package | null;
  /**
   * Confirma a retirada. O código digitado é repassado para que a validação
   * possa acontecer no servidor (modo `serverValidation`).
   */
  onConfirm: (pickedUpByName: string, code: string) => Promise<PickupConfirmResult>;
  /** Quando false, o código de retirada nunca é renderizado no diálogo. */
  revealPickupCode?: boolean;
  /**
   * Quando true, o código NÃO é comparado no cliente — a conferência é feita
   * exclusivamente no servidor. Use sempre junto de `revealPickupCode={false}`.
   */
  serverValidation?: boolean;
}

type Step = "conference" | "validate" | "processing" | "success" | "error";

export function PackagePickupDialog({
  open,
  onOpenChange,
  package_,
  onConfirm,
  revealPickupCode = true,
  serverValidation = false,
}: PackagePickupDialogProps) {
  const [step, setStep] = useState<Step>("conference");
  const [inputCode, setInputCode] = useState("");
  const [pickedUpByName, setPickedUpByName] = useState("");
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  /** Erro exibido inline no passo de validação (o formulário permanece na tela). */
  const [inlineError, setInlineError] = useState("");
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("conference");
      setInputCode("");
      setPickedUpByName("");
      setCodeValid(null);
      setErrorMessage("");
      setInlineError("");
      setSignedPhotoUrl(null);
    }
  }, [open]);

  // Generate signed URL for package photo
  useEffect(() => {
    if (open && package_?.photo_url) {
      setIsLoadingPhoto(true);
      getSignedPackagePhotoUrl(package_.photo_url)
        .then((url) => setSignedPhotoUrl(url))
        .catch(() => setSignedPhotoUrl(null))
        .finally(() => setIsLoadingPhoto(false));
    } else {
      setSignedPhotoUrl(null);
      setIsLoadingPhoto(false);
    }
  }, [open, package_?.photo_url]);

  // Validate code as user types (apenas quando a conferência é local)
  useEffect(() => {
    if (serverValidation) {
      setCodeValid(null);
      return;
    }
    if (!package_ || !inputCode) {
      setCodeValid(null);
      return;
    }
    const isValid = inputCode.toUpperCase() === (package_.pickup_code || "").toUpperCase();
    setCodeValid(isValid);
  }, [inputCode, package_, serverValidation]);

  // Focus input when entering validate step
  useEffect(() => {
    if (step === "validate") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // Em validação por servidor basta o código estar completo (6 dígitos).
  const canSubmit = serverValidation
    ? inputCode.length === 6 && pickedUpByName.trim().length > 0
    : codeValid === true && pickedUpByName.trim().length > 0;

  const handleConfirm = async () => {
    if (!canSubmit) return;

    setStep("processing");
    const result = await onConfirm(pickedUpByName.trim(), inputCode.trim());

    if (result.success) {
      setStep("success");
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } else {
      setErrorMessage(result.error || "Erro ao confirmar retirada");
      setStep("error");
    }
  };

  const handleClose = () => {
    if (step === "processing") return; // Prevent closing while processing
    onOpenChange(false);
  };

  if (!package_) return null;

  const unitLabel = `${package_.block?.name ?? ""} - Apto ${package_.apartment?.number ?? ""}`;

  /** Resumo visual reaproveitado nos passos de conferência e validação. */
  const packagePreview = (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg w-full">
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-background shrink-0">
        {isLoadingPhoto ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : signedPhotoUrl ? (
          <PackageCardImage
            src={signedPhotoUrl}
            alt="Encomenda"
            className="w-full h-full rounded-lg"
            compact
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <PackageIcon className="w-6 h-6" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {revealPickupCode && package_.pickup_code && (
          <p className="font-mono font-bold text-xl text-primary tracking-wider">
            {package_.pickup_code}
          </p>
        )}
        <p className="text-sm font-medium">{unitLabel}</p>
        {package_.description && (
          <p className="text-xs text-muted-foreground truncate mt-1">
            {package_.description}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "conference" && (
          <div className="flex flex-col items-center justify-center py-6 space-y-6">
            <DialogHeader className="text-center">
              <DialogTitle className="flex items-center justify-center gap-2">
                <PackageCheck className="w-5 h-5 text-primary" />
                Conferir Encomenda
              </DialogTitle>
              <DialogDescription>
                Antes de prosseguir, confirme que a encomenda foi verificada
              </DialogDescription>
            </DialogHeader>

            {packagePreview}

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 w-full">
              <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                <strong>Você conferiu</strong> se a encomenda está sendo entregue corretamente para o morador do{" "}
                <strong>{unitLabel}</strong>?
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Essa ação dará baixa na encomenda e não poderá ser desfeita.
            </p>

            <div className="flex gap-3 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={() => setStep("validate")} className="flex-1 gap-2">
                <PackageCheck className="w-4 h-4" />
                Sim, conferi e entregar
              </Button>
            </div>
          </div>
        )}

        {step === "validate" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-primary" />
                Confirmar Retirada
              </DialogTitle>
              <DialogDescription>
                Peça ao morador o código recebido por WhatsApp e digite abaixo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {packagePreview}

              {/* Picked Up By Name Input */}
              <div className="space-y-2">
                <Label htmlFor="picked-up-by-name" className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4" />
                  Nome de quem está retirando
                </Label>
                <Input
                  id="picked-up-by-name"
                  placeholder="Digite o nome completo..."
                  value={pickedUpByName}
                  onChange={(e) => setPickedUpByName(e.target.value.toUpperCase())}
                  className="text-base uppercase"
                  maxLength={100}
                />
              </div>

              {/* Code Input */}
              <div className="space-y-2">
                <Label htmlFor="pickup-code" className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  Código de Retirada
                </Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="pickup-code"
                    placeholder="000000"
                    value={inputCode}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, "");
                      setInputCode(numericValue);
                    }}
                    className={cn(
                      "font-mono text-2xl tracking-[0.5em] text-center pr-10",
                      codeValid === true && "border-green-500 focus-visible:ring-green-500",
                      codeValid === false && "border-destructive focus-visible:ring-destructive"
                    )}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                  />
                  {!serverValidation && codeValid !== null && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {codeValid ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {serverValidation ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    O código é conferido com segurança no servidor.
                  </p>
                ) : (
                  codeValid === false &&
                  inputCode.length >= 4 && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Código inválido
                    </p>
                  )
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("conference")}
                  className="flex-1 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
                <Button onClick={handleConfirm} disabled={!canSubmit} className="flex-1 gap-2">
                  <PackageCheck className="w-4 h-4" />
                  Confirmar
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            </div>
            <p className="mt-6 text-lg font-medium">Processando retirada...</p>
            <p className="text-sm text-muted-foreground mt-1">Aguarde um momento</p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative animate-in zoom-in-50 duration-300">
              <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <div className="absolute -inset-2 rounded-full border-4 border-green-500/30 animate-ping" />
            </div>
            <p className="mt-6 text-xl font-bold text-green-600 dark:text-green-400">
              Retirada Confirmada!
            </p>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-[260px]">
              Encomenda baixada do sistema corretamente
            </p>
            <div className="mt-3 p-3 bg-muted rounded-lg text-center">
              {revealPickupCode && package_.pickup_code && (
                <p className="font-mono font-bold text-lg text-primary">
                  {package_.pickup_code}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{unitLabel}</p>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="w-10 h-10 text-destructive" />
            </div>
            <p className="mt-6 text-lg font-medium text-destructive">Erro na Retirada</p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-[280px]">
              {errorMessage}
            </p>
            <div className="flex flex-col gap-3 mt-6 w-full max-w-[280px]">
              <Button
                variant="outline"
                onClick={() => setStep("validate")}
                className="w-full gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar e revisar dados
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
