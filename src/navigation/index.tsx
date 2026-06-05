import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors, brand } from '../theme';
import { RootStackParamList, TabParamList, AuthStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

export const navigationRef = createNavigationContainerRef<any>();

import HomeScreen from '../screens/HomeScreen';
import WorkOrdersScreen from '../screens/WorkOrdersScreen';
import NewServiceScreen from '../screens/NewServiceScreen';
import NewWorkOrderScreen from '../screens/NewWorkOrderScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatThreadScreen from '../screens/ChatThreadScreen';
import ApolloLeadsScreen from '../screens/ApolloLeadsScreen';
import ServicesScreen from '../screens/ServicesScreen';
import ManagerScreen from '../screens/ManagerScreen';
import CompanyScreen from '../screens/CompanyScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import QuotesScreen from '../screens/QuotesScreen';
import NewQuoteScreen from '../screens/NewQuoteScreen';
import QuoteDetailScreen from '../screens/QuoteDetailScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import MapScreen from '../screens/MapScreen';
import ShiftScreen from '../screens/ShiftScreen';
import EmployeeDetailScreen from '../screens/EmployeeDetailScreen';
import LocationHistoryScreen from '../screens/LocationHistoryScreen';
import GeofencesScreen from '../screens/GeofencesScreen';
import CheckinScannerScreen from '../screens/CheckinScannerScreen';
import NfcCheckinScreen from '../screens/NfcCheckinScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import WorkOrderDetailScreen from '../screens/WorkOrderDetailScreen';
import BulkAssignScreen from '../screens/BulkAssignScreen';
import RecurringTasksScreen from '../screens/RecurringTasksScreen';
import QuoteRevisionsScreen from '../screens/QuoteRevisionsScreen';
import QuoteAcceptScreen from '../screens/QuoteAcceptScreen';
import QuoteTemplatesScreen from '../screens/QuoteTemplatesScreen';
import CustomerSitesScreen from '../screens/CustomerSitesScreen';
import CustomerDocumentsScreen from '../screens/CustomerDocumentsScreen';
import CustomerHistoryScreen from '../screens/CustomerHistoryScreen';
import JobRatingScreen from '../screens/JobRatingScreen';
import CustomerPortalScreen from '../screens/CustomerPortalScreen';
import FormTemplatesScreen from '../screens/FormTemplatesScreen';
import FormBuilderScreen from '../screens/FormBuilderScreen';
import FormFillScreen from '../screens/FormFillScreen';
import FormResponseDetailScreen from '../screens/FormResponseDetailScreen';
import WorkOrderFormsScreen from '../screens/WorkOrderFormsScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import MaterialFormScreen from '../screens/MaterialFormScreen';
import WarehousesScreen from '../screens/WarehousesScreen';
import WarehouseFormScreen from '../screens/WarehouseFormScreen';
import WarehouseDetailScreen from '../screens/WarehouseDetailScreen';
import StockScreen from '../screens/StockScreen';
import StockMovementScreen from '../screens/StockMovementScreen';
import StockMovementsScreen from '../screens/StockMovementsScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import BarcodeScanScreen from '../screens/BarcodeScanScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import VehicleFormScreen from '../screens/VehicleFormScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import VehicleLogFormScreen from '../screens/VehicleLogFormScreen';
import VehicleLogsScreen from '../screens/VehicleLogsScreen';
import VehicleDamagesScreen from '../screens/VehicleDamagesScreen';
import VehicleDamageFormScreen from '../screens/VehicleDamageFormScreen';
import VehicleRouteScreen from '../screens/VehicleRouteScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SlaScreen from '../screens/SlaScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import NotificationHubScreen from '../screens/NotificationHubScreen';
import NotificationStatsScreen from '../screens/NotificationStatsScreen';
import BroadcastMessageScreen from '../screens/BroadcastMessageScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import PaymentFormScreen from '../screens/PaymentFormScreen';
import PaymentDetailScreen from '../screens/PaymentDetailScreen';
import CustomerBalancesScreen from '../screens/CustomerBalancesScreen';
import CashRegisterScreen from '../screens/CashRegisterScreen';
import FinanceHubScreen from '../screens/FinanceHubScreen';
import IncomeReportScreen from '../screens/IncomeReportScreen';
import AgingReportScreen from '../screens/AgingReportScreen';
import EInvoiceScreen from '../screens/EInvoiceScreen';
import AssetsScreen from '../screens/AssetsScreen';
import AssetFormScreen from '../screens/AssetFormScreen';
import AssetDetailScreen from '../screens/AssetDetailScreen';
import EnergyReadingFormScreen from '../screens/EnergyReadingFormScreen';
import MaintenancePlansScreen from '../screens/MaintenancePlansScreen';
import InspectionsScreen from '../screens/InspectionsScreen';
import InspectionFormScreen from '../screens/InspectionFormScreen';
import NonconformitiesScreen from '../screens/NonconformitiesScreen';
import SectorHubScreen from '../screens/SectorHubScreen';
import AssetHistoryScreen from '../screens/AssetHistoryScreen';
import SalesVisitsScreen from '../screens/SalesVisitsScreen';
import SalesVisitFormScreen from '../screens/SalesVisitFormScreen';
import AiHubScreen from '../screens/AiHubScreen';
import AiSettingsScreen from '../screens/AiSettingsScreen';
import AiAssistantScreen from '../screens/AiAssistantScreen';
import VisionScannerScreen from '../screens/VisionScannerScreen';
import VoiceNoteScreen from '../screens/VoiceNoteScreen';
import AiInsightsScreen from '../screens/AiInsightsScreen';
import AdminShiftDashboardScreen from '../screens/AdminShiftDashboardScreen';
import ShiftHistoryScreen from '../screens/ShiftHistoryScreen';
import ManagerCommandCenterScreen from '../screens/ManagerCommandCenterScreen';
import SmartPozSuggestScreen from '../screens/SmartPozSuggestScreen';
import PhotoAnalysisScreen from '../screens/PhotoAnalysisScreen';
import VoiceReportScreen from '../screens/VoiceReportScreen';
import RouteOptimizerScreen from '../screens/RouteOptimizerScreen';
import AnomaliesScreen from '../screens/AnomaliesScreen';
import WebAdminScreen from '../screens/WebAdminScreen';
import UsersAdminScreen from '../screens/UsersAdminScreen';
import UserApprovalsScreen from '../screens/UserApprovalsScreen';
import AllUsersScreen from '../screens/AllUsersScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import ExternalApiKeysScreen from '../screens/ExternalApiKeysScreen';
import ScheduledEmailsScreen from '../screens/ScheduledEmailsScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';
import IntegrationsHubScreen from '../screens/IntegrationsHubScreen';
import ApiKeysScreen from '../screens/ApiKeysScreen';
import WebhooksScreen from '../screens/WebhooksScreen';
import ExcelImportScreen from '../screens/ExcelImportScreen';
import ErpAdaptersScreen from '../screens/ErpAdaptersScreen';
import KvkkScreen from '../screens/KvkkScreen';
import BackupScreen from '../screens/BackupScreen';
import TwoFactorScreen from '../screens/TwoFactorScreen';
import AccessRulesScreen from '../screens/AccessRulesScreen';
// FAZ 17 — Veri Kalıcılığı & Auth
import ConnectivityHubScreen from '../screens/ConnectivityHubScreen';
import AuditLogScreen from '../screens/AuditLogScreen';
import SyncStatusScreen from '../screens/SyncStatusScreen';
import DataMigrationScreen from '../screens/DataMigrationScreen';
import RoleMatrixScreen from '../screens/RoleMatrixScreen';
// FAZ 18 — Konum & Personel Takibi
import PersonnelTrackingHubScreen from '../screens/PersonnelTrackingHubScreen';
import AttendanceReportScreen from '../screens/AttendanceReportScreen';
import MockLocationAlertsScreen from '../screens/MockLocationAlertsScreen';
// FAZ 19 — İş Emri Akışı
import WorkOrderFlowHubScreen from '../screens/WorkOrderFlowHubScreen';
import WorkOrderKanbanScreen from '../screens/WorkOrderKanbanScreen';
import WorkOrderCostDashboardScreen from '../screens/WorkOrderCostDashboardScreen';
import AutoAssignScreen from '../screens/AutoAssignScreen';
// FAZ 20 — Gelişmiş Teklif Sistemi
import QuoteFlowHubScreen from '../screens/QuoteFlowHubScreen';
import QuoteEmailScreen from '../screens/QuoteEmailScreen';
import QuoteShareScreen from '../screens/QuoteShareScreen';
import RecentPozScreen from '../screens/RecentPozScreen';
// FAZ 21 — Müşteri ve Lokasyon Yönetimi
import CustomerHubScreen from '../screens/CustomerHubScreen';
import CustomerRatingsAllScreen from '../screens/CustomerRatingsAllScreen';
import CustomerSitesMapScreen from '../screens/CustomerSitesMapScreen';
// FAZ 22 — Form ve Kontrol Listeleri
import FormHubScreen from '../screens/FormHubScreen';
import FormResponsesScreen from '../screens/FormResponsesScreen';
import FormStatsScreen from '../screens/FormStatsScreen';
// FAZ 23 — Stok, Malzeme ve Zimmet
import StockHubScreen from '../screens/StockHubScreen';
import LowStockAlertsScreen from '../screens/LowStockAlertsScreen';
import StockSummaryScreen from '../screens/StockSummaryScreen';
// FAZ 24 — Araç Takibi
import VehicleHubScreen from '../screens/VehicleHubScreen';
import VehicleAlertsScreen from '../screens/VehicleAlertsScreen';
import VehicleFuelStatsScreen from '../screens/VehicleFuelStatsScreen';
// FAZ 25 — Raporlama ve Dashboard
import ReportingHubScreen from '../screens/ReportingHubScreen';
import KpiOverviewScreen from '../screens/KpiOverviewScreen';
import ReportComparisonScreen from '../screens/ReportComparisonScreen';
// FAZ 32 — Teklif Modülleri / Görev / Akaryakıt / Ürün / OSOS / Bordro
import ProposalsHubScreen from '../screens/ProposalsHubScreen';
import TransformerProposalsScreen from '../screens/TransformerProposalsScreen';
import TransformerProposalFormScreen from '../screens/TransformerProposalFormScreen';
import GesProposalsScreen from '../screens/GesProposalsScreen';
import GesProposalFormScreen from '../screens/GesProposalFormScreen';
import TaskHubScreen from '../screens/TaskHubScreen';
import TasksScreen from '../screens/TasksScreen';
import TaskFormScreen from '../screens/TaskFormScreen';
import TaskKanbanScreen from '../screens/TaskKanbanScreen';
import FuelReportScreen from '../screens/FuelReportScreen';
import InventoryHubScreen from '../screens/InventoryHubScreen';
import ProductCatalogScreen from '../screens/ProductCatalogScreen';
import ProductItemsScreen from '../screens/ProductItemsScreen';
import ProductItemFormScreen from '../screens/ProductItemFormScreen';
import ProductItemDetailScreen from '../screens/ProductItemDetailScreen';
import OsosHubScreen from '../screens/OsosHubScreen';
import OsosReadingsScreen from '../screens/OsosReadingsScreen';
import OsosImportScreen from '../screens/OsosImportScreen';
import OsosAutomationScreen from '../screens/OsosAutomationScreen';
import WeeklyReportsScreen from '../screens/WeeklyReportsScreen';
import WeeklyReportDetailScreen from '../screens/WeeklyReportDetailScreen';
import PayrollHubScreen from '../screens/PayrollHubScreen';
import TimesheetScreen from '../screens/TimesheetScreen';
import PayrollRunsScreen from '../screens/PayrollRunsScreen';
import LeaveRequestsScreen from '../screens/LeaveRequestsScreen';
import PayrollDetailScreen from '../screens/PayrollDetailScreen';
// FAZ 33 — Auth ek akışlar, Profil, Görev detay, Analitik, Takvim
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TaskAnalyticsScreen from '../screens/TaskAnalyticsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CalendarEventFormScreen from '../screens/CalendarEventFormScreen';
import CalendarEventDetailScreen from '../screens/CalendarEventDetailScreen';
import ChatbotFAB from '../components/ChatbotFAB';
// FAZ 34 — Kalite, Test ve Yayına Hazırlık
import QualityHubScreen from '../screens/QualityHubScreen';
import CrashReportsScreen from '../screens/CrashReportsScreen';
import CrashReportDetailScreen from '../screens/CrashReportDetailScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import FeedbackFormScreen from '../screens/FeedbackFormScreen';
import FeedbackDetailScreen from '../screens/FeedbackDetailScreen';
import ReleaseNotesScreen from '../screens/ReleaseNotesScreen';
import PerformanceMetricsScreen from '../screens/PerformanceMetricsScreen';
import EnvironmentInfoScreen from '../screens/EnvironmentInfoScreen';
import TestPlanScreen from '../screens/TestPlanScreen';
// FAZ 35 — Yetkilendirme & Denetim
import GovernanceHubScreen from '../screens/GovernanceHubScreen';
import RoleMatrixV2Screen from '../screens/RoleMatrixV2Screen';
import DepartmentsScreen from '../screens/DepartmentsScreen';
import DepartmentFormScreen from '../screens/DepartmentFormScreen';
import RegionsScreen from '../screens/RegionsScreen';
import RegionFormScreen from '../screens/RegionFormScreen';
import PermissionsScreen from '../screens/PermissionsScreen';
import ApprovalsScreen from '../screens/ApprovalsScreen';
import ApprovalDetailScreen from '../screens/ApprovalDetailScreen';
import AuditLogV2Screen from '../screens/AuditLogV2Screen';
import AuditDetailScreen from '../screens/AuditDetailScreen';
import SessionLogsScreen from '../screens/SessionLogsScreen';
import SuspiciousLoginsScreen from '../screens/SuspiciousLoginsScreen';
import KvkkAccessLogsScreen from '../screens/KvkkAccessLogsScreen';
// FAZ 36 — Mobil Saha & Offline
import FieldHubScreen from '../screens/FieldHubScreen';
import OfflineQueueScreen from '../screens/OfflineQueueScreen';
import OfflineOpDetailScreen from '../screens/OfflineOpDetailScreen';
import ConflictResolverScreen from '../screens/ConflictResolverScreen';
import SyncHistoryScreen from '../screens/SyncHistoryScreen';
import FieldFavoritesScreen from '../screens/FieldFavoritesScreen';
import FieldSettingsScreen from '../screens/FieldSettingsScreen';
import AppUpdateScreen from '../screens/AppUpdateScreen';
import ConnectivityMonitorScreen from '../screens/ConnectivityMonitorScreen';
// FAZ 37 — Müşteri Deneyimi & Dış Paylaşım
import CustomerExperienceHubScreen from '../screens/CustomerExperienceHubScreen';
import PortalUsersScreen from '../screens/PortalUsersScreen';
import PortalUserFormScreen from '../screens/PortalUserFormScreen';
import ShareLinksScreen from '../screens/ShareLinksScreen';
import ShareLinkFormScreen from '../screens/ShareLinkFormScreen';
import ShareLinkDetailScreen from '../screens/ShareLinkDetailScreen';
import QuoteApprovalsScreen from '../screens/QuoteApprovalsScreen';
import CustomerCommentsScreen from '../screens/CustomerCommentsScreen';
import SatisfactionSurveysScreen from '../screens/SatisfactionSurveysScreen';
import SurveyDetailScreen from '../screens/SurveyDetailScreen';
import CustomerNotificationPrefsScreen from '../screens/CustomerNotificationPrefsScreen';
import AutoReportsScreen from '../screens/AutoReportsScreen';
import AutoReportFormScreen from '../screens/AutoReportFormScreen';
import BiHubScreen from '../screens/BiHubScreen';
import ExecutiveDashboardScreen from '../screens/ExecutiveDashboardScreen';
import DepartmentKpisScreen from '../screens/DepartmentKpisScreen';
import StaffPerformanceScreen from '../screens/StaffPerformanceScreen';
import VehicleCostAnalysisScreen from '../screens/VehicleCostAnalysisScreen';
import FuelConsumptionScreen from '../screens/FuelConsumptionScreen';
import StockConsumptionScreen from '../screens/StockConsumptionScreen';
import QuoteWinLossScreen from '../screens/QuoteWinLossScreen';
import CustomerProfitabilityScreen from '../screens/CustomerProfitabilityScreen';
import SlaTrackingScreen from '../screens/SlaTrackingScreen';
import RegionHeatmapScreen from '../screens/RegionHeatmapScreen';
import BudgetVsActualScreen from '../screens/BudgetVsActualScreen';
import ExecutiveSummaryScreen from '../screens/ExecutiveSummaryScreen';
import PivotExportScreen from '../screens/PivotExportScreen';
import EnterpriseIntegrationsHubScreen from '../screens/EnterpriseIntegrationsHubScreen';
import ErpConnectionsScreen from '../screens/ErpConnectionsScreen';
import ErpConnectionFormScreen from '../screens/ErpConnectionFormScreen';
import ErpSyncJobsScreen from '../screens/ErpSyncJobsScreen';
import ErpCustomersScreen from '../screens/ErpCustomersScreen';
import ErpStockScreen from '../screens/ErpStockScreen';
import ErpInvoiceDraftsScreen from '../screens/ErpInvoiceDraftsScreen';
import QuoteToOrderScreen from '../screens/QuoteToOrderScreen';
import CrmConnectionsScreen from '../screens/CrmConnectionsScreen';
import IntegrationWebhooksScreen from '../screens/IntegrationWebhooksScreen';
import IntegrationWebhookFormScreen from '../screens/IntegrationWebhookFormScreen';
import IntegrationWebhookDeliveriesScreen from '../screens/IntegrationWebhookDeliveriesScreen';
import IntegrationApiKeysScreen from '../screens/IntegrationApiKeysScreen';
import ApiUsageLogsScreen from '../screens/ApiUsageLogsScreen';
import IntegrationErrorsScreen from '../screens/IntegrationErrorsScreen';
import IntegrationHealthScreen from '../screens/IntegrationHealthScreen';
import PlatformHubScreen from '../screens/PlatformHubScreen';
import TenantsScreen from '../screens/TenantsScreen';
import TenantFormScreen from '../screens/TenantFormScreen';
import TenantMembersScreen from '../screens/TenantMembersScreen';
import TenantSettingsScreen from '../screens/TenantSettingsScreen';
import ModulesScreen from '../screens/ModulesScreen';
import PackagesScreen from '../screens/PackagesScreen';
import LicensesScreen from '../screens/LicensesScreen';
import UsageLimitsScreen from '../screens/UsageLimitsScreen';
import DbIndexHintsScreen from '../screens/DbIndexHintsScreen';
import ArchivePoliciesScreen from '../screens/ArchivePoliciesScreen';
import ArchiveJobsScreen from '../screens/ArchiveJobsScreen';
import BackupsScreen from '../screens/BackupsScreen';
import RestoreTestsScreen from '../screens/RestoreTestsScreen';
import SystemHealthScreen from '../screens/SystemHealthScreen';
import MaintenanceModeScreen from '../screens/MaintenanceModeScreen';
import AiAssistantHubScreen from '../screens/AiAssistantHubScreen';
import AgentConsoleScreen from '../screens/AgentConsoleScreen';
import AgentSuggestionsScreen from '../screens/AgentSuggestionsScreen';
import AiPermissionsScreen from '../screens/AiPermissionsScreen';
import AiSessionsScreen from '../screens/AiSessionsScreen';
import AiChatScreen from '../screens/AiChatScreen';
import CoPilotScreen from '../screens/CoPilotScreen';
import AiKnowledgeBaseScreen from '../screens/AiKnowledgeBaseScreen';
import AiPozSuggestScreen from '../screens/AiPozSuggestScreen';
import AiQuoteDraftScreen from '../screens/AiQuoteDraftScreen';
import AiQuoteDraftDetailScreen from '../screens/AiQuoteDraftDetailScreen';
import AiWorkOrderSummaryScreen from '../screens/AiWorkOrderSummaryScreen';
import AiCustomerInsightScreen from '../screens/AiCustomerInsightScreen';
import AiRiskAlertsScreen from '../screens/AiRiskAlertsScreen';
import AiDailyReportScreen from '../screens/AiDailyReportScreen';
import AiUsageLogsScreen from '../screens/AiUsageLogsScreen';
import FieldOpsHubScreen from '../screens/FieldOpsHubScreen';
import FieldTodayScreen from '../screens/FieldTodayScreen';
import FieldShiftScreen from '../screens/FieldShiftScreen';
import FieldJobsScreen from '../screens/FieldJobsScreen';
import FieldJobDetailScreen from '../screens/FieldJobDetailScreen';
import FieldChecklistScreen from '../screens/FieldChecklistScreen';
import FieldQualityCheckScreen from '../screens/FieldQualityCheckScreen';
import FieldPerformanceScreen from '../screens/FieldPerformanceScreen';
import FieldZonesScreen from '../screens/FieldZonesScreen';
import FieldShiftPlanScreen from '../screens/FieldShiftPlanScreen';
import FieldEmergencyScreen from '../screens/FieldEmergencyScreen';
import FieldCommandCenterScreen from '../screens/FieldCommandCenterScreen';
// Faz 43
import SmartQuoteHubScreen from '../screens/SmartQuoteHubScreen';
import SurveyFormsScreen from '../screens/SurveyFormsScreen';
import SurveyFormDetailScreen from '../screens/SurveyFormDetailScreen';
import PozLibraryScreen from '../screens/PozLibraryScreen';
import PriceListVersionsScreen from '../screens/PriceListVersionsScreen';
import QuoteCalculatorScreen from '../screens/QuoteCalculatorScreen';
import HvTransformerQuoteScreen from '../screens/HvTransformerQuoteScreen';
import PeriodicCheckQuoteScreen from '../screens/PeriodicCheckQuoteScreen';
import GesQuoteScreen from '../screens/GesQuoteScreen';
import CompensationQuoteScreen from '../screens/CompensationQuoteScreen';
import QuoteRevisionCompareScreen from '../screens/QuoteRevisionCompareScreen';
import QuoteOutcomesScreen from '../screens/QuoteOutcomesScreen';
import AiQuoteImprovementsScreen from '../screens/AiQuoteImprovementsScreen';
// Faz 44
import LiveOpsHubScreen from '../screens/LiveOpsHubScreen';
import LiveOpsMapScreen from '../screens/LiveOpsMapScreen';
import JobHeatmapScreen from '../screens/JobHeatmapScreen';
import PersonnelAvailabilityScreen from '../screens/PersonnelAvailabilityScreen';
import SmartRouteSuggestScreen from '../screens/SmartRouteSuggestScreen';
import EtaEstimateScreen from '../screens/EtaEstimateScreen';
import RouteDeviationAlertsScreen from '../screens/RouteDeviationAlertsScreen';
import SiteEventLogsScreen from '../screens/SiteEventLogsScreen';
import TeamPerformanceLayerScreen from '../screens/TeamPerformanceLayerScreen';
import OperationReplayScreen from '../screens/OperationReplayScreen';
// Faz 45
import ComplianceHubScreen from '../screens/ComplianceHubScreen';
import NonConformityScreen from '../screens/NonConformityScreen';
import CapaScreen from '../screens/CapaScreen';
import SafetyChecklistsScreen from '../screens/SafetyChecklistsScreen';
import RiskAssessmentScreen from '../screens/RiskAssessmentScreen';
import AuditScheduleScreen from '../screens/AuditScheduleScreen';
import AuditScoringScreen from '../screens/AuditScoringScreen';
import NcPhotoEvidenceScreen from '../screens/NcPhotoEvidenceScreen';
import NcAssignmentScreen from '../screens/NcAssignmentScreen';
import QualityDashboardScreen from '../screens/QualityDashboardScreen';
import AuditReportScreen from '../screens/AuditReportScreen';
// Faz 46
import AssetHubScreen from '../screens/AssetHubScreen';
import AssetListScreen from '../screens/AssetListScreen';
import AssetQrScreen from '../screens/AssetQrScreen';
import AssetMaintenanceHistoryScreen from '../screens/AssetMaintenanceHistoryScreen';
import AssetFaultHistoryScreen from '../screens/AssetFaultHistoryScreen';
import WarrantyTrackingScreen from '../screens/WarrantyTrackingScreen';
import MaintenancePlanScreen from '../screens/MaintenancePlanScreen';
import MaintenanceAlertsScreen from '../screens/MaintenanceAlertsScreen';
import AssetCostAnalysisScreen from '../screens/AssetCostAnalysisScreen';
import EnergyAssetTypesScreen from '../screens/EnergyAssetTypesScreen';
import ServiceCardScreen from '../screens/ServiceCardScreen';
// Faz 47
import ExecHubScreen from '../screens/ExecHubScreen';
import CeoSummaryScreen from '../screens/CeoSummaryScreen';
import OpsHealthScoreScreen from '../screens/OpsHealthScoreScreen';
import RevenueKpiScreen from '../screens/RevenueKpiScreen';
import ProfitableCustomersScreen from '../screens/ProfitableCustomersScreen';
import CostlyWorkOrdersScreen from '../screens/CostlyWorkOrdersScreen';
import EmployeeRankingScreen from '../screens/EmployeeRankingScreen';
import VehicleEfficiencyScreen from '../screens/VehicleEfficiencyScreen';
import StockTurnoverScreen from '../screens/StockTurnoverScreen';
import QuoteConversionScreen from '../screens/QuoteConversionScreen';
import AiExecSummaryScreen from '../screens/AiExecSummaryScreen';
// Faz 48 — Müşteri Portalı 2.0
import CpHubScreen from '../screens/CpHubScreen';
import CpLoginScreen from '../screens/CpLoginScreen';
import CpDashboardScreen from '../screens/CpDashboardScreen';
import CpQuoteApprovalScreen from '../screens/CpQuoteApprovalScreen';
import CpWorkOrderTrackingScreen from '../screens/CpWorkOrderTrackingScreen';
import CpServiceRequestScreen from '../screens/CpServiceRequestScreen';
import CpDocumentArchiveScreen from '../screens/CpDocumentArchiveScreen';
import CpSatisfactionScreen from '../screens/CpSatisfactionScreen';
import CpNotificationsScreen from '../screens/CpNotificationsScreen';
import CpBrandingScreen from '../screens/CpBrandingScreen';
import CpShareLinkSecurityScreen from '../screens/CpShareLinkSecurityScreen';
// Faz 49 — Güvenlik, KVKK ve Kurumsal Dayanıklılık
import SecHubScreen from '../screens/SecHubScreen';
import SecClassificationScreen from '../screens/SecClassificationScreen';
import KvkkRequestsScreen from '../screens/KvkkRequestsScreen';
import DataExportScreen from '../screens/DataExportScreen';
import DataErasureScreen from '../screens/DataErasureScreen';
import SecDevicesScreen from '../screens/SecDevicesScreen';
import SuspiciousActivityScreen from '../screens/SuspiciousActivityScreen';
import AdminAlertsScreen from '../screens/AdminAlertsScreen';
import BackupReportScreen from '../screens/BackupReportScreen';
import DrPlanScreen from '../screens/DrPlanScreen';
import SecHealthScreen from '../screens/SecHealthScreen';
// Faz 50 — Ürünleşme, SaaS ve Çoklu Firma Altyapısı
import SaasHubScreen from '../screens/SaasHubScreen';
import SaasTenantsScreen from '../screens/SaasTenantsScreen';
import SaasIsolationScreen from '../screens/SaasIsolationScreen';
import SaasModulesScreen from '../screens/SaasModulesScreen';
import SaasPackagesScreen from '../screens/SaasPackagesScreen';
import SaasLicensesScreen from '../screens/SaasLicensesScreen';
import SaasUsageLimitsScreen from '../screens/SaasUsageLimitsScreen';
import SaasBrandingScreen from '../screens/SaasBrandingScreen';
import SaasBillingScreen from '../screens/SaasBillingScreen';
import SaasSuperAdminScreen from '../screens/SaasSuperAdminScreen';
import SaasHealthScreen from '../screens/SaasHealthScreen';
// Faz 51 — Yayına Alma, Derleme ve Platform Kontrolü
import DepHubScreen from '../screens/DepHubScreen';
import DepSupabaseScreen from '../screens/DepSupabaseScreen';
import DepRlsPoliciesScreen from '../screens/DepRlsPoliciesScreen';
import DepStorageScreen from '../screens/DepStorageScreen';
import DepNetlifyScreen from '../screens/DepNetlifyScreen';
import DepBuildErrorsScreen from '../screens/DepBuildErrorsScreen';
import DepAiProvidersScreen from '../screens/DepAiProvidersScreen';
import DepAiSecurityScreen from '../screens/DepAiSecurityScreen';
import DepWebWarningsScreen from '../screens/DepWebWarningsScreen';
import DepMobileWarningsScreen from '../screens/DepMobileWarningsScreen';
import DepApkBuildScreen from '../screens/DepApkBuildScreen';
// Faz 52 — Hata Temizliği, Refactor ve Kod Kalitesi
import QaHubScreen from '../screens/QaHubScreen';
import QaConsoleScreen from '../screens/QaConsoleScreen';
import QaUnusedScreen from '../screens/QaUnusedScreen';
import QaSharedScreen from '../screens/QaSharedScreen';
import QaApiErrorsScreen from '../screens/QaApiErrorsScreen';
import QaUiStatesScreen from '../screens/QaUiStatesScreen';
import QaTypesScreen from '../screens/QaTypesScreen';
import QaModulesScreen from '../screens/QaModulesScreen';
import QaPerformanceScreen from '../screens/QaPerformanceScreen';
import QaQueriesScreen from '../screens/QaQueriesScreen';
import QaReportScreen from '../screens/QaReportScreen';
// Faz 53 — Kabul Testleri
import UatHubScreen from '../screens/UatHubScreen';
import UatAdminScreen from '../screens/UatAdminScreen';
import UatManagerScreen from '../screens/UatManagerScreen';
import UatFieldScreen from '../screens/UatFieldScreen';
import UatCustomerScreen from '../screens/UatCustomerScreen';
import UatQuoteScreen from '../screens/UatQuoteScreen';
import UatWorkOrderScreen from '../screens/UatWorkOrderScreen';
import UatStockScreen from '../screens/UatStockScreen';
import UatLocationScreen from '../screens/UatLocationScreen';
import UatNotificationScreen from '../screens/UatNotificationScreen';
import UatReportScreen from '../screens/UatReportScreen';
// Faz 54 — Dokümantasyon ve Eğitim
import DocHubScreen from '../screens/DocHubScreen';
import DocAdminGuideScreen from '../screens/DocAdminGuideScreen';
import DocManagerGuideScreen from '../screens/DocManagerGuideScreen';
import DocFieldGuideScreen from '../screens/DocFieldGuideScreen';
import DocCustomerGuideScreen from '../screens/DocCustomerGuideScreen';
import DocSupabaseOpsScreen from '../screens/DocSupabaseOpsScreen';
import DocNetlifyOpsScreen from '../screens/DocNetlifyOpsScreen';
import DocApkOpsScreen from '../screens/DocApkOpsScreen';
import DocFaqScreen from '../screens/DocFaqScreen';
import DocTrainingScreen from '../screens/DocTrainingScreen';
import DocChecklistScreen from '../screens/DocChecklistScreen';
// Faz 55 — Canlı Kullanım, İzleme ve Sürekli İyileştirme
import GoLiveHubScreen from '../screens/GoLiveHubScreen';
import GoLiveChecklistScreen from '../screens/GoLiveChecklistScreen';
import GoLiveMonitorScreen from '../screens/GoLiveMonitorScreen';
import GoLiveLogsScreen from '../screens/GoLiveLogsScreen';
import GoLiveFeedbackScreen from '../screens/GoLiveFeedbackScreen';
import GoLiveBugTasksScreen from '../screens/GoLiveBugTasksScreen';
import GoLiveWeeklyScreen from '../screens/GoLiveWeeklyScreen';
import GoLiveMonthlyScreen from '../screens/GoLiveMonthlyScreen';
import GoLiveBacklogScreen from '../screens/GoLiveBacklogScreen';
import GoLiveReleasesScreen from '../screens/GoLiveReleasesScreen';
import GoLiveSupportScreen from '../screens/GoLiveSupportScreen';
import CovHubScreen from '../screens/CovHubScreen';
import CovMatrixScreen from '../screens/CovMatrixScreen';
import CovCategoryScreen from '../screens/CovCategoryScreen';
import CovSummaryScreen from '../screens/CovSummaryScreen';
import ExtHubScreen from '../screens/ExtHubScreen';
import ExtConfigScreen from '../screens/ExtConfigScreen';
import ExtLogsScreen from '../screens/ExtLogsScreen';
import AdvHubScreen from '../screens/AdvHubScreen';
import AdvEcommerceScreen from '../screens/AdvEcommerceScreen';
import AdvCallCenterScreen from '../screens/AdvCallCenterScreen';
import AdvBIScreen from '../screens/AdvBIScreen';
import AdvVoiceAIScreen from '../screens/AdvVoiceAIScreen';
import AdvCollectionForecastScreen from '../screens/AdvCollectionForecastScreen';
import AdvRfmScreen from '../screens/AdvRfmScreen';
import OrdHubScreen from '../screens/OrdHubScreen';
import OrdListScreen from '../screens/OrdListScreen';
import OrdFormScreen from '../screens/OrdFormScreen';
import OrdDetailScreen from '../screens/OrdDetailScreen';
import OrdRecurringScreen from '../screens/OrdRecurringScreen';
import OrdAnalyticsScreen from '../screens/OrdAnalyticsScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const GateStackNav = createNativeStackNavigator();

function MainTabs() {
  const { profile, isDemoMode } = useAuth();
  const insets = useSafeAreaInsets();
  const role = profile?.role ?? 'engineer';
  const canSeeManager = isDemoMode || role === 'admin' || role === 'manager';
  // Saha personeli: teklif/mali bölümleri gizle.
  const canSeeQuotes = isDemoMode || role !== 'field';
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.secondary,
          borderTopColor: colors.border.primary,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: brand.green,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="WorkOrders"
        component={WorkOrdersScreen}
        options={{
          tabBarLabel: 'İş Emirleri',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="NewService"
        component={NewServiceScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View
              style={{
                backgroundColor: brand.green,
                borderRadius: 30,
                width: 56,
                height: 56,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 22,
                shadowColor: brand.green,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.45,
                shadowRadius: 8,
                elevation: 10,
              }}
            >
              <Ionicons name="add" color={colors.bg.primary} size={30} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Quotes"
        component={QuotesScreen}
        options={{
          tabBarLabel: 'Teklifler',
          tabBarItemStyle: canSeeQuotes ? undefined : { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Manager"
        component={ManagerScreen}
        options={{
          tabBarLabel: 'Yönetici',
          tabBarItemStyle: canSeeManager ? undefined : { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function GateFlow() {
  return (
    <GateStackNav.Navigator screenOptions={{ headerShown: false }}>
      <GateStackNav.Screen name="PendingApproval" component={PendingApprovalScreen} />
    </GateStackNav.Navigator>
  );
}

export default function AppNavigator() {
  const { session, isDemoMode, loading, profile, user } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={brand.green} />
      </View>
    );
  }

  // Onay kapısı: oturum var ama profil henüz yüklenmedi → bekle
  const sessionActive = !!session;
  const profileLoading = sessionActive && !!user && !profile;
  if (profileLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={brand.green} />
      </View>
    );
  }

  // Onay kapısı: profil yüklendi ve approval_status pending/rejected ise bloke et
  const approvalStatus = profile?.approval_status;
  const blockedByApproval =
    sessionActive && !isDemoMode && (approvalStatus === 'pending' || approvalStatus === 'rejected');

  return (
    <NavigationContainer ref={navigationRef}>
      {blockedByApproval ? (
        <GateFlow />
      ) : session || isDemoMode ? (
        <>
          <MainStack />
          <ChatbotFAB />
        </>
      ) : (
        <AuthFlow />
      )}
    </NavigationContainer>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="NewWorkOrder" component={NewWorkOrderScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ApolloLeads" component={ApolloLeadsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Company"
        component={CompanyScreen}
        options={{
          headerShown: true,
          title: 'Firma Bilgisi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          headerShown: true,
          title: 'Masraflarım',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          headerShown: true,
          title: 'Servislerim',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="NewQuote"
        component={NewQuoteScreen}
        options={{
          headerShown: true,
          title: 'Yeni Teklif',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="QuoteDetail"
        component={QuoteDetailScreen}
        options={{
          headerShown: true,
          title: 'Teklif Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Customers"
        component={CustomersScreen}
        options={{
          headerShown: true,
          title: 'Müşteriler',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerForm"
        component={CustomerFormScreen}
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as any)?.customerId ? 'Müşteri Düzenle' : 'Yeni Müşteri',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        })}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{
          headerShown: true,
          title: 'Saha Haritası',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Shift"
        component={ShiftScreen}
        options={{
          headerShown: true,
          title: 'Mesai',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="EmployeeDetail"
        component={EmployeeDetailScreen}
        options={{
          headerShown: true,
          title: 'Personel Detay',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="LocationHistory"
        component={LocationHistoryScreen}
        options={{
          headerShown: true,
          title: 'Konum Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Geofences"
        component={GeofencesScreen}
        options={{
          headerShown: true,
          title: 'Bölgeler (Geofence)',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CheckinScanner"
        component={CheckinScannerScreen}
        options={{
          headerShown: true,
          title: 'QR Check-in',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="NfcCheckin"
        component={NfcCheckinScreen}
        options={{
          headerShown: true,
          title: 'NFC Check-in',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          headerShown: true,
          title: 'Şifre Değiştir',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="WorkOrderDetail"
        component={WorkOrderDetailScreen}
        options={{
          headerShown: true,
          title: 'İş Emri Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="BulkAssign"
        component={BulkAssignScreen}
        options={{
          headerShown: true,
          title: 'Toplu Atama',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="RecurringTasks"
        component={RecurringTasksScreen}
        options={{
          headerShown: true,
          title: 'Periyodik Görevler',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="QuoteRevisions"
        component={QuoteRevisionsScreen}
        options={{
          headerShown: true,
          title: 'Revizyon Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="QuoteAccept"
        component={QuoteAcceptScreen}
        options={{
          headerShown: true,
          title: 'Teklif Kabul',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="QuoteTemplates"
        component={QuoteTemplatesScreen}
        options={{
          headerShown: true,
          title: 'Teklif Şablonları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerSites"
        component={CustomerSitesScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Sahaları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerDocuments"
        component={CustomerDocumentsScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Belgeleri',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerHistory"
        component={CustomerHistoryScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="JobRating"
        component={JobRatingScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Puanı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerPortal"
        component={CustomerPortalScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Portalı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="FormTemplates"
        component={FormTemplatesScreen}
        options={{
          headerShown: true,
          title: 'Form Şablonları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="FormBuilder"
        component={FormBuilderScreen}
        options={{
          headerShown: true,
          title: 'Form Tasarımcısı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="FormFill"
        component={FormFillScreen}
        options={{
          headerShown: true,
          title: 'Form Doldur',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="FormResponseDetail"
        component={FormResponseDetailScreen}
        options={{
          headerShown: true,
          title: 'Form Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="WorkOrderForms"
        component={WorkOrderFormsScreen}
        options={{
          headerShown: true,
          title: 'İş Emri Formları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Materials"
        component={MaterialsScreen}
        options={{
          headerShown: true,
          title: 'Malzemeler',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="MaterialForm"
        component={MaterialFormScreen}
        options={{
          headerShown: true,
          title: 'Malzeme',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Warehouses"
        component={WarehousesScreen}
        options={{
          headerShown: true,
          title: 'Depo & Zimmet',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="WarehouseForm"
        component={WarehouseFormScreen}
        options={{
          headerShown: true,
          title: 'Depo / Zimmet',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="WarehouseDetail"
        component={WarehouseDetailScreen}
        options={{
          headerShown: true,
          title: 'Detay',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Stock"
        component={StockScreen}
        options={{
          headerShown: true,
          title: 'Stok',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="StockMovement"
        component={StockMovementScreen}
        options={{
          headerShown: true,
          title: 'Stok Hareketi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="StockMovements"
        component={StockMovementsScreen}
        options={{
          headerShown: true,
          title: 'Hareket Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Assignments"
        component={AssignmentsScreen}
        options={{
          headerShown: true,
          title: 'Zimmet',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen}
        options={{
          headerShown: true,
          title: 'Barkod Tara',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Vehicles"
        component={VehiclesScreen}
        options={{
          headerShown: true,
          title: 'Araçlar',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleForm"
        component={VehicleFormScreen}
        options={{
          headerShown: true,
          title: 'Araç',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleDetail"
        component={VehicleDetailScreen}
        options={{
          headerShown: true,
          title: 'Araç Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleLogForm"
        component={VehicleLogFormScreen}
        options={{
          headerShown: true,
          title: 'Araç Kaydı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleLogs"
        component={VehicleLogsScreen}
        options={{
          headerShown: true,
          title: 'Araç Kayıtları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleDamages"
        component={VehicleDamagesScreen}
        options={{
          headerShown: true,
          title: 'Araç Hasarları',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleDamageForm"
        component={VehicleDamageFormScreen}
        options={{
          headerShown: true,
          title: 'Hasar',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="VehicleRoute"
        component={VehicleRouteScreen}
        options={{
          headerShown: true,
          title: 'Rota Geçmişi',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          headerShown: true,
          title: 'Raporlar',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{
          headerShown: true,
          title: 'Rapor Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: true,
          title: 'Dashboard',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Sla"
        component={SlaScreen}
        options={{
          headerShown: true,
          title: 'Geciken İşler',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: true,
          title: 'Bildirimler',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{
          headerShown: true,
          title: 'Bildirim Tercihleri',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="NotificationHub"
        component={NotificationHubScreen}
        options={{
          headerShown: true,
          title: 'Bildirim & İletişim',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="NotificationStats"
        component={NotificationStatsScreen}
        options={{
          headerShown: true,
          title: 'Bildirim İstatistik',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="BroadcastMessage"
        component={BroadcastMessageScreen}
        options={{
          headerShown: true,
          title: 'Manuel Bildirim',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{
          headerShown: true,
          title: 'Tahsilatlar',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="PaymentForm"
        component={PaymentFormScreen}
        options={{
          headerShown: true,
          title: 'Tahsilat',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="PaymentDetail"
        component={PaymentDetailScreen}
        options={{
          headerShown: true,
          title: 'Tahsilat Detayı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CustomerBalances"
        component={CustomerBalancesScreen}
        options={{
          headerShown: true,
          title: 'Müşteri Bakiyeleri',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="CashRegister"
        component={CashRegisterScreen}
        options={{
          headerShown: true,
          title: 'Personel Kasa',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="FinanceHub"
        component={FinanceHubScreen}
        options={{
          headerShown: true,
          title: 'Finans & Tahsilat',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="IncomeReport"
        component={IncomeReportScreen}
        options={{
          headerShown: true,
          title: 'Gelir Raporu',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="AgingReport"
        component={AgingReportScreen}
        options={{
          headerShown: true,
          title: 'Tahsilat Yaşı',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="EInvoice"
        component={EInvoiceScreen}
        options={{
          headerShown: true,
          title: 'E-Fatura',
          headerStyle: { backgroundColor: colors.bg.secondary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen name="Assets" component={AssetsScreen} options={{ headerShown: true, title: 'Cihazlar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AssetForm" component={AssetFormScreen} options={({ route }) => ({ headerShown: true, title: (route.params as any)?.assetId ? 'Cihaz Düzenle' : 'Yeni Cihaz', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } })} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} options={{ headerShown: true, title: 'Cihaz Detayı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="EnergyReadingForm" component={EnergyReadingFormScreen} options={{ headerShown: true, title: 'Ölçüm Kaydı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="MaintenancePlans" component={MaintenancePlansScreen} options={{ headerShown: true, title: 'Bakım Planları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Inspections" component={InspectionsScreen} options={{ headerShown: true, title: 'Denetimler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="InspectionForm" component={InspectionFormScreen} options={({ route }) => ({ headerShown: true, title: (route.params as any)?.inspectionId ? 'Denetim Düzenle' : 'Yeni Denetim', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } })} />
      <Stack.Screen name="Nonconformities" component={NonconformitiesScreen} options={{ headerShown: true, title: 'Uygunsuzluklar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SectorHub" component={SectorHubScreen} options={{ headerShown: true, title: 'Sektörel Modüller', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AssetHistory" component={AssetHistoryScreen} options={{ headerShown: true, title: 'Varlık Geçmişi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SalesVisits" component={SalesVisitsScreen} options={{ headerShown: true, title: 'Satış Ziyaretleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SalesVisitForm" component={SalesVisitFormScreen} options={({ route }) => ({ headerShown: true, title: (route.params as any)?.visitId ? 'Ziyaret Düzenle' : 'Yeni Ziyaret', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } })} />
      <Stack.Screen name="AiHub" component={AiHubScreen} options={{ headerShown: true, title: 'AI Asistan', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiAssistant" component={AiAssistantScreen} options={{ headerShown: true, title: 'AI Asistan (NotebookLM)', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="VisionScanner" component={VisionScannerScreen} options={{ headerShown: true, title: 'AI Vision Tarayıcı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="VoiceNote" component={VoiceNoteScreen} options={{ headerShown: true, title: 'Ses Notu Asistanı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiInsights" component={AiInsightsScreen} options={{ headerShown: true, title: 'AI Insights', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiSettings" component={AiSettingsScreen} options={{ headerShown: true, title: 'AI Ayarları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AdminShiftDashboard" component={AdminShiftDashboardScreen} options={{ headerShown: true, title: 'Canlı Mesai', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ShiftHistory" component={ShiftHistoryScreen} options={{ headerShown: true, title: 'Mesai Geçmişi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ManagerCommandCenter" component={ManagerCommandCenterScreen} options={{ headerShown: true, title: 'Yönetici Komuta Merkezi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SmartPozSuggest" component={SmartPozSuggestScreen} options={{ headerShown: true, title: 'Akıllı POZ Önerisi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PhotoAnalysis" component={PhotoAnalysisScreen} options={{ headerShown: true, title: 'Fotoğraf Analizi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="VoiceReport" component={VoiceReportScreen} options={{ headerShown: true, title: 'Sesli Rapor', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RouteOptimizer" component={RouteOptimizerScreen} options={{ headerShown: true, title: 'Rota Optimizasyonu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Anomalies" component={AnomaliesScreen} options={{ headerShown: true, title: 'Anomali Tespiti', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="WebAdmin" component={WebAdminScreen} options={{ headerShown: true, title: 'Web Admin', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UsersAdmin" component={UsersAdminScreen} options={{ headerShown: true, title: 'Kullanıcılar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UserApprovals" component={UserApprovalsScreen} options={{ headerShown: true, title: 'Kullanıcı Onayları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AllUsers" component={AllUsersScreen} options={{ headerShown: true, title: 'Tüm Kullanıcılar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ExternalApiKeys" component={ExternalApiKeysScreen} options={{ headerShown: true, title: 'Dış Servis API Anahtarları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ScheduledEmails" component={ScheduledEmailsScreen} options={{ headerShown: true, title: 'Planlı Rapor Mailleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} options={{ headerShown: true, title: 'Canlı Takip', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="IntegrationsHub" component={IntegrationsHubScreen} options={{ headerShown: true, title: 'Entegrasyon & Güvenlik', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ApiKeys" component={ApiKeysScreen} options={{ headerShown: true, title: 'API Anahtarları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Webhooks" component={WebhooksScreen} options={{ headerShown: true, title: 'Webhook', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ExcelImport" component={ExcelImportScreen} options={{ headerShown: true, title: 'Excel İçe Aktarma', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ErpAdapters" component={ErpAdaptersScreen} options={{ headerShown: true, title: 'ERP / CRM', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Kvkk" component={KvkkScreen} options={{ headerShown: true, title: 'KVKK', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Backup" component={BackupScreen} options={{ headerShown: true, title: 'Yedekleme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TwoFactor" component={TwoFactorScreen} options={{ headerShown: true, title: 'İki Adımlı Doğrulama', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AccessRules" component={AccessRulesScreen} options={{ headerShown: true, title: 'Erişim Kuralları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 17 — Veri Kalıcılığı & Auth */}
      <Stack.Screen name="ConnectivityHub" component={ConnectivityHubScreen} options={{ headerShown: true, title: 'Veri Kalıcılığı & Auth', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AuditLog" component={AuditLogScreen} options={{ headerShown: true, title: 'Denetim Kayıtları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SyncStatus" component={SyncStatusScreen} options={{ headerShown: true, title: 'Senkronizasyon', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DataMigration" component={DataMigrationScreen} options={{ headerShown: true, title: 'Veri Taşıma', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RoleMatrix" component={RoleMatrixScreen} options={{ headerShown: true, title: 'Rol Matrisi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 18 — Konum & Personel Takibi */}
      <Stack.Screen name="PersonnelTrackingHub" component={PersonnelTrackingHubScreen} options={{ headerShown: true, title: 'Saha Takibi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ headerShown: true, title: 'Puantaj', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="MockLocationAlerts" component={MockLocationAlertsScreen} options={{ headerShown: true, title: 'Sahte Konum Uyarıları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="WorkOrderFlowHub" component={WorkOrderFlowHubScreen} options={{ headerShown: true, title: 'İş Emri Akışı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="WorkOrderKanban" component={WorkOrderKanbanScreen} options={{ headerShown: true, title: 'Kanban', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="WorkOrderCostDashboard" component={WorkOrderCostDashboardScreen} options={{ headerShown: true, title: 'Maliyet Panosu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AutoAssign" component={AutoAssignScreen} options={{ headerShown: true, title: 'Otomatik Atama', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteFlowHub" component={QuoteFlowHubScreen} options={{ headerShown: true, title: 'Teklif Sistemi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteEmail" component={QuoteEmailScreen} options={{ headerShown: true, title: 'Teklifi Gönder', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteShare" component={QuoteShareScreen} options={{ headerShown: true, title: 'Teklif Paylaş', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RecentPoz" component={RecentPozScreen} options={{ headerShown: true, title: 'Son Kullanılan POZ', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CustomerHub" component={CustomerHubScreen} options={{ headerShown: true, title: 'Müşteri Merkezi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CustomerRatingsAll" component={CustomerRatingsAllScreen} options={{ headerShown: true, title: 'Memnuniyet Puanları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CustomerSitesMap" component={CustomerSitesMapScreen} options={{ headerShown: true, title: 'Saha Haritası', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FormHub" component={FormHubScreen} options={{ headerShown: true, title: 'Form & Kontrol', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FormResponses" component={FormResponsesScreen} options={{ headerShown: true, title: 'Form Yanıtları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FormStats" component={FormStatsScreen} options={{ headerShown: true, title: 'Form İstatistik', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 23 — Stok, Malzeme ve Zimmet */}
      <Stack.Screen name="StockHub" component={StockHubScreen} options={{ headerShown: true, title: 'Stok & Zimmet', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="LowStockAlerts" component={LowStockAlertsScreen} options={{ headerShown: true, title: 'Düşük Stok', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="StockSummary" component={StockSummaryScreen} options={{ headerShown: true, title: 'Stok Özeti', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 24 — Araç Takibi */}
      <Stack.Screen name="VehicleHub" component={VehicleHubScreen} options={{ headerShown: true, title: 'Araç & Filo', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="VehicleAlerts" component={VehicleAlertsScreen} options={{ headerShown: true, title: 'Vade Uyarıları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="VehicleFuelStats" component={VehicleFuelStatsScreen} options={{ headerShown: true, title: 'Yakıt İstatistik', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 25 — Raporlama ve Dashboard */}
      <Stack.Screen name="ReportingHub" component={ReportingHubScreen} options={{ headerShown: true, title: 'Raporlama & Dashboard', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="KpiOverview" component={KpiOverviewScreen} options={{ headerShown: true, title: 'KPI Özeti', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ReportComparison" component={ReportComparisonScreen} options={{ headerShown: true, title: 'Dönem Karşılaştır', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 32 — Teklif Modülleri / Görev / Akaryakıt / Ürün / OSOS / Bordro */}
      <Stack.Screen name="ProposalsHub" component={ProposalsHubScreen} options={{ headerShown: true, title: 'Teklif Modülleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TransformerProposals" component={TransformerProposalsScreen} options={{ headerShown: true, title: 'YG Trafo Teklifleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TransformerProposalForm" component={TransformerProposalFormScreen} options={{ headerShown: true, title: 'YG Trafo Teklifi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GesProposals" component={GesProposalsScreen} options={{ headerShown: true, title: 'GES Teklifleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GesProposalForm" component={GesProposalFormScreen} options={{ headerShown: true, title: 'GES Teklifi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TaskHub" component={TaskHubScreen} options={{ headerShown: true, title: 'Görev Yönetimi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Tasks" component={TasksScreen} options={{ headerShown: true, title: 'Görevler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ headerShown: true, title: 'Görev', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TaskKanban" component={TaskKanbanScreen} options={{ headerShown: true, title: 'Kanban', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FuelReport" component={FuelReportScreen} options={{ headerShown: true, title: 'Akaryakıt Raporu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="InventoryHub" component={InventoryHubScreen} options={{ headerShown: true, title: 'Ürün & Envanter', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ProductItems" component={ProductItemsScreen} options={{ headerShown: true, title: 'Ürünler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ProductItemForm" component={ProductItemFormScreen} options={{ headerShown: true, title: 'Ürün', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ProductItemDetail" component={ProductItemDetailScreen} options={{ headerShown: true, title: 'Ürün Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ProductCatalog" component={ProductCatalogScreen} options={{ headerShown: true, title: 'Ürün Kataloğu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OsosHub" component={OsosHubScreen} options={{ headerShown: true, title: 'OSOS', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OsosReadings" component={OsosReadingsScreen} options={{ headerShown: true, title: 'Sayaç Okumaları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OsosImport" component={OsosImportScreen} options={{ headerShown: true, title: 'CSV İçe Aktar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="WeeklyReports" component={WeeklyReportsScreen} options={{ headerShown: true, title: 'Haftalık Raporlar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="WeeklyReportDetail" component={WeeklyReportDetailScreen} options={{ headerShown: true, title: 'Rapor Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OsosAutomation" component={OsosAutomationScreen} options={{ headerShown: true, title: 'OSOS Otomasyon', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PayrollHub" component={PayrollHubScreen} options={{ headerShown: true, title: 'Bordro & Puantaj', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Timesheet" component={TimesheetScreen} options={{ headerShown: true, title: 'Puantaj', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PayrollRuns" component={PayrollRunsScreen} options={{ headerShown: true, title: 'Bordrolar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="LeaveRequests" component={LeaveRequestsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PayrollDetail" component={PayrollDetailScreen} options={{ headerShown: true, title: 'Bordro Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 33 — Auth, Profil, Görev detay, Analitik, Takvim */}
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profil', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ headerShown: true, title: 'Görev Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TaskAnalytics" component={TaskAnalyticsScreen} options={{ headerShown: true, title: 'Görev Analitik', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ headerShown: true, title: 'Takvim', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CalendarEventForm" component={CalendarEventFormScreen} options={{ headerShown: true, title: 'Etkinlik', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CalendarEventDetail" component={CalendarEventDetailScreen} options={{ headerShown: true, title: 'Etkinlik Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 34 — Kalite */}
      <Stack.Screen name="QualityHub" component={QualityHubScreen} options={{ headerShown: true, title: 'Kalite & Yayın', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CrashReports" component={CrashReportsScreen} options={{ headerShown: true, title: 'Crash Raporları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CrashReportDetail" component={CrashReportDetailScreen} options={{ headerShown: true, title: 'Crash Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ headerShown: true, title: 'Geri Bildirim', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FeedbackForm" component={FeedbackFormScreen} options={{ headerShown: true, title: 'Yeni Geri Bildirim', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FeedbackDetail" component={FeedbackDetailScreen} options={{ headerShown: true, title: 'Geri Bildirim Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ReleaseNotes" component={ReleaseNotesScreen} options={{ headerShown: true, title: 'Sürüm Notları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PerformanceMetrics" component={PerformanceMetricsScreen} options={{ headerShown: true, title: 'Performans', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="EnvironmentInfo" component={EnvironmentInfoScreen} options={{ headerShown: true, title: 'Ortam Bilgisi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TestPlan" component={TestPlanScreen} options={{ headerShown: true, title: 'Test Planı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 35 — Yetkilendirme & Denetim */}
      <Stack.Screen name="GovernanceHub" component={GovernanceHubScreen} options={{ headerShown: true, title: 'Yetkilendirme & Denetim', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RoleMatrixV2" component={RoleMatrixV2Screen} options={{ headerShown: true, title: 'Rol & İzin Matrisi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} options={{ headerShown: true, title: 'Departmanlar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepartmentForm" component={DepartmentFormScreen} options={{ headerShown: true, title: 'Departman', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Regions" component={RegionsScreen} options={{ headerShown: true, title: 'Bölgeler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RegionForm" component={RegionFormScreen} options={{ headerShown: true, title: 'Bölge', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PermissionsScreen" component={PermissionsScreen} options={{ headerShown: true, title: 'Ekran İzinleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ headerShown: true, title: 'Onay Akışları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} options={{ headerShown: true, title: 'Onay Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AuditLogV2" component={AuditLogV2Screen} options={{ headerShown: true, title: 'Audit Log', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AuditDetail" component={AuditDetailScreen} options={{ headerShown: true, title: 'Audit Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SessionLogs" component={SessionLogsScreen} options={{ headerShown: true, title: 'Oturum Geçmişi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SuspiciousLogins" component={SuspiciousLoginsScreen} options={{ headerShown: true, title: 'Şüpheli Girişler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="KvkkAccessLogs" component={KvkkAccessLogsScreen} options={{ headerShown: true, title: 'KVKK Erişim', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 36 — Mobil Saha & Offline */}
      <Stack.Screen name="FieldHub" component={FieldHubScreen} options={{ headerShown: true, title: 'Mobil Saha', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OfflineQueue" component={OfflineQueueScreen} options={{ headerShown: true, title: 'Offline Kuyruk', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OfflineOpDetail" component={OfflineOpDetailScreen} options={{ headerShown: true, title: 'İşlem Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ConflictResolver" component={ConflictResolverScreen} options={{ headerShown: true, title: 'Çakışma Çöz', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SyncHistory" component={SyncHistoryScreen} options={{ headerShown: true, title: 'Senkron Geçmişi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldFavorites" component={FieldFavoritesScreen} options={{ headerShown: true, title: 'Favoriler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldSettings" component={FieldSettingsScreen} options={{ headerShown: true, title: 'Saha Ayarları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AppUpdate" component={AppUpdateScreen} options={{ headerShown: true, title: 'Uygulama Güncelleme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ConnectivityMonitor" component={ConnectivityMonitorScreen} options={{ headerShown: true, title: 'Bağlantı Monitörü', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* FAZ 37 — Müşteri Deneyimi & Dış Paylaşım */}
      <Stack.Screen name="CustomerExperienceHub" component={CustomerExperienceHubScreen} options={{ headerShown: true, title: 'Müşteri Deneyimi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PortalUsers" component={PortalUsersScreen} options={{ headerShown: true, title: 'Portal Kullanıcıları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PortalUserForm" component={PortalUserFormScreen} options={{ headerShown: true, title: 'Portal Kullanıcı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ShareLinks" component={ShareLinksScreen} options={{ headerShown: true, title: 'Paylaşım Linkleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ShareLinkForm" component={ShareLinkFormScreen} options={{ headerShown: true, title: 'Link', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ShareLinkDetail" component={ShareLinkDetailScreen} options={{ headerShown: true, title: 'Link Detayı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteApprovals" component={QuoteApprovalsScreen} options={{ headerShown: true, title: 'Teklif Onayları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CustomerComments" component={CustomerCommentsScreen} options={{ headerShown: true, title: 'Müşteri Yorumları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SatisfactionSurveys" component={SatisfactionSurveysScreen} options={{ headerShown: true, title: 'Memnuniyet Anketleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SurveyDetail" component={SurveyDetailScreen} options={{ headerShown: true, title: 'Anket Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CustomerNotificationPrefs" component={CustomerNotificationPrefsScreen} options={{ headerShown: true, title: 'Bildirim Tercihleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AutoReports" component={AutoReportsScreen} options={{ headerShown: true, title: 'Otomatik Raporlar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AutoReportForm" component={AutoReportFormScreen} options={{ headerShown: true, title: 'Rapor Planı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="BiHub" component={BiHubScreen} options={{ headerShown: true, title: 'BI & Karar Destek', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ExecutiveDashboard" component={ExecutiveDashboardScreen} options={{ headerShown: true, title: 'Yönetici Paneli', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepartmentKpis" component={DepartmentKpisScreen} options={{ headerShown: true, title: 'Departman KPI', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="StaffPerformance" component={StaffPerformanceScreen} options={{ headerShown: true, title: 'Personel Performansı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="VehicleCostAnalysis" component={VehicleCostAnalysisScreen} options={{ headerShown: true, title: 'Araç Maliyet', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FuelConsumption" component={FuelConsumptionScreen} options={{ headerShown: true, title: 'Yakıt Tüketimi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="StockConsumption" component={StockConsumptionScreen} options={{ headerShown: true, title: 'Stok Tüketimi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteWinLoss" component={QuoteWinLossScreen} options={{ headerShown: true, title: 'Teklif Kazan/Kayıp', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CustomerProfitability" component={CustomerProfitabilityScreen} options={{ headerShown: true, title: 'Müşteri Kârlılık', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SlaTracking" component={SlaTrackingScreen} options={{ headerShown: true, title: 'SLA Takip', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RegionHeatmap" component={RegionHeatmapScreen} options={{ headerShown: true, title: 'Bölge Yoğunluk', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="BudgetVsActual" component={BudgetVsActualScreen} options={{ headerShown: true, title: 'Bütçe vs Fiili', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ExecutiveSummary" component={ExecutiveSummaryScreen} options={{ headerShown: true, title: 'Yönetim Özeti', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PivotExport" component={PivotExportScreen} options={{ headerShown: true, title: 'Pivot/CSV', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="EnterpriseIntegrationsHub" component={EnterpriseIntegrationsHubScreen} options={{ headerShown: true, title: 'Entegrasyonlar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ErpConnections" component={ErpConnectionsScreen} options={{ headerShown: true, title: 'ERP Bağlantıları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ErpConnectionForm" component={ErpConnectionFormScreen} options={{ headerShown: true, title: 'ERP Bağlantı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ErpSyncJobs" component={ErpSyncJobsScreen} options={{ headerShown: true, title: 'Senkron Geçmişi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ErpCustomers" component={ErpCustomersScreen} options={{ headerShown: true, title: 'Cari Eşleme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ErpStock" component={ErpStockScreen} options={{ headerShown: true, title: 'Stok Eşleme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ErpInvoiceDrafts" component={ErpInvoiceDraftsScreen} options={{ headerShown: true, title: 'Fatura Taslakları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteToOrder" component={QuoteToOrderScreen} options={{ headerShown: true, title: 'Tekliften Sipariş', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CrmConnections" component={CrmConnectionsScreen} options={{ headerShown: true, title: 'CRM', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="IntegrationWebhooks" component={IntegrationWebhooksScreen} options={{ headerShown: true, title: 'Webhooks', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="IntegrationWebhookForm" component={IntegrationWebhookFormScreen} options={{ headerShown: true, title: 'Webhook Formu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="IntegrationWebhookDeliveries" component={IntegrationWebhookDeliveriesScreen} options={{ headerShown: true, title: 'Webhook Geçmişi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="IntegrationApiKeys" component={IntegrationApiKeysScreen} options={{ headerShown: true, title: 'API Anahtarları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ApiUsageLogs" component={ApiUsageLogsScreen} options={{ headerShown: true, title: 'API Kullanım', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="IntegrationErrors" component={IntegrationErrorsScreen} options={{ headerShown: true, title: 'Entegrasyon Hataları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="IntegrationHealth" component={IntegrationHealthScreen} options={{ headerShown: true, title: 'Sağlık Durumu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PlatformHub" component={PlatformHubScreen} options={{ headerShown: true, title: 'Platform Yönetimi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Tenants" component={TenantsScreen} options={{ headerShown: true, title: 'Firmalar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TenantForm" component={TenantFormScreen} options={{ headerShown: true, title: 'Firma Formu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TenantMembers" component={TenantMembersScreen} options={{ headerShown: true, title: 'Üyeler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TenantSettings" component={TenantSettingsScreen} options={{ headerShown: true, title: 'Firma Ayarları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Modules" component={ModulesScreen} options={{ headerShown: true, title: 'Modüller', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Packages" component={PackagesScreen} options={{ headerShown: true, title: 'Paketler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Licenses" component={LicensesScreen} options={{ headerShown: true, title: 'Lisanslar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UsageLimits" component={UsageLimitsScreen} options={{ headerShown: true, title: 'Kullanım Limitleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DbIndexHints" component={DbIndexHintsScreen} options={{ headerShown: true, title: 'DB İndeks', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ArchivePolicies" component={ArchivePoliciesScreen} options={{ headerShown: true, title: 'Arşiv Politikaları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ArchiveJobs" component={ArchiveJobsScreen} options={{ headerShown: true, title: 'Arşiv Görevleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Backups" component={BackupsScreen} options={{ headerShown: true, title: 'Yedekler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RestoreTests" component={RestoreTestsScreen} options={{ headerShown: true, title: 'Restore Testi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SystemHealth" component={SystemHealthScreen} options={{ headerShown: true, title: 'Sistem Sağlığı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="MaintenanceMode" component={MaintenanceModeScreen} options={{ headerShown: true, title: 'Bakım Modu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiAssistantHub" component={AiAssistantHubScreen} options={{ headerShown: true, title: 'AI Asistan', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AgentConsole" component={AgentConsoleScreen} options={{ headerShown: true, title: 'Otonom Ajan', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AgentSuggestions" component={AgentSuggestionsScreen} options={{ headerShown: true, title: 'Sistem Önerileri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiPermissions" component={AiPermissionsScreen} options={{ headerShown: true, title: 'AI Yetkileri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiSessions" component={AiSessionsScreen} options={{ headerShown: true, title: 'AI Sohbetler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiChat" component={AiChatScreen} options={{ headerShown: true, title: 'AI Sohbet', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CoPilot" component={CoPilotScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AiKnowledgeBase" component={AiKnowledgeBaseScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AiPozSuggest" component={AiPozSuggestScreen} options={{ headerShown: true, title: 'POZ Öneri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiQuoteDraft" component={AiQuoteDraftScreen} options={{ headerShown: true, title: 'AI Teklif Taslağı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiQuoteDraftDetail" component={AiQuoteDraftDetailScreen} options={{ headerShown: true, title: 'Taslak Detayı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiWorkOrderSummary" component={AiWorkOrderSummaryScreen} options={{ headerShown: true, title: 'İş Emri Özeti', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiCustomerInsight" component={AiCustomerInsightScreen} options={{ headerShown: true, title: 'Müşteri Özeti', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiRiskAlerts" component={AiRiskAlertsScreen} options={{ headerShown: true, title: 'Risk Analizi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiDailyReport" component={AiDailyReportScreen} options={{ headerShown: true, title: 'Günlük Rapor', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiUsageLogs" component={AiUsageLogsScreen} options={{ headerShown: true, title: 'AI Kullanım Logları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldOpsHub" component={FieldOpsHubScreen} options={{ headerShown: true, title: 'Saha Operasyon', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldToday" component={FieldTodayScreen} options={{ headerShown: true, title: 'Bugün', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldShift" component={FieldShiftScreen} options={{ headerShown: true, title: 'Mesai', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldJobs" component={FieldJobsScreen} options={{ headerShown: true, title: 'Saha İşleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldJobDetail" component={FieldJobDetailScreen} options={{ headerShown: true, title: 'İş Detayı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldChecklist" component={FieldChecklistScreen} options={{ headerShown: true, title: 'Checklist', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldQualityCheck" component={FieldQualityCheckScreen} options={{ headerShown: true, title: 'Kalite Kontrol', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldPerformance" component={FieldPerformanceScreen} options={{ headerShown: true, title: 'Performans', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldZones" component={FieldZonesScreen} options={{ headerShown: true, title: 'Bölgeler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldShiftPlan" component={FieldShiftPlanScreen} options={{ headerShown: true, title: 'Vardiya Planı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldEmergency" component={FieldEmergencyScreen} options={{ headerShown: true, title: 'Acil İş', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="FieldCommandCenter" component={FieldCommandCenterScreen} options={{ headerShown: true, title: 'Komuta Merkezi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SmartQuoteHub" component={SmartQuoteHubScreen} options={{ headerShown: true, title: 'Akıllı Teklif', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SurveyForms" component={SurveyFormsScreen} options={{ headerShown: true, title: 'Keşif Formları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SurveyFormDetail" component={SurveyFormDetailScreen} options={{ headerShown: true, title: 'Keşif Detayı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PozLibrary" component={PozLibraryScreen} options={{ headerShown: true, title: 'POZ Kütüphanesi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PriceListVersions" component={PriceListVersionsScreen} options={{ headerShown: true, title: 'Fiyat Listeleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteCalculator" component={QuoteCalculatorScreen} options={{ headerShown: true, title: 'Hesap Motoru', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="HvTransformerQuote" component={HvTransformerQuoteScreen} options={{ headerShown: true, title: 'YG Trafo Teklif', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PeriodicCheckQuote" component={PeriodicCheckQuoteScreen} options={{ headerShown: true, title: 'Periyodik Kontrol', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GesQuote" component={GesQuoteScreen} options={{ headerShown: true, title: 'GES Teklif', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CompensationQuote" component={CompensationQuoteScreen} options={{ headerShown: true, title: 'Kompanzasyon', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteRevisionCompare" component={QuoteRevisionCompareScreen} options={{ headerShown: true, title: 'Revizyon Karşılaştırma', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteOutcomes" component={QuoteOutcomesScreen} options={{ headerShown: true, title: 'Teklif Sonuçları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiQuoteImprovements" component={AiQuoteImprovementsScreen} options={{ headerShown: true, title: 'AI İyileştirme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="LiveOpsHub" component={LiveOpsHubScreen} options={{ headerShown: true, title: 'Canlı Operasyon', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="LiveOpsMap" component={LiveOpsMapScreen} options={{ headerShown: true, title: 'Canlı Harita', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="JobHeatmap" component={JobHeatmapScreen} options={{ headerShown: true, title: 'İş Yoğunluk Haritası', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="PersonnelAvailability" component={PersonnelAvailabilityScreen} options={{ headerShown: true, title: 'Personel Durumu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SmartRouteSuggest" component={SmartRouteSuggestScreen} options={{ headerShown: true, title: 'Akıllı Rota', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="EtaEstimate" component={EtaEstimateScreen} options={{ headerShown: true, title: 'ETA Hesaplama', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RouteDeviationAlerts" component={RouteDeviationAlertsScreen} options={{ headerShown: true, title: 'Rota Sapma Uyarıları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SiteEventLogs" component={SiteEventLogsScreen} options={{ headerShown: true, title: 'Saha Varış/Ayrılış', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="TeamPerformanceLayer" component={TeamPerformanceLayerScreen} options={{ headerShown: true, title: 'Ekip Performans', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OperationReplay" component={OperationReplayScreen} options={{ headerShown: true, title: 'Gün Replay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ComplianceHub" component={ComplianceHubScreen} options={{ headerShown: true, title: 'Kalite & Denetim', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="NonConformity" component={NonConformityScreen} options={{ headerShown: true, title: 'Uygunsuzluklar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="Capa" component={CapaScreen} options={{ headerShown: true, title: 'DÖF/Önleyici Faaliyet', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SafetyChecklists" component={SafetyChecklistsScreen} options={{ headerShown: true, title: 'İSG Kontrol Listeleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RiskAssessment" component={RiskAssessmentScreen} options={{ headerShown: true, title: 'Risk Değerlendirme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AuditSchedule" component={AuditScheduleScreen} options={{ headerShown: true, title: 'Denetim Planı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AuditScoring" component={AuditScoringScreen} options={{ headerShown: true, title: 'Denetim Puanlama', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="NcPhotoEvidence" component={NcPhotoEvidenceScreen} options={{ headerShown: true, title: 'Fotoğraflı Kanıt', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="NcAssignment" component={NcAssignmentScreen} options={{ headerShown: true, title: 'Sorumlu Atama', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QualityDashboard" component={QualityDashboardScreen} options={{ headerShown: true, title: 'Kalite Panosu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AuditReport" component={AuditReportScreen} options={{ headerShown: true, title: 'Denetim Raporu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AssetHub" component={AssetHubScreen} options={{ headerShown: true, title: 'Ekipman & Bakım', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AssetList" component={AssetListScreen} options={{ headerShown: true, title: 'Varlık Listesi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AssetQr" component={AssetQrScreen} options={{ headerShown: true, title: 'QR Kod', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AssetMaintenanceHistory" component={AssetMaintenanceHistoryScreen} options={{ headerShown: true, title: 'Bakım Geçmişi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AssetFaultHistory" component={AssetFaultHistoryScreen} options={{ headerShown: true, title: 'Arıza Geçmişi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="WarrantyTracking" component={WarrantyTrackingScreen} options={{ headerShown: true, title: 'Garanti & Servis', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="MaintenancePlan" component={MaintenancePlanScreen} options={{ headerShown: true, title: 'Periyodik Bakım Planı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="MaintenanceAlerts" component={MaintenanceAlertsScreen} options={{ headerShown: true, title: 'Yaklaşan Bakımlar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AssetCostAnalysis" component={AssetCostAnalysisScreen} options={{ headerShown: true, title: 'Maliyet Analizi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="EnergyAssetTypes" component={EnergyAssetTypesScreen} options={{ headerShown: true, title: 'Enerji Ekipman Tipleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ServiceCard" component={ServiceCardScreen} options={{ headerShown: true, title: 'Servis Karnesi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* Faz 47 */}
      <Stack.Screen name="ExecHub" component={ExecHubScreen} options={{ headerShown: true, title: 'Stratejik Dashboard', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CeoSummary" component={CeoSummaryScreen} options={{ headerShown: true, title: 'CEO Özeti', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OpsHealthScore" component={OpsHealthScoreScreen} options={{ headerShown: true, title: 'Operasyon Sağlık', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="RevenueKpi" component={RevenueKpiScreen} options={{ headerShown: true, title: 'Gelir & Kâr KPI', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ProfitableCustomers" component={ProfitableCustomersScreen} options={{ headerShown: true, title: 'Kârlı Müşteriler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CostlyWorkOrders" component={CostlyWorkOrdersScreen} options={{ headerShown: true, title: 'Maliyetli İş Emirleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="EmployeeRanking" component={EmployeeRankingScreen} options={{ headerShown: true, title: 'Personel Sıralaması', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="VehicleEfficiency" component={VehicleEfficiencyScreen} options={{ headerShown: true, title: 'Araç Verimliliği', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="StockTurnover" component={StockTurnoverScreen} options={{ headerShown: true, title: 'Stok Devir Hızı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QuoteConversion" component={QuoteConversionScreen} options={{ headerShown: true, title: 'Teklif Dönüşümü', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AiExecSummary" component={AiExecSummaryScreen} options={{ headerShown: true, title: 'AI Yönetici Özeti', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpHub" component={CpHubScreen} options={{ headerShown: true, title: 'Müşteri Portalı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpLogin" component={CpLoginScreen} options={{ headerShown: true, title: 'Müşteri Girişi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpDashboard" component={CpDashboardScreen} options={{ headerShown: true, title: 'Müşteri Dashboard', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpQuoteApproval" component={CpQuoteApprovalScreen} options={{ headerShown: true, title: 'Teklif Onay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpWorkOrderTracking" component={CpWorkOrderTrackingScreen} options={{ headerShown: true, title: 'İş Emri Takip', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpServiceRequest" component={CpServiceRequestScreen} options={{ headerShown: true, title: 'Servis Talebi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpDocumentArchive" component={CpDocumentArchiveScreen} options={{ headerShown: true, title: 'Belge Arşivi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpSatisfaction" component={CpSatisfactionScreen} options={{ headerShown: true, title: 'Memnuniyet', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpNotifications" component={CpNotificationsScreen} options={{ headerShown: true, title: 'Bildirimler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpBranding" component={CpBrandingScreen} options={{ headerShown: true, title: 'Marka Özelleştirme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CpShareLinkSecurity" component={CpShareLinkSecurityScreen} options={{ headerShown: true, title: 'Paylaşım Güvenliği', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SecHub" component={SecHubScreen} options={{ headerShown: true, title: 'Güvenlik & Uyumluluk', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SecClassification" component={SecClassificationScreen} options={{ headerShown: true, title: 'Veri Sınıflandırma', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="KvkkRequests" component={KvkkRequestsScreen} options={{ headerShown: true, title: 'KVKK Talepleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DataExport" component={DataExportScreen} options={{ headerShown: true, title: 'Veri Dışa Aktarım', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DataErasure" component={DataErasureScreen} options={{ headerShown: true, title: 'Veri Silme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SecDevices" component={SecDevicesScreen} options={{ headerShown: true, title: 'Cihaz Oturumları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SuspiciousActivity" component={SuspiciousActivityScreen} options={{ headerShown: true, title: 'Şüpheli Aktivite', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AdminAlerts" component={AdminAlertsScreen} options={{ headerShown: true, title: 'Admin Uyarıları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="BackupReport" component={BackupReportScreen} options={{ headerShown: true, title: 'Yedek Raporu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DrPlan" component={DrPlanScreen} options={{ headerShown: true, title: 'Felaket Kurtarma', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SecHealth" component={SecHealthScreen} options={{ headerShown: true, title: 'Güvenlik Skoru', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasHub" component={SaasHubScreen} options={{ headerShown: true, title: 'SaaS & Çoklu Firma', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasTenants" component={SaasTenantsScreen} options={{ headerShown: true, title: 'Firmalar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasIsolation" component={SaasIsolationScreen} options={{ headerShown: true, title: 'Veri İzolasyonu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasModules" component={SaasModulesScreen} options={{ headerShown: true, title: 'Modüller', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasPackages" component={SaasPackagesScreen} options={{ headerShown: true, title: 'Paketler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasLicenses" component={SaasLicensesScreen} options={{ headerShown: true, title: 'Lisanslar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasUsageLimits" component={SaasUsageLimitsScreen} options={{ headerShown: true, title: 'Kullanım Limitleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasBranding" component={SaasBrandingScreen} options={{ headerShown: true, title: 'Marka & Tema', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasBilling" component={SaasBillingScreen} options={{ headerShown: true, title: 'Abonelik & Ödeme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasSuperAdmin" component={SaasSuperAdminScreen} options={{ headerShown: true, title: 'Süper Admin', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="SaasHealth" component={SaasHealthScreen} options={{ headerShown: true, title: 'Firma Sağlık', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepHub" component={DepHubScreen} options={{ headerShown: true, title: 'Yayın & Platform', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepSupabase" component={DepSupabaseScreen} options={{ headerShown: true, title: 'Supabase Yapılandırma', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepRlsPolicies" component={DepRlsPoliciesScreen} options={{ headerShown: true, title: 'RLS Politikaları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepStorage" component={DepStorageScreen} options={{ headerShown: true, title: 'Storage Bucket', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepNetlify" component={DepNetlifyScreen} options={{ headerShown: true, title: 'Netlify Deploy', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepBuildErrors" component={DepBuildErrorsScreen} options={{ headerShown: true, title: 'Derleme Hataları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepAiProviders" component={DepAiProvidersScreen} options={{ headerShown: true, title: 'AI Sağlayıcılar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepAiSecurity" component={DepAiSecurityScreen} options={{ headerShown: true, title: 'AI Güvenlik & Log', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepWebWarnings" component={DepWebWarningsScreen} options={{ headerShown: true, title: 'Web Uyarıları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepMobileWarnings" component={DepMobileWarningsScreen} options={{ headerShown: true, title: 'Mobil Uyarıları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DepApkBuild" component={DepApkBuildScreen} options={{ headerShown: true, title: 'APK Build & Test', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* Faz 52 — Kod Kalitesi & Refactor */}
      <Stack.Screen name="QaHub" component={QaHubScreen} options={{ headerShown: true, title: 'Kod Kalitesi & Refactor', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaConsole" component={QaConsoleScreen} options={{ headerShown: true, title: 'Console Log Temizliği', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaUnused" component={QaUnusedScreen} options={{ headerShown: true, title: 'Kullanılmayan Dosyalar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaShared" component={QaSharedScreen} options={{ headerShown: true, title: "Ortak Component'ler", headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaApiErrors" component={QaApiErrorsScreen} options={{ headerShown: true, title: 'API Hata Yönetimi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaUiStates" component={QaUiStatesScreen} options={{ headerShown: true, title: 'UI Durum Standartları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaTypes" component={QaTypesScreen} options={{ headerShown: true, title: 'TypeScript Güçlendirme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaModules" component={QaModulesScreen} options={{ headerShown: true, title: 'Modül Yapısı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaPerformance" component={QaPerformanceScreen} options={{ headerShown: true, title: 'Render Performansı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaQueries" component={QaQueriesScreen} options={{ headerShown: true, title: 'Supabase Sorgu Audit', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="QaReport" component={QaReportScreen} options={{ headerShown: true, title: 'Kalite Raporu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* Faz 53 — Kabul Testleri */}
      <Stack.Screen name="UatHub" component={UatHubScreen} options={{ headerShown: true, title: 'Kabul Testleri', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatAdmin" component={UatAdminScreen} options={{ headerShown: true, title: 'Admin Senaryoları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatManager" component={UatManagerScreen} options={{ headerShown: true, title: 'Yönetici Senaryoları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatField" component={UatFieldScreen} options={{ headerShown: true, title: 'Saha Senaryoları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatCustomer" component={UatCustomerScreen} options={{ headerShown: true, title: 'Müşteri Senaryoları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatQuote" component={UatQuoteScreen} options={{ headerShown: true, title: 'Teklif E2E', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatWorkOrder" component={UatWorkOrderScreen} options={{ headerShown: true, title: 'İş Emri E2E', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatStock" component={UatStockScreen} options={{ headerShown: true, title: 'Stok & Zimmet E2E', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatLocation" component={UatLocationScreen} options={{ headerShown: true, title: 'Konum & Rota E2E', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatNotification" component={UatNotificationScreen} options={{ headerShown: true, title: 'Bildirim Akışları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="UatReport" component={UatReportScreen} options={{ headerShown: true, title: 'Test Raporu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* Faz 54 — Dokümantasyon ve Eğitim */}
      <Stack.Screen name="DocHub" component={DocHubScreen} options={{ headerShown: true, title: 'Dokümantasyon & Eğitim', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocAdminGuide" component={DocAdminGuideScreen} options={{ headerShown: true, title: 'Admin Kılavuzu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocManagerGuide" component={DocManagerGuideScreen} options={{ headerShown: true, title: 'Yönetici Kılavuzu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocFieldGuide" component={DocFieldGuideScreen} options={{ headerShown: true, title: 'Saha Personeli Kılavuzu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocCustomerGuide" component={DocCustomerGuideScreen} options={{ headerShown: true, title: 'Müşteri Portal Kılavuzu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocSupabaseOps" component={DocSupabaseOpsScreen} options={{ headerShown: true, title: 'Supabase Bakım & Yedek', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocNetlifyOps" component={DocNetlifyOpsScreen} options={{ headerShown: true, title: 'Netlify Deploy & Rollback', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocApkOps" component={DocApkOpsScreen} options={{ headerShown: true, title: 'APK Yayın & Güncelleme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocFaq" component={DocFaqScreen} options={{ headerShown: true, title: 'Sık Sorulanlar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocTraining" component={DocTrainingScreen} options={{ headerShown: true, title: 'Eğitim Videoları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="DocChecklist" component={DocChecklistScreen} options={{ headerShown: true, title: 'Yayın Öncesi Kontrol', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      {/* Faz 55 — Canlı Kullanım, İzleme ve Sürekli İyileştirme */}
      <Stack.Screen name="GoLiveHub" component={GoLiveHubScreen} options={{ headerShown: true, title: 'Canlı Kullanım & İzleme', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveChecklist" component={GoLiveChecklistScreen} options={{ headerShown: true, title: 'Canlıya Alma Listesi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveMonitor" component={GoLiveMonitorScreen} options={{ headerShown: true, title: 'İzleme Paneli', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveLogs" component={GoLiveLogsScreen} options={{ headerShown: true, title: 'Hata Logları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveFeedback" component={GoLiveFeedbackScreen} options={{ headerShown: true, title: 'Geri Bildirimler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveBugTasks" component={GoLiveBugTasksScreen} options={{ headerShown: true, title: 'Hata → Görev', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveWeekly" component={GoLiveWeeklyScreen} options={{ headerShown: true, title: 'İlk Hafta Raporu', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveMonthly" component={GoLiveMonthlyScreen} options={{ headerShown: true, title: 'Aylık Analiz', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveBacklog" component={GoLiveBacklogScreen} options={{ headerShown: true, title: 'İyileştirme Backlog', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveReleases" component={GoLiveReleasesScreen} options={{ headerShown: true, title: 'Sürüm Planı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="GoLiveSupport" component={GoLiveSupportScreen} options={{ headerShown: true, title: 'Destek Süreci', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CovHub" component={CovHubScreen} options={{ headerShown: true, title: 'Sistem Kapsam Denetimi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CovMatrix" component={CovMatrixScreen} options={{ headerShown: true, title: 'Kapsam Matrisi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CovCategory" component={CovCategoryScreen} options={{ headerShown: true, title: 'Kategori Detayı', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="CovSummary" component={CovSummaryScreen} options={{ headerShown: true, title: 'Kapsam Özeti', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ExtHub" component={ExtHubScreen} options={{ headerShown: true, title: 'Dış Entegrasyonlar', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ExtConfig" component={ExtConfigScreen} options={{ headerShown: true, title: 'Entegrasyon Ayarları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="ExtLogs" component={ExtLogsScreen} options={{ headerShown: true, title: 'Entegrasyon Logları', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AdvHub" component={AdvHubScreen} options={{ headerShown: true, title: 'İleri Analitik & AI', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AdvEcommerce" component={AdvEcommerceScreen} options={{ headerShown: true, title: 'E-Ticaret', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AdvCallCenter" component={AdvCallCenterScreen} options={{ headerShown: true, title: 'Çağrı Merkezi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AdvBI" component={AdvBIScreen} options={{ headerShown: true, title: 'BI Veri Köprüsü', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AdvVoiceAI" component={AdvVoiceAIScreen} options={{ headerShown: true, title: 'Sesli AI', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AdvCollectionForecast" component={AdvCollectionForecastScreen} options={{ headerShown: true, title: 'Tahsilat Tahmini', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="AdvRfm" component={AdvRfmScreen} options={{ headerShown: true, title: 'RFM Segmentasyon', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OrdHub" component={OrdHubScreen} options={{ headerShown: true, title: 'Sipariş Yönetimi', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OrdList" component={OrdListScreen} options={{ headerShown: true, title: 'Siparişler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OrdForm" component={OrdFormScreen} options={{ headerShown: true, title: 'Yeni Sipariş', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OrdDetail" component={OrdDetailScreen} options={{ headerShown: true, title: 'Sipariş Detay', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OrdRecurring" component={OrdRecurringScreen} options={{ headerShown: true, title: 'Tekrarlayan Siparişler', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
      <Stack.Screen name="OrdAnalytics" component={OrdAnalyticsScreen} options={{ headerShown: true, title: 'Sipariş Analitiği', headerStyle: { backgroundColor: colors.bg.secondary }, headerTintColor: colors.text.primary, headerTitleStyle: { fontWeight: '700' } }} />
    </Stack.Navigator>
  );
}
