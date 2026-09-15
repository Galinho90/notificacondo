import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { UserRoleProvider } from "@/hooks/useUserRole";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const Auth = lazyWithRetry(() => import("./pages/Auth"), "Auth");
const Contact = lazyWithRetry(() => import("./pages/Contact"), "Contact");
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"), "PrivacyPolicy");
const Autenticidade = lazyWithRetry(() => import("./pages/Autenticidade"), "Autenticidade");
const TermsOfUse = lazyWithRetry(() => import("./pages/TermsOfUse"), "TermsOfUse");
const CivilCode = lazyWithRetry(() => import("./pages/CivilCode"), "CivilCode");
const Plans = lazyWithRetry(() => import("./pages/Plans"), "Plans");
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"), "Dashboard");
const ResidentDashboard = lazyWithRetry(() => import("./pages/ResidentDashboard"), "ResidentDashboard");
const ResidentOccurrences = lazyWithRetry(() => import("./pages/ResidentOccurrences"), "ResidentOccurrences");
const ResidentOccurrenceDetails = lazyWithRetry(() => import("./pages/ResidentOccurrenceDetails"), "ResidentOccurrenceDetails");
const ResidentProfile = lazyWithRetry(() => import("./pages/ResidentProfile"), "ResidentProfile");
const Condominiums = lazyWithRetry(() => import("./pages/Condominiums"), "Condominiums");
const CondominiumDetails = lazyWithRetry(() => import("./pages/CondominiumDetails"), "CondominiumDetails");
const Occurrences = lazyWithRetry(() => import("./pages/Occurrences"), "Occurrences");
const OccurrenceDetails = lazyWithRetry(() => import("./pages/OccurrenceDetails"), "OccurrenceDetails");
const Reports = lazyWithRetry(() => import("./pages/Reports"), "Reports");
const Notifications = lazyWithRetry(() => import("./pages/Notifications"), "Notifications");
const DefenseAnalysis = lazyWithRetry(() => import("./pages/DefenseAnalysis"), "DefenseAnalysis");
const SindicoSettings = lazyWithRetry(() => import("./pages/SindicoSettings"), "SindicoSettings");
const SindicoInvoices = lazyWithRetry(() => import("./pages/SindicoInvoices"), "SindicoInvoices");
const SindicoSubscriptions = lazyWithRetry(() => import("./pages/SindicoSubscriptions"), "SindicoSubscriptions");
const SindicoPorteiros = lazyWithRetry(() => import("./pages/sindico/Porteiros"), "SindicoPorteiros");
const SindicoBanners = lazyWithRetry(() => import("./pages/sindico/Banners"), "SindicoBanners");
const PackagesDashboard = lazyWithRetry(() => import("./pages/sindico/PackagesDashboard"), "PackagesDashboard");
const SindicoPackages = lazyWithRetry(() => import("./pages/sindico/Packages"), "SindicoPackages");
const PackagesHistory = lazyWithRetry(() => import("./pages/sindico/PackagesHistory"), "PackagesHistory");
const PackagesCondominiumHistory = lazyWithRetry(() => import("./pages/sindico/PackagesCondominiumHistory"), "PackagesCondominiumHistory");
const PartyHall = lazyWithRetry(() => import("./pages/PartyHall"), "PartyHall");
const PartyHallSettings = lazyWithRetry(() => import("./pages/PartyHallSettings"), "PartyHallSettings");
const PartyHallNotifications = lazyWithRetry(() => import("./pages/PartyHallNotifications"), "PartyHallNotifications");
const ResidentAccess = lazyWithRetry(() => import("./pages/ResidentAccess"), "ResidentAccess");
const ResidentPackages = lazyWithRetry(() => import("./pages/resident/Packages"), "ResidentPackages");
const AuthCallback = lazyWithRetry(() => import("./pages/AuthCallback"), "AuthCallback");
const SuperAdminDashboard = lazyWithRetry(() => import("./pages/SuperAdminDashboard"), "SuperAdminDashboard");
const Sindicos = lazyWithRetry(() => import("./pages/superadmin/Sindicos"), "Sindicos");
const SuperAdminCondominiums = lazyWithRetry(() => import("./pages/superadmin/Condominiums"), "SuperAdminCondominiums");
const Subscriptions = lazyWithRetry(() => import("./pages/superadmin/Subscriptions"), "Subscriptions");
const SubscriptionDetails = lazyWithRetry(() => import("./pages/superadmin/SubscriptionDetails"), "SubscriptionDetails");
const SuperAdminInvoices = lazyWithRetry(() => import("./pages/superadmin/Invoices"), "SuperAdminInvoices");
const Logs = lazyWithRetry(() => import("./pages/superadmin/Logs"), "Logs");
const MagicLinkLogs = lazyWithRetry(() => import("./pages/superadmin/MagicLinkLogs"), "MagicLinkLogs");
const EdgeFunctionLogs = lazyWithRetry(() => import("./pages/superadmin/EdgeFunctionLogs"), "EdgeFunctionLogs");
const WabaLogs = lazyWithRetry(() => import("./pages/superadmin/WabaLogs"), "WabaLogs");
const BsuidMigration = lazyWithRetry(() => import("./pages/superadmin/BsuidMigration"), "BsuidMigration");
const CronJobs = lazyWithRetry(() => import("./pages/superadmin/CronJobs"), "CronJobs");
const Transfers = lazyWithRetry(() => import("./pages/superadmin/Transfers"), "Transfers");
const WhatsApp = lazyWithRetry(() => import("./pages/superadmin/WhatsApp"), "WhatsApp");
const WhatsAppConfig = lazyWithRetry(() => import("./pages/superadmin/WhatsAppConfig"), "WhatsAppConfig");
const WhatsAppChat = lazyWithRetry(() => import("./pages/superadmin/WhatsAppChat"), "WhatsAppChat");
const SuperAdminSettings = lazyWithRetry(() => import("./pages/superadmin/Settings"), "SuperAdminSettings");
const SuperAdminSmtp = lazyWithRetry(() => import("./pages/superadmin/SmtpConfig"), "SuperAdminSmtp");
const PorteiroSettings = lazyWithRetry(() => import("./pages/porteiro/Settings"), "PorteiroSettings");
const ContactMessages = lazyWithRetry(() => import("./pages/superadmin/ContactMessages"), "ContactMessages");
const PackageTypes = lazyWithRetry(() => import("./pages/superadmin/PackageTypes"), "PackageTypes");

