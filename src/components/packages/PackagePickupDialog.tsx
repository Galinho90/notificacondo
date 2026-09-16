import { useState, useEffect, useRef } from "react";
import {
  PackageCheck,
  Check,
  X,
  Loader2,
  AlertCircle,
  KeyRound,
  Package as PackageIcon,
  ArrowLeft,
  User,
} from "lucide-react";
import { getSignedPackagePhotoUrl } from "@/lib/packageStorage";
import { PackageCardImage } from "./PackageCardImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Package } from "@/hooks/usePackages";
import { supabase } from "@/integrations/supabase/client";

/** Resultado da confirmação de retirada. */
export interface PickupConfirmResult {
  success: boolean;
  error?: string;
  reason?: string;
}

interface PackagePickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package_: Package | null;
  onConfirm: (pickedUpByName: string, code: string) => Promise<PickupConfirmResult>;
  revealPickupCode?: boolean;
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
  const [isValidating, setIsValidating] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep("conference");
      setInputCode("");
      setPickedUpByName("");
      setCodeValid(null);
      setInlineError("");
      setSignedPhotoUrl(null);
    }
  }, [open]);

  // Load signed photo URL
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

  // Focus input on validate step
  useEffect(() => {
    if (step === "validate") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // Real-time code validation (RPC call on each digit, debounced)
  useEffect(() => {
    if (step !== "validate") return;
    if (inputCode.length === 0) {
      setCodeValid(null);
      return;
    }

    const timer = setTimeout(async () => {
      if (inputCode.length < 6) {
        setCodeValid(null);
        return;
      }
      if (!serverValidation || !package_) {
        setCodeValid(null);
        return;
      }
      setIsValidating(true);
      try {
        const { data, error } = await supabase.rpc("validate_pickup_code", {
          p_package_id: package_.id,
          p_code: inputCode.trim(),
        });
        if (error) { setCodeValid(false); return; }
        setCodeValid(data?.success === true);
      } catch { setCodeValid(false); }
      finally { setIsValidating(false); }
    }, 400);

    return () => clearTimeout(timer);
  }, [inputCode, step, serverValidation, package_]);

  const handleConfirm = async () => {
    if (step === "processing") return;

    if (pickedUpByName.trim().length === 0) {
      setInlineError("Informe o nome de quem está retirando.");
      return;
    }
    if (inputCode.length !== 6) {
      setInlineError("Digite o código completo de 6 dígitos.");
      return;
    }

    setInlineError("");
    setStep("processing");
    const result = await onConfirm(pickedUpByName.trim(), inputCode.trim());

    if (result.success) {
      setCodeValid(true);
      setStep("success");
      setTimeout(() => { onOpenChange(false); }, 2000);
    } else {
      setCodeValid(false);
      setInlineError(result.error || "Código incorreto. Verifique o código com o morador.");
      setStep("validate");
    }
  };

  const handleClose = () => {
    if (step === "processing") return;
    onOpenChange(false);
  };

  if (!package_) return null;

  const unitLabel = `${package_.block?.name ?? ""} - Apto ${package_.apartment?.number ?? ""}`;

  const isCodeCorrect = codeValid === true;
  const isCodeWrong = codeValid === false;
  const isCodePartial = inputCode.length > 0 && inputCode.length < 6;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">

        {/* ── Barra de status colorida ── */}
        <div className={cn(
          "h-1.5 w-full",
          step === "conference" ? "bg-orange-400" :
          step === "validate" ? "bg-orange-400" :
          step === "processing" ? "bg-primary animate-pulse" :
          step === "success" ? "bg-green-500" :
          "bg-red-500"
        )} />

        {/* ── PASSO 1: Conferência ── */}
        {step === "conference" && (
          <div className="p-6 space-y-5">
            <DialogHeader className="text-center space-y-1">
              <DialogTitle className="flex items-center justify-center gap-2 text-lg">
                <PackageCheck className="w-5 h-5 text-orange-500" />
                Conferir Encomenda
              </DialogTitle>
              <DialogDescription className="text-sm">
                Confirme os dados antes de entregar ao morador
              </DialogDescription>
            </DialogHeader>

            {/* Mini card da encomenda */}
            <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl border">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-background shrink-0 flex items-center justify-center">
                {isLoadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : signedPhotoUrl ? (
                  <PackageCardImage src={signedPhotoUrl} alt="Encomenda" className="w-full h-full rounded-lg" compact />
                ) : (
                  <PackageIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {revealPickupCode && package_.pickup_code && (
                  <p className="font-mono font-bold text-lg text-primary tracking-widest">{package_.pickup_code}</p>
                )}
                <p className="text-sm font-medium">{unitLabel}</p>
                {package_.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{package_.description}</p>
                )}
              </div>
            </div>

            {/* Aviso */}
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
              <p className="text-sm text-orange-800 dark:text-orange-200 text-center">
                Conferiu se a encomenda está correta para o morador de <strong>{unitLabel}</strong>?
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 gap-2">
                <X className="w-4 h-4" /> Cancelar
              </Button>
              <Button onClick={() => setStep("validate")} className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600">
                <PackageCheck className="w-4 h-4" /> Sim, conferi
              </Button>
            </div>
          </div>
        )}

        {/* ── PASSO 2: Código + Nome ── */}
        {step === "validate" && (
          <div className="p-6 space-y-4">
            <DialogHeader className="text-center space-y-1 pb-2">
              <DialogTitle className="flex items-center justify-center gap-2 text-lg">
                <PackageCheck className="w-5 h-5 text-orange-500" />
                Confirmar Retirada
              </DialogTitle>
              <DialogDescription className="text-sm">
                Peça o código enviado ao morador por WhatsApp
              </DialogDescription>
            </DialogHeader>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="picked-up-by-name" className="text-xs font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nome de quem retira
              </Label>
              <Input
                id="picked-up-by-name"
                placeholder="Nome completo"
                value={pickedUpByName}
                onChange={(e) => setPickedUpByName(e.target.value.toUpperCase())}
                className="text-sm uppercase"
                maxLength={100}
              />
            </div>

            {/* Código */}
            <div className="space-y-1.5">
              <Label htmlFor="pickup-code" className="text-xs font-medium flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Código de Retirada
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
                    if (codeValid !== null) setCodeValid(null);
                  }}
                  className={cn(
                    "font-mono text-2xl tracking-[0.5em] text-center pr-10 h-14",
                    isCodeCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30 ring-2 ring-green-500/40",
                    isCodeWrong && "border-destructive bg-red-50 dark:bg-red-950/20 ring-2 ring-destructive/40"
                  )}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidating ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : isCodeCorrect ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : isCodeWrong ? (
                    <X className="w-5 h-5 text-destructive" />
                  ) : null}
                </div>
              </div>

              {/* Feedback */}
              {isCodeCorrect && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Código correto!
                </p>
              )}
              {isCodeWrong && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Código incorreto — confirme com o morador
                </p>
              )}
              {isCodePartial && !isValidating && (
                <p className="text-xs text-muted-foreground">Digite os 6 dígitos</p>
              )}
            </div>

            {/* Erro inline */}
            {inlineError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {inlineError}
              </p>
            )}

            {/* Ações */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setStep("conference")} className="flex-1 gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={inputCode.length !== 6 || !pickedUpByName.trim()}
                className={cn(
                  "flex-1 gap-2 transition-all",
                  isCodeCorrect ? "bg-green-500 hover:bg-green-600" : "bg-primary hover:bg-primary/90",
                  (inputCode.length !== 6 || !pickedUpByName.trim()) && "opacity-50 cursor-not-allowed"
                )}
              >
                <PackageCheck className="w-4 h-4" /> Confirmar
              </Button>
            </div>
          </div>
        )}

        {/* ── PASSO 3: Processando ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-14 px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-base font-semibold">Processando...</p>
            <p className="text-sm text-muted-foreground mt-1">Confirmando retirada</p>
          </div>
        )}

        {/* ── PASSO 4: Sucesso ── */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-14 px-6">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-5 ring-4 ring-green-500/20">
              <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">Retirada Confirmada!</p>
            <p className="text-sm text-muted-foreground mt-2 text-center">{unitLabel}</p>
          </div>
        )}

        {/* ── PASSO 5: Erro ── */}
        {step === "error" && (
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-base font-semibold text-destructive">Erro na Retirada</p>
              <p className="text-sm text-muted-foreground mt-1">{inlineError}</p>
            </div>
            <Button variant="outline" onClick={() => setStep("validate")} className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar e tentar novamente
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