const OccurrencePdfTemplate = lazyWithRetry(() => import("./pages/superadmin/OccurrencePdfTemplate"), "OccurrencePdfTemplate");
const PorteiroDashboard = lazyWithRetry(() => import("./pages/porteiro/Dashboard"), "PorteiroDashboard");
const RegisterPackage = lazyWithRetry(() => import("./pages/porteiro/RegisterPackage"), "RegisterPackage");
const PorteiroPackages = lazyWithRetry(() => import("./pages/porteiro/Packages"), "PorteiroPackages");
const PorteiroCondominio = lazyWithRetry(() => import("./pages/porteiro/Condominio"), "PorteiroCondominio");
const PorteiroPackagesHistory = lazyWithRetry(() => import("./pages/porteiro/PackagesHistory"), "PorteiroPackagesHistory");
const PortariaOccurrences = lazyWithRetry(() => import("./pages/porteiro/PortariaOccurrences"), "PortariaOccurrences");
const ShiftHandover = lazyWithRetry(() => import("./pages/porteiro/ShiftHandover"), "ShiftHandover");
const ShiftChecklistSettings = lazyWithRetry(() => import("./pages/sindico/ShiftChecklistSettings"), "ShiftChecklistSettings");
const SindicoPortariaOccurrences = lazyWithRetry(() => import("./pages/sindico/PortariaOccurrences"), "SindicoPortariaOccurrences");
const SindicoPortariaShiftHandovers = lazyWithRetry(() => import("./pages/sindico/PortariaShiftHandovers"), "SindicoPortariaShiftHandovers");
const SindicoPortariaMessageBook = lazyWithRetry(() => import("./pages/sindico/PortariaMessageBook"), "SindicoPortariaMessageBook");
const SindicoZeladores = lazyWithRetry(() => import("./pages/sindico/Zeladores"), "SindicoZeladores");
const SindicoManutencoes = lazyWithRetry(() => import("./pages/sindico/Manutencoes"), "SindicoManutencoes");
const SindicoManutencoesTarefas = lazyWithRetry(() => import("./pages/sindico/ManutencoesTarefas"), "SindicoManutencoesTarefas");
const ManutencoesCalendario = lazyWithRetry(() => import("./pages/sindico/ManutencoesCalendario"), "ManutencoesCalendario");
const ManutencoesCondominios = lazyWithRetry(() => import("./pages/sindico/ManutencoesCondominios"), "ManutencoesCondominios");
const ManutencoesCondominioDetalhes = lazyWithRetry(() => import("./pages/sindico/ManutencoesCondominioDetalhes"), "ManutencoesCondominioDetalhes");
const ManutencoesCategorias = lazyWithRetry(() => import("./pages/sindico/ManutencoesCategorias"), "ManutencoesCategorias");
const ManutencoesHistorico = lazyWithRetry(() => import("./pages/sindico/ManutencoesHistorico"), "ManutencoesHistorico");
const PackageDeletions = lazyWithRetry(() => import("./pages/sindico/PackageDeletions"), "PackageDeletions");
const ZeladorDashboard = lazyWithRetry(() => import("./pages/zelador/Dashboard"), "ZeladorDashboard");
const ZeladorManutencoes = lazyWithRetry(() => import("./pages/zelador/Manutencoes"), "ZeladorManutencoes");
const ZeladorSettings = lazyWithRetry(() => import("./pages/zelador/Settings"), "ZeladorSettings");
const ChecklistEntrada = lazyWithRetry(() => import("./pages/ChecklistEntrada"), "ChecklistEntrada");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
            <UserRoleProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/planos" element={<Plans />} />
              <Route path="/contato" element={<Contact />} />
              <Route path="/privacidade" element={<PrivacyPolicy />} />
              <Route path="/termos" element={<TermsOfUse />} />
              <Route path="/codigo-civil" element={<CivilCode />} />
              <Route path="/autenticidade" element={<Autenticidade />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/callback/next/:next" element={<AuthCallback />} />
              
              {/* Síndico Routes */}
              <Route path="/dashboard" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><Dashboard /></ProtectedRoute>} />
              <Route path="/condominiums" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><Condominiums /></ProtectedRoute>} />
              <Route path="/condominiums/:id" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><CondominiumDetails /></ProtectedRoute>} />
              <Route path="/occurrences" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><Occurrences /></ProtectedRoute>} />
              <Route path="/occurrences/:id" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><OccurrenceDetails /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><Reports /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><Notifications /></ProtectedRoute>} />
              <Route path="/defenses" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><DefenseAnalysis /></ProtectedRoute>} />
              <Route path="/party-hall" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><PartyHall /></ProtectedRoute>} />
              <Route path="/party-hall/settings" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><PartyHallSettings /></ProtectedRoute>} />
              <Route path="/party-hall/notifications" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><PartyHallNotifications /></ProtectedRoute>} />
              <Route path="/sindico/settings" element={<ProtectedRoute requiredRole="sindico"><SindicoSettings /></ProtectedRoute>} />
              <Route path="/sindico/invoices" element={<ProtectedRoute requiredRole="sindico"><SindicoInvoices /></ProtectedRoute>} />
              <Route path="/sindico/subscriptions" element={<ProtectedRoute requiredRole="sindico"><SindicoSubscriptions /></ProtectedRoute>} />
              <Route path="/sindico/porteiros" element={<ProtectedRoute requiredRole="sindico"><SindicoPorteiros /></ProtectedRoute>} />
              <Route path="/sindico/banners" element={<ProtectedRoute requiredRole="sindico"><SindicoBanners /></ProtectedRoute>} />
              <Route path="/sindico/portaria/checklist" element={<ProtectedRoute requiredRole="sindico"><ShiftChecklistSettings /></ProtectedRoute>} />
              <Route path="/sindico/portaria/ocorrencias" element={<ProtectedRoute requiredRole="sindico"><SindicoPortariaOccurrences /></ProtectedRoute>} />
              <Route path="/sindico/portaria/plantoes" element={<ProtectedRoute requiredRole="sindico"><SindicoPortariaShiftHandovers /></ProtectedRoute>} />
              <Route path="/sindico/portaria/recados" element={<ProtectedRoute requiredRole="sindico"><SindicoPortariaMessageBook /></ProtectedRoute>} />
              <Route path="/sindico/encomendas" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><SindicoPackages /></ProtectedRoute>} />
              <Route path="/sindico/packages/dashboard" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><PackagesDashboard /></ProtectedRoute>} />
              <Route path="/sindico/packages" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><SindicoPackages /></ProtectedRoute>} />
              <Route path="/sindico/packages/historico" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><PackagesHistory /></ProtectedRoute>} />
              <Route path="/sindico/packages/historico-condominio" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><PackagesCondominiumHistory /></ProtectedRoute>} />
              <Route path="/sindico/profile" element={<Navigate to="/sindico/settings" replace />} />
              <Route path="/sindico/zeladores" element={<ProtectedRoute requiredRole="sindico"><SindicoZeladores /></ProtectedRoute>} />
              <Route path="/sindico/manutencoes" element={<ProtectedRoute requiredRole="sindico"><SindicoManutencoes /></ProtectedRoute>} />
              <Route path="/sindico/manutencoes/tarefas" element={<ProtectedRoute requiredRole="sindico"><SindicoManutencoesTarefas /></ProtectedRoute>} />
              <Route path="/sindico/manutencoes/calendario" element={<ProtectedRoute requiredRole="sindico"><ManutencoesCalendario /></ProtectedRoute>} />
              <Route path="/sindico/manutencoes/condominios" element={<ProtectedRoute requiredRole="sindico"><ManutencoesCondominios /></ProtectedRoute>} />
              <Route path="/sindico/manutencoes/condominios/:id" element={<ProtectedRoute requiredRole="sindico"><ManutencoesCondominioDetalhes /></ProtectedRoute>} />
              <Route path="/sindico/manutencoes/categorias" element={<ProtectedRoute requiredRole="sindico"><ManutencoesCategorias /></ProtectedRoute>} />
              <Route path="/sindico/manutencoes/historico" element={<ProtectedRoute requiredRole="sindico"><ManutencoesHistorico /></ProtectedRoute>} />
              <Route path="/sindico/exclusoes" element={<ProtectedRoute requiredRole={["sindico", "super_admin"]}><PackageDeletions /></ProtectedRoute>} />

              {/* Resident Routes */}
              <Route path="/resident" element={<ProtectedRoute requiredRole="morador"><ResidentDashboard /></ProtectedRoute>} />
              <Route path="/resident/occurrences" element={<ProtectedRoute requiredRole="morador"><ResidentOccurrences /></ProtectedRoute>} />
              <Route path="/resident/occurrences/:id" element={<ProtectedRoute requiredRole="morador"><ResidentOccurrenceDetails /></ProtectedRoute>} />
              <Route path="/resident/profile" element={<ProtectedRoute requiredRole="morador"><ResidentProfile /></ProtectedRoute>} />
              <Route path="/resident/packages" element={<ProtectedRoute requiredRole="morador"><ResidentPackages /></ProtectedRoute>} />
              <Route path="/checklist-entrada/:token" element={<ChecklistEntrada />} />
              <Route path="/acesso/:token" element={<ResidentAccess />} />
              <Route path="/resident/access" element={<ResidentAccess />} />

              {/* Porteiro Routes */}
              <Route path="/porteiro" element={<ProtectedRoute requiredRole="porteiro"><PorteiroDashboard /></ProtectedRoute>} />
              <Route path="/porteiro/registrar" element={<ProtectedRoute requiredRole="porteiro"><RegisterPackage /></ProtectedRoute>} />
              <Route path="/porteiro/encomendas" element={<ProtectedRoute requiredRole="porteiro"><PorteiroPackages /></ProtectedRoute>} />
              <Route path="/porteiro/configuracoes" element={<ProtectedRoute requiredRole="porteiro"><PorteiroSettings /></ProtectedRoute>} />
              <Route path="/porteiro/condominio" element={<ProtectedRoute requiredRole="porteiro"><PorteiroCondominio /></ProtectedRoute>} />
              <Route path="/porteiro/historico" element={<ProtectedRoute requiredRole="porteiro"><PorteiroPackagesHistory /></ProtectedRoute>} />
              <Route path="/porteiro/portaria/ocorrencias" element={<ProtectedRoute requiredRole="porteiro"><PortariaOccurrences /></ProtectedRoute>} />
              <Route path="/porteiro/portaria/plantao" element={<ProtectedRoute requiredRole="porteiro"><ShiftHandover /></ProtectedRoute>} />

              {/* Zelador Routes */}
              <Route path="/zelador" element={<ProtectedRoute requiredRole="zelador"><ZeladorDashboard /></ProtectedRoute>} />
              <Route path="/zelador/manutencoes" element={<ProtectedRoute requiredRole="zelador"><ZeladorManutencoes /></ProtectedRoute>} />
              <Route path="/zelador/configuracoes" element={<ProtectedRoute requiredRole="zelador"><ZeladorSettings /></ProtectedRoute>} />

              {/* Super Admin Routes */}
              <Route path="/superadmin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/superadmin/sindicos" element={<ProtectedRoute requiredRole="super_admin"><Sindicos /></ProtectedRoute>} />
              <Route path="/superadmin/condominiums" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminCondominiums /></ProtectedRoute>} />
              <Route path="/superadmin/subscriptions" element={<ProtectedRoute requiredRole="super_admin"><Subscriptions /></ProtectedRoute>} />
              <Route path="/superadmin/subscriptions/:id" element={<ProtectedRoute requiredRole="super_admin"><SubscriptionDetails /></ProtectedRoute>} />
              <Route path="/superadmin/invoices" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminInvoices /></ProtectedRoute>} />
              <Route path="/superadmin/transfers" element={<ProtectedRoute requiredRole="super_admin"><Transfers /></ProtectedRoute>} />
              <Route path="/superadmin/logs" element={<ProtectedRoute requiredRole="super_admin"><Logs /></ProtectedRoute>} />
              <Route path="/superadmin/logs/magic-link" element={<ProtectedRoute requiredRole="super_admin"><MagicLinkLogs /></ProtectedRoute>} />
              <Route path="/superadmin/logs/edge-functions" element={<ProtectedRoute requiredRole="super_admin"><EdgeFunctionLogs /></ProtectedRoute>} />
              <Route path="/superadmin/logs/waba" element={<ProtectedRoute requiredRole="super_admin"><WabaLogs /></ProtectedRoute>} />
              <Route path="/superadmin/bsuid-migration" element={<ProtectedRoute requiredRole="super_admin"><BsuidMigration /></ProtectedRoute>} />
              <Route path="/superadmin/cron-jobs" element={<ProtectedRoute requiredRole="super_admin"><CronJobs /></ProtectedRoute>} />
              <Route path="/superadmin/whatsapp" element={<ProtectedRoute requiredRole="super_admin"><WhatsApp /></ProtectedRoute>} />
              <Route path="/superadmin/whatsapp/config" element={<ProtectedRoute requiredRole="super_admin"><WhatsAppConfig /></ProtectedRoute>} />
              <Route path="/superadmin/whatsapp/chat" element={<ProtectedRoute requiredRole="super_admin"><WhatsAppChat /></ProtectedRoute>} />
              <Route path="/superadmin/settings" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminSettings /></ProtectedRoute>} />
              <Route path="/superadmin/contact-messages" element={<ProtectedRoute requiredRole="super_admin"><ContactMessages /></ProtectedRoute>} />
              <Route path="/superadmin/package-types" element={<ProtectedRoute requiredRole="super_admin"><PackageTypes /></ProtectedRoute>} />
              
              <Route path="/superadmin/pdf-template" element={<ProtectedRoute requiredRole="super_admin"><OccurrencePdfTemplate /></ProtectedRoute>} />
              <Route path="/superadmin/smtp" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminSmtp /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </UserRoleProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
