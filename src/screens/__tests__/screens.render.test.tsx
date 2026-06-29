// OTOMATİK ÜRETİLDİ — scripts/gen-render-test.js (elle düzenleme; yeniden üretince kaybolur).
// TÜM ekranların smoke-render testi: AuthProvider+AppProvider içinde çökmeden mount oluyor mu?
// Çökme = gerçek bug. Param gerektiren ekranlar boş param ({}) ile denenir (genelde
// loading/not-found gösterir, çökmez). Native modüller jest.render.setup.js'te mock'lu.
import { renderScreen } from '../../test-utils/renderScreen';

import AccessRulesScreen from '../AccessRulesScreen';
import AdminAlertsScreen from '../AdminAlertsScreen';
import AdminShiftDashboardScreen from '../AdminShiftDashboardScreen';
import AdvBIScreen from '../AdvBIScreen';
import AdvCallCenterScreen from '../AdvCallCenterScreen';
import AdvCollectionForecastScreen from '../AdvCollectionForecastScreen';
import AdvEcommerceScreen from '../AdvEcommerceScreen';
import AdvHubScreen from '../AdvHubScreen';
import AdvRfmScreen from '../AdvRfmScreen';
import AdvVoiceAIScreen from '../AdvVoiceAIScreen';
import AgentConsoleScreen from '../AgentConsoleScreen';
import AgentSuggestionsScreen from '../AgentSuggestionsScreen';
import AgingReportScreen from '../AgingReportScreen';
import AiAssistantHubScreen from '../AiAssistantHubScreen';
import AiAssistantScreen from '../AiAssistantScreen';
import AiChatScreen from '../AiChatScreen';
import AiCustomerInsightScreen from '../AiCustomerInsightScreen';
import AiDailyReportScreen from '../AiDailyReportScreen';
import AiExecSummaryScreen from '../AiExecSummaryScreen';
import AiHubScreen from '../AiHubScreen';
import AiInsightsScreen from '../AiInsightsScreen';
import AiKnowledgeBaseScreen from '../AiKnowledgeBaseScreen';
import AiPermissionsScreen from '../AiPermissionsScreen';
import AiPozSuggestScreen from '../AiPozSuggestScreen';
import AiQuoteDraftDetailScreen from '../AiQuoteDraftDetailScreen';
import AiQuoteDraftScreen from '../AiQuoteDraftScreen';
import AiQuoteImprovementsScreen from '../AiQuoteImprovementsScreen';
import AiRiskAlertsScreen from '../AiRiskAlertsScreen';
import AiSessionsScreen from '../AiSessionsScreen';
import AiSettingsScreen from '../AiSettingsScreen';
import AiUsageLogsScreen from '../AiUsageLogsScreen';
import AiWorkOrderSummaryScreen from '../AiWorkOrderSummaryScreen';
import AllUsersScreen from '../AllUsersScreen';
import AnomaliesScreen from '../AnomaliesScreen';
import ApiKeysScreen from '../ApiKeysScreen';
import ApiUsageLogsScreen from '../ApiUsageLogsScreen';
import ApolloLeadsScreen from '../ApolloLeadsScreen';
import AppUpdateScreen from '../AppUpdateScreen';
import ApprovalDetailScreen from '../ApprovalDetailScreen';
import ApprovalsScreen from '../ApprovalsScreen';
import ArchiveJobsScreen from '../ArchiveJobsScreen';
import ArchivePoliciesScreen from '../ArchivePoliciesScreen';
import AssetCostAnalysisScreen from '../AssetCostAnalysisScreen';
import AssetDetailScreen from '../AssetDetailScreen';
import AssetFaultHistoryScreen from '../AssetFaultHistoryScreen';
import AssetFormScreen from '../AssetFormScreen';
import AssetHistoryScreen from '../AssetHistoryScreen';
import AssetHubScreen from '../AssetHubScreen';
import AssetListScreen from '../AssetListScreen';
import AssetMaintenanceHistoryScreen from '../AssetMaintenanceHistoryScreen';
import AssetQrScreen from '../AssetQrScreen';
import AssetsScreen from '../AssetsScreen';
import AssignmentsScreen from '../AssignmentsScreen';
import AttendanceReportScreen from '../AttendanceReportScreen';
import AuditDetailScreen from '../AuditDetailScreen';
import AuditLogScreen from '../AuditLogScreen';
import AuditLogV2Screen from '../AuditLogV2Screen';
import AuditReportScreen from '../AuditReportScreen';
import AuditScheduleScreen from '../AuditScheduleScreen';
import AuditScoringScreen from '../AuditScoringScreen';
import AutoAssignScreen from '../AutoAssignScreen';
import AutoReportFormScreen from '../AutoReportFormScreen';
import AutoReportsScreen from '../AutoReportsScreen';
import BackupReportScreen from '../BackupReportScreen';
import BackupScreen from '../BackupScreen';
import BackupsScreen from '../BackupsScreen';
import BarcodeScanScreen from '../BarcodeScanScreen';
import BiHubScreen from '../BiHubScreen';
import BordroScreen from '../BordroScreen';
import BroadcastMessageScreen from '../BroadcastMessageScreen';
import BudgetVsActualScreen from '../BudgetVsActualScreen';
import BulkAssignScreen from '../BulkAssignScreen';
import CalendarEventDetailScreen from '../CalendarEventDetailScreen';
import CalendarEventFormScreen from '../CalendarEventFormScreen';
import CalendarScreen from '../CalendarScreen';
import CapaScreen from '../CapaScreen';
import CashRegisterScreen from '../CashRegisterScreen';
import CeoSummaryScreen from '../CeoSummaryScreen';
import ChangePasswordScreen from '../ChangePasswordScreen';
import ChatThreadScreen from '../ChatThreadScreen';
import CheckinScannerScreen from '../CheckinScannerScreen';
import CoPilotScreen from '../CoPilotScreen';
import CompanyScreen from '../CompanyScreen';
import CompensationQuoteScreen from '../CompensationQuoteScreen';
import ComplianceHubScreen from '../ComplianceHubScreen';
import ConflictResolverScreen from '../ConflictResolverScreen';
import ConnectivityHubScreen from '../ConnectivityHubScreen';
import ConnectivityMonitorScreen from '../ConnectivityMonitorScreen';
import CostlyWorkOrdersScreen from '../CostlyWorkOrdersScreen';
import CovCategoryScreen from '../CovCategoryScreen';
import CovHubScreen from '../CovHubScreen';
import CovMatrixScreen from '../CovMatrixScreen';
import CovSummaryScreen from '../CovSummaryScreen';
import CpBrandingScreen from '../CpBrandingScreen';
import CpDashboardScreen from '../CpDashboardScreen';
import CpDocumentArchiveScreen from '../CpDocumentArchiveScreen';
import CpHubScreen from '../CpHubScreen';
import CpLoginScreen from '../CpLoginScreen';
import CpNotificationsScreen from '../CpNotificationsScreen';
import CpQuoteApprovalScreen from '../CpQuoteApprovalScreen';
import CpSatisfactionScreen from '../CpSatisfactionScreen';
import CpServiceRequestScreen from '../CpServiceRequestScreen';
import CpShareLinkSecurityScreen from '../CpShareLinkSecurityScreen';
import CpWorkOrderTrackingScreen from '../CpWorkOrderTrackingScreen';
import CrashReportDetailScreen from '../CrashReportDetailScreen';
import CrashReportsScreen from '../CrashReportsScreen';
import CrmConnectionsScreen from '../CrmConnectionsScreen';
import CustomerBalancesScreen from '../CustomerBalancesScreen';
import CustomerCommentsScreen from '../CustomerCommentsScreen';
import CustomerDocumentsScreen from '../CustomerDocumentsScreen';
import CustomerExperienceHubScreen from '../CustomerExperienceHubScreen';
import CustomerFormScreen from '../CustomerFormScreen';
import CustomerHistoryScreen from '../CustomerHistoryScreen';
import CustomerHubScreen from '../CustomerHubScreen';
import CustomerNotificationPrefsScreen from '../CustomerNotificationPrefsScreen';
import CustomerPortalScreen from '../CustomerPortalScreen';
import CustomerProfitabilityScreen from '../CustomerProfitabilityScreen';
import CustomerRatingsAllScreen from '../CustomerRatingsAllScreen';
import CustomerSitesMapScreen from '../CustomerSitesMapScreen';
import CustomerSitesScreen from '../CustomerSitesScreen';
import CustomersScreen from '../CustomersScreen';
import DashboardScreen from '../DashboardScreen';
import DataErasureScreen from '../DataErasureScreen';
import DataExportScreen from '../DataExportScreen';
import DataMigrationScreen from '../DataMigrationScreen';
import DbIndexHintsScreen from '../DbIndexHintsScreen';
import DepAiProvidersScreen from '../DepAiProvidersScreen';
import DepAiSecurityScreen from '../DepAiSecurityScreen';
import DepApkBuildScreen from '../DepApkBuildScreen';
import DepBuildErrorsScreen from '../DepBuildErrorsScreen';
import DepHubScreen from '../DepHubScreen';
import DepMobileWarningsScreen from '../DepMobileWarningsScreen';
import DepNetlifyScreen from '../DepNetlifyScreen';
import DepRlsPoliciesScreen from '../DepRlsPoliciesScreen';
import DepStorageScreen from '../DepStorageScreen';
import DepSupabaseScreen from '../DepSupabaseScreen';
import DepWebWarningsScreen from '../DepWebWarningsScreen';
import DepartmentFormScreen from '../DepartmentFormScreen';
import DepartmentKpisScreen from '../DepartmentKpisScreen';
import DepartmentsScreen from '../DepartmentsScreen';
import DocAdminGuideScreen from '../DocAdminGuideScreen';
import DocApkOpsScreen from '../DocApkOpsScreen';
import DocChecklistScreen from '../DocChecklistScreen';
import DocCustomerGuideScreen from '../DocCustomerGuideScreen';
import DocFaqScreen from '../DocFaqScreen';
import DocFieldGuideScreen from '../DocFieldGuideScreen';
import DocHubScreen from '../DocHubScreen';
import DocManagerGuideScreen from '../DocManagerGuideScreen';
import DocNetlifyOpsScreen from '../DocNetlifyOpsScreen';
import DocSupabaseOpsScreen from '../DocSupabaseOpsScreen';
import DocTrainingScreen from '../DocTrainingScreen';
import DrPlanScreen from '../DrPlanScreen';
import EInvoiceScreen from '../EInvoiceScreen';
import EmployeeDetailScreen from '../EmployeeDetailScreen';
import EmployeeRankingScreen from '../EmployeeRankingScreen';
import EnergyAssetTypesScreen from '../EnergyAssetTypesScreen';
import EnergyReadingFormScreen from '../EnergyReadingFormScreen';
import EnterpriseIntegrationsHubScreen from '../EnterpriseIntegrationsHubScreen';
import EnvironmentInfoScreen from '../EnvironmentInfoScreen';
import ErpAdaptersScreen from '../ErpAdaptersScreen';
import ErpConnectionFormScreen from '../ErpConnectionFormScreen';
import ErpConnectionsScreen from '../ErpConnectionsScreen';
import ErpCustomersScreen from '../ErpCustomersScreen';
import ErpInvoiceDraftsScreen from '../ErpInvoiceDraftsScreen';
import ErpStockScreen from '../ErpStockScreen';
import ErpSyncJobsScreen from '../ErpSyncJobsScreen';
import EtaEstimateScreen from '../EtaEstimateScreen';
import ExcelImportScreen from '../ExcelImportScreen';
import ExecHubScreen from '../ExecHubScreen';
import ExecutiveDashboardScreen from '../ExecutiveDashboardScreen';
import ExecutiveSummaryScreen from '../ExecutiveSummaryScreen';
import ExpensesScreen from '../ExpensesScreen';
import ExtConfigScreen from '../ExtConfigScreen';
import ExtHubScreen from '../ExtHubScreen';
import ExtLogsScreen from '../ExtLogsScreen';
import ExternalApiKeysScreen from '../ExternalApiKeysScreen';
import FeedbackDetailScreen from '../FeedbackDetailScreen';
import FeedbackFormScreen from '../FeedbackFormScreen';
import FeedbackScreen from '../FeedbackScreen';
import FieldChecklistScreen from '../FieldChecklistScreen';
import FieldCommandCenterScreen from '../FieldCommandCenterScreen';
import FieldEmergencyScreen from '../FieldEmergencyScreen';
import FieldFavoritesScreen from '../FieldFavoritesScreen';
import FieldHubScreen from '../FieldHubScreen';
import FieldJobDetailScreen from '../FieldJobDetailScreen';
import FieldJobsScreen from '../FieldJobsScreen';
import FieldOpsHubScreen from '../FieldOpsHubScreen';
import FieldPerformanceScreen from '../FieldPerformanceScreen';
import FieldQualityCheckScreen from '../FieldQualityCheckScreen';
import FieldSettingsScreen from '../FieldSettingsScreen';
import FieldShiftPlanScreen from '../FieldShiftPlanScreen';
import FieldShiftScreen from '../FieldShiftScreen';
import FieldTodayScreen from '../FieldTodayScreen';
import FieldZonesScreen from '../FieldZonesScreen';
import FinanceHubScreen from '../FinanceHubScreen';
import ForgotPasswordScreen from '../ForgotPasswordScreen';
import FormBuilderScreen from '../FormBuilderScreen';
import FormFillScreen from '../FormFillScreen';
import FormHubScreen from '../FormHubScreen';
import FormResponseDetailScreen from '../FormResponseDetailScreen';
import FormResponsesScreen from '../FormResponsesScreen';
import FormStatsScreen from '../FormStatsScreen';
import FormTemplatesScreen from '../FormTemplatesScreen';
import FuelConsumptionScreen from '../FuelConsumptionScreen';
import FuelReportScreen from '../FuelReportScreen';
import GeofencesScreen from '../GeofencesScreen';
import GesProposalFormScreen from '../GesProposalFormScreen';
import GesProposalsScreen from '../GesProposalsScreen';
import GesQuoteScreen from '../GesQuoteScreen';
import GlobalSearchScreen from '../GlobalSearchScreen';
import GoLiveBacklogScreen from '../GoLiveBacklogScreen';
import GoLiveBugTasksScreen from '../GoLiveBugTasksScreen';
import GoLiveChecklistScreen from '../GoLiveChecklistScreen';
import GoLiveFeedbackScreen from '../GoLiveFeedbackScreen';
import GoLiveHubScreen from '../GoLiveHubScreen';
import GoLiveLogsScreen from '../GoLiveLogsScreen';
import GoLiveMonitorScreen from '../GoLiveMonitorScreen';
import GoLiveMonthlyScreen from '../GoLiveMonthlyScreen';
import GoLiveReleasesScreen from '../GoLiveReleasesScreen';
import GoLiveSupportScreen from '../GoLiveSupportScreen';
import GoLiveWeeklyScreen from '../GoLiveWeeklyScreen';
import GovernanceHubScreen from '../GovernanceHubScreen';
import HomeScreen from '../HomeScreen';
import HvTransformerQuoteScreen from '../HvTransformerQuoteScreen';
import IncomeReportScreen from '../IncomeReportScreen';
import InspectionFormScreen from '../InspectionFormScreen';
import InspectionsScreen from '../InspectionsScreen';
import IntegrationApiKeysScreen from '../IntegrationApiKeysScreen';
import IntegrationErrorsScreen from '../IntegrationErrorsScreen';
import IntegrationHealthScreen from '../IntegrationHealthScreen';
import IntegrationWebhookDeliveriesScreen from '../IntegrationWebhookDeliveriesScreen';
import IntegrationWebhookFormScreen from '../IntegrationWebhookFormScreen';
import IntegrationWebhooksScreen from '../IntegrationWebhooksScreen';
import IntegrationsHubScreen from '../IntegrationsHubScreen';
import InventoryHubScreen from '../InventoryHubScreen';
import JobHeatmapScreen from '../JobHeatmapScreen';
import JobRatingScreen from '../JobRatingScreen';
import KpiOverviewScreen from '../KpiOverviewScreen';
import KvkkAccessLogsScreen from '../KvkkAccessLogsScreen';
import KvkkRequestsScreen from '../KvkkRequestsScreen';
import KvkkScreen from '../KvkkScreen';
import LeaveRequestsScreen from '../LeaveRequestsScreen';
import LicensesScreen from '../LicensesScreen';
import LiveOpsHubScreen from '../LiveOpsHubScreen';
import LiveOpsMapScreen from '../LiveOpsMapScreen';
import LiveTrackingScreen from '../LiveTrackingScreen';
import LocationHistoryScreen from '../LocationHistoryScreen';
import LoginScreen from '../LoginScreen';
import LowStockAlertsScreen from '../LowStockAlertsScreen';
import MaintenanceAlertsScreen from '../MaintenanceAlertsScreen';
import MaintenanceModeScreen from '../MaintenanceModeScreen';
import MaintenancePlanScreen from '../MaintenancePlanScreen';
import MaintenancePlansScreen from '../MaintenancePlansScreen';
import ManagerCommandCenterScreen from '../ManagerCommandCenterScreen';
import ManagerScreen from '../ManagerScreen';
import MapScreen from '../MapScreen';
import MaterialFormScreen from '../MaterialFormScreen';
import MaterialsScreen from '../MaterialsScreen';
import MessagesScreen from '../MessagesScreen';
import MockLocationAlertsScreen from '../MockLocationAlertsScreen';
import ModulesScreen from '../ModulesScreen';
import NcAssignmentScreen from '../NcAssignmentScreen';
import NcPhotoEvidenceScreen from '../NcPhotoEvidenceScreen';
import NewQuoteScreen from '../NewQuoteScreen';
import NewServiceScreen from '../NewServiceScreen';
import NewWorkOrderScreen from '../NewWorkOrderScreen';
import NfcCheckinScreen from '../NfcCheckinScreen';
import NonConformityScreen from '../NonConformityScreen';
import NonconformitiesScreen from '../NonconformitiesScreen';
import NotificationHubScreen from '../NotificationHubScreen';
import NotificationPreferencesScreen from '../NotificationPreferencesScreen';
import NotificationStatsScreen from '../NotificationStatsScreen';
import NotificationsScreen from '../NotificationsScreen';
import OfficeBoardScreen from '../OfficeBoardScreen';
import OfficeBoardsScreen from '../OfficeBoardsScreen';
import OfficeHubScreen from '../OfficeHubScreen';
import OfficeMeetingScreen from '../OfficeMeetingScreen';
import OfficeMeetingsScreen from '../OfficeMeetingsScreen';
import OfficePageScreen from '../OfficePageScreen';
import OfficePagesScreen from '../OfficePagesScreen';
import OfflineOpDetailScreen from '../OfflineOpDetailScreen';
import OfflineQueueScreen from '../OfflineQueueScreen';
import OperationReplayScreen from '../OperationReplayScreen';
import OpsHealthScoreScreen from '../OpsHealthScoreScreen';
import OrdAnalyticsScreen from '../OrdAnalyticsScreen';
import OrdDetailScreen from '../OrdDetailScreen';
import OrdFormScreen from '../OrdFormScreen';
import OrdHubScreen from '../OrdHubScreen';
import OrdListScreen from '../OrdListScreen';
import OrdRecurringScreen from '../OrdRecurringScreen';
import OsosAutomationScreen from '../OsosAutomationScreen';
import OsosHubScreen from '../OsosHubScreen';
import OsosImportScreen from '../OsosImportScreen';
import OsosReadingsScreen from '../OsosReadingsScreen';
import PackagesScreen from '../PackagesScreen';
import ParasutSettingsScreen from '../ParasutSettingsScreen';
import PaymentDetailScreen from '../PaymentDetailScreen';
import PaymentFormScreen from '../PaymentFormScreen';
import PaymentsScreen from '../PaymentsScreen';
import PayrollDetailScreen from '../PayrollDetailScreen';
import PayrollHubScreen from '../PayrollHubScreen';
import PayrollRunsScreen from '../PayrollRunsScreen';
import PendingApprovalScreen from '../PendingApprovalScreen';
import PerformanceMetricsScreen from '../PerformanceMetricsScreen';
import PeriodicCheckQuoteScreen from '../PeriodicCheckQuoteScreen';
import PermissionsScreen from '../PermissionsScreen';
import PersonnelAvailabilityScreen from '../PersonnelAvailabilityScreen';
import PersonnelTrackingHubScreen from '../PersonnelTrackingHubScreen';
import PhotoAnalysisScreen from '../PhotoAnalysisScreen';
import PivotExportScreen from '../PivotExportScreen';
import PlatformHubScreen from '../PlatformHubScreen';
import PortalUserFormScreen from '../PortalUserFormScreen';
import PortalUsersScreen from '../PortalUsersScreen';
import PozLibraryScreen from '../PozLibraryScreen';
import PriceListVersionsScreen from '../PriceListVersionsScreen';
import ProductCatalogScreen from '../ProductCatalogScreen';
import ProductItemDetailScreen from '../ProductItemDetailScreen';
import ProductItemFormScreen from '../ProductItemFormScreen';
import ProductItemsScreen from '../ProductItemsScreen';
import ProfileScreen from '../ProfileScreen';
import ProfitableCustomersScreen from '../ProfitableCustomersScreen';
import ProposalsHubScreen from '../ProposalsHubScreen';
import QaApiErrorsScreen from '../QaApiErrorsScreen';
import QaConsoleScreen from '../QaConsoleScreen';
import QaHubScreen from '../QaHubScreen';
import QaModulesScreen from '../QaModulesScreen';
import QaPerformanceScreen from '../QaPerformanceScreen';
import QaQueriesScreen from '../QaQueriesScreen';
import QaReportScreen from '../QaReportScreen';
import QaSharedScreen from '../QaSharedScreen';
import QaTypesScreen from '../QaTypesScreen';
import QaUiStatesScreen from '../QaUiStatesScreen';
import QaUnusedScreen from '../QaUnusedScreen';
import QualityDashboardScreen from '../QualityDashboardScreen';
import QualityHubScreen from '../QualityHubScreen';
import QuoteAcceptScreen from '../QuoteAcceptScreen';
import QuoteApprovalsScreen from '../QuoteApprovalsScreen';
import QuoteCalculatorScreen from '../QuoteCalculatorScreen';
import QuoteConversionScreen from '../QuoteConversionScreen';
import QuoteDetailScreen from '../QuoteDetailScreen';
import QuoteEmailScreen from '../QuoteEmailScreen';
import QuoteFlowHubScreen from '../QuoteFlowHubScreen';
import QuoteOutcomesScreen from '../QuoteOutcomesScreen';
import QuoteRevisionCompareScreen from '../QuoteRevisionCompareScreen';
import QuoteRevisionsScreen from '../QuoteRevisionsScreen';
import QuoteShareScreen from '../QuoteShareScreen';
import QuoteTemplatesScreen from '../QuoteTemplatesScreen';
import QuoteToOrderScreen from '../QuoteToOrderScreen';
import QuoteWinLossScreen from '../QuoteWinLossScreen';
import QuotesScreen from '../QuotesScreen';
import RecentPozScreen from '../RecentPozScreen';
import RecurringTasksScreen from '../RecurringTasksScreen';
import RegionFormScreen from '../RegionFormScreen';
import RegionHeatmapScreen from '../RegionHeatmapScreen';
import RegionsScreen from '../RegionsScreen';
import ReleaseNotesScreen from '../ReleaseNotesScreen';
import ReportComparisonScreen from '../ReportComparisonScreen';
import ReportDetailScreen from '../ReportDetailScreen';
import ReportingHubScreen from '../ReportingHubScreen';
import ReportsScreen from '../ReportsScreen';
import ResetPasswordScreen from '../ResetPasswordScreen';
import RestoreTestsScreen from '../RestoreTestsScreen';
import RevenueKpiScreen from '../RevenueKpiScreen';
import RiskAssessmentScreen from '../RiskAssessmentScreen';
import RoleMatrixScreen from '../RoleMatrixScreen';
import RoleMatrixV2Screen from '../RoleMatrixV2Screen';
import RouteDeviationAlertsScreen from '../RouteDeviationAlertsScreen';
import RouteOptimizerScreen from '../RouteOptimizerScreen';
import SaasBillingScreen from '../SaasBillingScreen';
import SaasBrandingScreen from '../SaasBrandingScreen';
import SaasHealthScreen from '../SaasHealthScreen';
import SaasHubScreen from '../SaasHubScreen';
import SaasIsolationScreen from '../SaasIsolationScreen';
import SaasLicensesScreen from '../SaasLicensesScreen';
import SaasModulesScreen from '../SaasModulesScreen';
import SaasPackagesScreen from '../SaasPackagesScreen';
import SaasSuperAdminScreen from '../SaasSuperAdminScreen';
import SaasTenantsScreen from '../SaasTenantsScreen';
import SaasUsageLimitsScreen from '../SaasUsageLimitsScreen';
import SafetyChecklistsScreen from '../SafetyChecklistsScreen';
import SalesVisitFormScreen from '../SalesVisitFormScreen';
import SalesVisitsScreen from '../SalesVisitsScreen';
import SatisfactionSurveysScreen from '../SatisfactionSurveysScreen';
import ScheduledEmailsScreen from '../ScheduledEmailsScreen';
import SecClassificationScreen from '../SecClassificationScreen';
import SecDevicesScreen from '../SecDevicesScreen';
import SecHealthScreen from '../SecHealthScreen';
import SecHubScreen from '../SecHubScreen';
import SectorHubScreen from '../SectorHubScreen';
import ServiceCardScreen from '../ServiceCardScreen';
import ServicesScreen from '../ServicesScreen';
import SessionLogsScreen from '../SessionLogsScreen';
import ShareLinkDetailScreen from '../ShareLinkDetailScreen';
import ShareLinkFormScreen from '../ShareLinkFormScreen';
import ShareLinksScreen from '../ShareLinksScreen';
import ShiftHistoryScreen from '../ShiftHistoryScreen';
import ShiftScreen from '../ShiftScreen';
import SignupScreen from '../SignupScreen';
import SiteEventLogsScreen from '../SiteEventLogsScreen';
import SlaScreen from '../SlaScreen';
import SlaTrackingScreen from '../SlaTrackingScreen';
import SmartPozSuggestScreen from '../SmartPozSuggestScreen';
import SmartQuoteHubScreen from '../SmartQuoteHubScreen';
import SmartRouteSuggestScreen from '../SmartRouteSuggestScreen';
import StaffPerformanceScreen from '../StaffPerformanceScreen';
import StockConsumptionScreen from '../StockConsumptionScreen';
import StockHubScreen from '../StockHubScreen';
import StockMovementScreen from '../StockMovementScreen';
import StockMovementsScreen from '../StockMovementsScreen';
import StockScreen from '../StockScreen';
import StockSummaryScreen from '../StockSummaryScreen';
import StockTurnoverScreen from '../StockTurnoverScreen';
import SurveyDetailScreen from '../SurveyDetailScreen';
import SurveyFormDetailScreen from '../SurveyFormDetailScreen';
import SurveyFormsScreen from '../SurveyFormsScreen';
import SuspiciousActivityScreen from '../SuspiciousActivityScreen';
import SuspiciousLoginsScreen from '../SuspiciousLoginsScreen';
import SyncHistoryScreen from '../SyncHistoryScreen';
import SyncStatusScreen from '../SyncStatusScreen';
import SystemHealthScreen from '../SystemHealthScreen';
import TaskAnalyticsScreen from '../TaskAnalyticsScreen';
import TaskDetailScreen from '../TaskDetailScreen';
import TaskFormScreen from '../TaskFormScreen';
import TaskHubScreen from '../TaskHubScreen';
import TaskKanbanScreen from '../TaskKanbanScreen';
import TasksScreen from '../TasksScreen';
import TeamPerformanceLayerScreen from '../TeamPerformanceLayerScreen';
import TenantFormScreen from '../TenantFormScreen';
import TenantMembersScreen from '../TenantMembersScreen';
import TenantSettingsScreen from '../TenantSettingsScreen';
import TenantsScreen from '../TenantsScreen';
import TestPlanScreen from '../TestPlanScreen';
import TimesheetScreen from '../TimesheetScreen';
import TodoScreen from '../TodoScreen';
import TransformerProposalFormScreen from '../TransformerProposalFormScreen';
import TransformerProposalsScreen from '../TransformerProposalsScreen';
import TwoFactorScreen from '../TwoFactorScreen';
import UatAdminScreen from '../UatAdminScreen';
import UatCustomerScreen from '../UatCustomerScreen';
import UatFieldScreen from '../UatFieldScreen';
import UatHubScreen from '../UatHubScreen';
import UatLocationScreen from '../UatLocationScreen';
import UatManagerScreen from '../UatManagerScreen';
import UatNotificationScreen from '../UatNotificationScreen';
import UatQuoteScreen from '../UatQuoteScreen';
import UatReportScreen from '../UatReportScreen';
import UatStockScreen from '../UatStockScreen';
import UatWorkOrderScreen from '../UatWorkOrderScreen';
import UsageLimitsScreen from '../UsageLimitsScreen';
import UsageScoreScreen from '../UsageScoreScreen';
import UserApprovalsScreen from '../UserApprovalsScreen';
import UsersAdminScreen from '../UsersAdminScreen';
import VehicleAlertsScreen from '../VehicleAlertsScreen';
import VehicleCostAnalysisScreen from '../VehicleCostAnalysisScreen';
import VehicleDamageFormScreen from '../VehicleDamageFormScreen';
import VehicleDamagesScreen from '../VehicleDamagesScreen';
import VehicleDetailScreen from '../VehicleDetailScreen';
import VehicleEfficiencyScreen from '../VehicleEfficiencyScreen';
import VehicleFormScreen from '../VehicleFormScreen';
import VehicleFuelStatsScreen from '../VehicleFuelStatsScreen';
import VehicleHubScreen from '../VehicleHubScreen';
import VehicleLogFormScreen from '../VehicleLogFormScreen';
import VehicleLogsScreen from '../VehicleLogsScreen';
import VehicleRouteScreen from '../VehicleRouteScreen';
import VehiclesScreen from '../VehiclesScreen';
import VisionScannerScreen from '../VisionScannerScreen';
import VoiceNoteScreen from '../VoiceNoteScreen';
import VoiceReportScreen from '../VoiceReportScreen';
import WarehouseDetailScreen from '../WarehouseDetailScreen';
import WarehouseFormScreen from '../WarehouseFormScreen';
import WarehousesScreen from '../WarehousesScreen';
import WarrantyTrackingScreen from '../WarrantyTrackingScreen';
import WebAdminScreen from '../WebAdminScreen';
import WebhooksScreen from '../WebhooksScreen';
import WeeklyReportDetailScreen from '../WeeklyReportDetailScreen';
import WeeklyReportsScreen from '../WeeklyReportsScreen';
import WorkOrderCostDashboardScreen from '../WorkOrderCostDashboardScreen';
import WorkOrderDetailScreen from '../WorkOrderDetailScreen';
import WorkOrderFlowHubScreen from '../WorkOrderFlowHubScreen';
import WorkOrderFormsScreen from '../WorkOrderFormsScreen';
import WorkOrderKanbanScreen from '../WorkOrderKanbanScreen';
import WorkOrdersScreen from '../WorkOrdersScreen';

const SCREENS: Array<[string, React.ComponentType<any>]> = [
  ['AccessRulesScreen', AccessRulesScreen],
  ['AdminAlertsScreen', AdminAlertsScreen],
  ['AdminShiftDashboardScreen', AdminShiftDashboardScreen],
  ['AdvBIScreen', AdvBIScreen],
  ['AdvCallCenterScreen', AdvCallCenterScreen],
  ['AdvCollectionForecastScreen', AdvCollectionForecastScreen],
  ['AdvEcommerceScreen', AdvEcommerceScreen],
  ['AdvHubScreen', AdvHubScreen],
  ['AdvRfmScreen', AdvRfmScreen],
  ['AdvVoiceAIScreen', AdvVoiceAIScreen],
  ['AgentConsoleScreen', AgentConsoleScreen],
  ['AgentSuggestionsScreen', AgentSuggestionsScreen],
  ['AgingReportScreen', AgingReportScreen],
  ['AiAssistantHubScreen', AiAssistantHubScreen],
  ['AiAssistantScreen', AiAssistantScreen],
  ['AiChatScreen', AiChatScreen],
  ['AiCustomerInsightScreen', AiCustomerInsightScreen],
  ['AiDailyReportScreen', AiDailyReportScreen],
  ['AiExecSummaryScreen', AiExecSummaryScreen],
  ['AiHubScreen', AiHubScreen],
  ['AiInsightsScreen', AiInsightsScreen],
  ['AiKnowledgeBaseScreen', AiKnowledgeBaseScreen],
  ['AiPermissionsScreen', AiPermissionsScreen],
  ['AiPozSuggestScreen', AiPozSuggestScreen],
  ['AiQuoteDraftDetailScreen', AiQuoteDraftDetailScreen],
  ['AiQuoteDraftScreen', AiQuoteDraftScreen],
  ['AiQuoteImprovementsScreen', AiQuoteImprovementsScreen],
  ['AiRiskAlertsScreen', AiRiskAlertsScreen],
  ['AiSessionsScreen', AiSessionsScreen],
  ['AiSettingsScreen', AiSettingsScreen],
  ['AiUsageLogsScreen', AiUsageLogsScreen],
  ['AiWorkOrderSummaryScreen', AiWorkOrderSummaryScreen],
  ['AllUsersScreen', AllUsersScreen],
  ['AnomaliesScreen', AnomaliesScreen],
  ['ApiKeysScreen', ApiKeysScreen],
  ['ApiUsageLogsScreen', ApiUsageLogsScreen],
  ['ApolloLeadsScreen', ApolloLeadsScreen],
  ['AppUpdateScreen', AppUpdateScreen],
  ['ApprovalDetailScreen', ApprovalDetailScreen],
  ['ApprovalsScreen', ApprovalsScreen],
  ['ArchiveJobsScreen', ArchiveJobsScreen],
  ['ArchivePoliciesScreen', ArchivePoliciesScreen],
  ['AssetCostAnalysisScreen', AssetCostAnalysisScreen],
  ['AssetDetailScreen', AssetDetailScreen],
  ['AssetFaultHistoryScreen', AssetFaultHistoryScreen],
  ['AssetFormScreen', AssetFormScreen],
  ['AssetHistoryScreen', AssetHistoryScreen],
  ['AssetHubScreen', AssetHubScreen],
  ['AssetListScreen', AssetListScreen],
  ['AssetMaintenanceHistoryScreen', AssetMaintenanceHistoryScreen],
  ['AssetQrScreen', AssetQrScreen],
  ['AssetsScreen', AssetsScreen],
  ['AssignmentsScreen', AssignmentsScreen],
  ['AttendanceReportScreen', AttendanceReportScreen],
  ['AuditDetailScreen', AuditDetailScreen],
  ['AuditLogScreen', AuditLogScreen],
  ['AuditLogV2Screen', AuditLogV2Screen],
  ['AuditReportScreen', AuditReportScreen],
  ['AuditScheduleScreen', AuditScheduleScreen],
  ['AuditScoringScreen', AuditScoringScreen],
  ['AutoAssignScreen', AutoAssignScreen],
  ['AutoReportFormScreen', AutoReportFormScreen],
  ['AutoReportsScreen', AutoReportsScreen],
  ['BackupReportScreen', BackupReportScreen],
  ['BackupScreen', BackupScreen],
  ['BackupsScreen', BackupsScreen],
  ['BarcodeScanScreen', BarcodeScanScreen],
  ['BiHubScreen', BiHubScreen],
  ['BordroScreen', BordroScreen],
  ['BroadcastMessageScreen', BroadcastMessageScreen],
  ['BudgetVsActualScreen', BudgetVsActualScreen],
  ['BulkAssignScreen', BulkAssignScreen],
  ['CalendarEventDetailScreen', CalendarEventDetailScreen],
  ['CalendarEventFormScreen', CalendarEventFormScreen],
  ['CalendarScreen', CalendarScreen],
  ['CapaScreen', CapaScreen],
  ['CashRegisterScreen', CashRegisterScreen],
  ['CeoSummaryScreen', CeoSummaryScreen],
  ['ChangePasswordScreen', ChangePasswordScreen],
  ['ChatThreadScreen', ChatThreadScreen],
  ['CheckinScannerScreen', CheckinScannerScreen],
  ['CoPilotScreen', CoPilotScreen],
  ['CompanyScreen', CompanyScreen],
  ['CompensationQuoteScreen', CompensationQuoteScreen],
  ['ComplianceHubScreen', ComplianceHubScreen],
  ['ConflictResolverScreen', ConflictResolverScreen],
  ['ConnectivityHubScreen', ConnectivityHubScreen],
  ['ConnectivityMonitorScreen', ConnectivityMonitorScreen],
  ['CostlyWorkOrdersScreen', CostlyWorkOrdersScreen],
  ['CovCategoryScreen', CovCategoryScreen],
  ['CovHubScreen', CovHubScreen],
  ['CovMatrixScreen', CovMatrixScreen],
  ['CovSummaryScreen', CovSummaryScreen],
  ['CpBrandingScreen', CpBrandingScreen],
  ['CpDashboardScreen', CpDashboardScreen],
  ['CpDocumentArchiveScreen', CpDocumentArchiveScreen],
  ['CpHubScreen', CpHubScreen],
  ['CpLoginScreen', CpLoginScreen],
  ['CpNotificationsScreen', CpNotificationsScreen],
  ['CpQuoteApprovalScreen', CpQuoteApprovalScreen],
  ['CpSatisfactionScreen', CpSatisfactionScreen],
  ['CpServiceRequestScreen', CpServiceRequestScreen],
  ['CpShareLinkSecurityScreen', CpShareLinkSecurityScreen],
  ['CpWorkOrderTrackingScreen', CpWorkOrderTrackingScreen],
  ['CrashReportDetailScreen', CrashReportDetailScreen],
  ['CrashReportsScreen', CrashReportsScreen],
  ['CrmConnectionsScreen', CrmConnectionsScreen],
  ['CustomerBalancesScreen', CustomerBalancesScreen],
  ['CustomerCommentsScreen', CustomerCommentsScreen],
  ['CustomerDocumentsScreen', CustomerDocumentsScreen],
  ['CustomerExperienceHubScreen', CustomerExperienceHubScreen],
  ['CustomerFormScreen', CustomerFormScreen],
  ['CustomerHistoryScreen', CustomerHistoryScreen],
  ['CustomerHubScreen', CustomerHubScreen],
  ['CustomerNotificationPrefsScreen', CustomerNotificationPrefsScreen],
  ['CustomerPortalScreen', CustomerPortalScreen],
  ['CustomerProfitabilityScreen', CustomerProfitabilityScreen],
  ['CustomerRatingsAllScreen', CustomerRatingsAllScreen],
  ['CustomerSitesMapScreen', CustomerSitesMapScreen],
  ['CustomerSitesScreen', CustomerSitesScreen],
  ['CustomersScreen', CustomersScreen],
  ['DashboardScreen', DashboardScreen],
  ['DataErasureScreen', DataErasureScreen],
  ['DataExportScreen', DataExportScreen],
  ['DataMigrationScreen', DataMigrationScreen],
  ['DbIndexHintsScreen', DbIndexHintsScreen],
  ['DepAiProvidersScreen', DepAiProvidersScreen],
  ['DepAiSecurityScreen', DepAiSecurityScreen],
  ['DepApkBuildScreen', DepApkBuildScreen],
  ['DepBuildErrorsScreen', DepBuildErrorsScreen],
  ['DepHubScreen', DepHubScreen],
  ['DepMobileWarningsScreen', DepMobileWarningsScreen],
  ['DepNetlifyScreen', DepNetlifyScreen],
  ['DepRlsPoliciesScreen', DepRlsPoliciesScreen],
  ['DepStorageScreen', DepStorageScreen],
  ['DepSupabaseScreen', DepSupabaseScreen],
  ['DepWebWarningsScreen', DepWebWarningsScreen],
  ['DepartmentFormScreen', DepartmentFormScreen],
  ['DepartmentKpisScreen', DepartmentKpisScreen],
  ['DepartmentsScreen', DepartmentsScreen],
  ['DocAdminGuideScreen', DocAdminGuideScreen],
  ['DocApkOpsScreen', DocApkOpsScreen],
  ['DocChecklistScreen', DocChecklistScreen],
  ['DocCustomerGuideScreen', DocCustomerGuideScreen],
  ['DocFaqScreen', DocFaqScreen],
  ['DocFieldGuideScreen', DocFieldGuideScreen],
  ['DocHubScreen', DocHubScreen],
  ['DocManagerGuideScreen', DocManagerGuideScreen],
  ['DocNetlifyOpsScreen', DocNetlifyOpsScreen],
  ['DocSupabaseOpsScreen', DocSupabaseOpsScreen],
  ['DocTrainingScreen', DocTrainingScreen],
  ['DrPlanScreen', DrPlanScreen],
  ['EInvoiceScreen', EInvoiceScreen],
  ['EmployeeDetailScreen', EmployeeDetailScreen],
  ['EmployeeRankingScreen', EmployeeRankingScreen],
  ['EnergyAssetTypesScreen', EnergyAssetTypesScreen],
  ['EnergyReadingFormScreen', EnergyReadingFormScreen],
  ['EnterpriseIntegrationsHubScreen', EnterpriseIntegrationsHubScreen],
  ['EnvironmentInfoScreen', EnvironmentInfoScreen],
  ['ErpAdaptersScreen', ErpAdaptersScreen],
  ['ErpConnectionFormScreen', ErpConnectionFormScreen],
  ['ErpConnectionsScreen', ErpConnectionsScreen],
  ['ErpCustomersScreen', ErpCustomersScreen],
  ['ErpInvoiceDraftsScreen', ErpInvoiceDraftsScreen],
  ['ErpStockScreen', ErpStockScreen],
  ['ErpSyncJobsScreen', ErpSyncJobsScreen],
  ['EtaEstimateScreen', EtaEstimateScreen],
  ['ExcelImportScreen', ExcelImportScreen],
  ['ExecHubScreen', ExecHubScreen],
  ['ExecutiveDashboardScreen', ExecutiveDashboardScreen],
  ['ExecutiveSummaryScreen', ExecutiveSummaryScreen],
  ['ExpensesScreen', ExpensesScreen],
  ['ExtConfigScreen', ExtConfigScreen],
  ['ExtHubScreen', ExtHubScreen],
  ['ExtLogsScreen', ExtLogsScreen],
  ['ExternalApiKeysScreen', ExternalApiKeysScreen],
  ['FeedbackDetailScreen', FeedbackDetailScreen],
  ['FeedbackFormScreen', FeedbackFormScreen],
  ['FeedbackScreen', FeedbackScreen],
  ['FieldChecklistScreen', FieldChecklistScreen],
  ['FieldCommandCenterScreen', FieldCommandCenterScreen],
  ['FieldEmergencyScreen', FieldEmergencyScreen],
  ['FieldFavoritesScreen', FieldFavoritesScreen],
  ['FieldHubScreen', FieldHubScreen],
  ['FieldJobDetailScreen', FieldJobDetailScreen],
  ['FieldJobsScreen', FieldJobsScreen],
  ['FieldOpsHubScreen', FieldOpsHubScreen],
  ['FieldPerformanceScreen', FieldPerformanceScreen],
  ['FieldQualityCheckScreen', FieldQualityCheckScreen],
  ['FieldSettingsScreen', FieldSettingsScreen],
  ['FieldShiftPlanScreen', FieldShiftPlanScreen],
  ['FieldShiftScreen', FieldShiftScreen],
  ['FieldTodayScreen', FieldTodayScreen],
  ['FieldZonesScreen', FieldZonesScreen],
  ['FinanceHubScreen', FinanceHubScreen],
  ['ForgotPasswordScreen', ForgotPasswordScreen],
  ['FormBuilderScreen', FormBuilderScreen],
  ['FormFillScreen', FormFillScreen],
  ['FormHubScreen', FormHubScreen],
  ['FormResponseDetailScreen', FormResponseDetailScreen],
  ['FormResponsesScreen', FormResponsesScreen],
  ['FormStatsScreen', FormStatsScreen],
  ['FormTemplatesScreen', FormTemplatesScreen],
  ['FuelConsumptionScreen', FuelConsumptionScreen],
  ['FuelReportScreen', FuelReportScreen],
  ['GeofencesScreen', GeofencesScreen],
  ['GesProposalFormScreen', GesProposalFormScreen],
  ['GesProposalsScreen', GesProposalsScreen],
  ['GesQuoteScreen', GesQuoteScreen],
  ['GlobalSearchScreen', GlobalSearchScreen],
  ['GoLiveBacklogScreen', GoLiveBacklogScreen],
  ['GoLiveBugTasksScreen', GoLiveBugTasksScreen],
  ['GoLiveChecklistScreen', GoLiveChecklistScreen],
  ['GoLiveFeedbackScreen', GoLiveFeedbackScreen],
  ['GoLiveHubScreen', GoLiveHubScreen],
  ['GoLiveLogsScreen', GoLiveLogsScreen],
  ['GoLiveMonitorScreen', GoLiveMonitorScreen],
  ['GoLiveMonthlyScreen', GoLiveMonthlyScreen],
  ['GoLiveReleasesScreen', GoLiveReleasesScreen],
  ['GoLiveSupportScreen', GoLiveSupportScreen],
  ['GoLiveWeeklyScreen', GoLiveWeeklyScreen],
  ['GovernanceHubScreen', GovernanceHubScreen],
  ['HomeScreen', HomeScreen],
  ['HvTransformerQuoteScreen', HvTransformerQuoteScreen],
  ['IncomeReportScreen', IncomeReportScreen],
  ['InspectionFormScreen', InspectionFormScreen],
  ['InspectionsScreen', InspectionsScreen],
  ['IntegrationApiKeysScreen', IntegrationApiKeysScreen],
  ['IntegrationErrorsScreen', IntegrationErrorsScreen],
  ['IntegrationHealthScreen', IntegrationHealthScreen],
  ['IntegrationWebhookDeliveriesScreen', IntegrationWebhookDeliveriesScreen],
  ['IntegrationWebhookFormScreen', IntegrationWebhookFormScreen],
  ['IntegrationWebhooksScreen', IntegrationWebhooksScreen],
  ['IntegrationsHubScreen', IntegrationsHubScreen],
  ['InventoryHubScreen', InventoryHubScreen],
  ['JobHeatmapScreen', JobHeatmapScreen],
  ['JobRatingScreen', JobRatingScreen],
  ['KpiOverviewScreen', KpiOverviewScreen],
  ['KvkkAccessLogsScreen', KvkkAccessLogsScreen],
  ['KvkkRequestsScreen', KvkkRequestsScreen],
  ['KvkkScreen', KvkkScreen],
  ['LeaveRequestsScreen', LeaveRequestsScreen],
  ['LicensesScreen', LicensesScreen],
  ['LiveOpsHubScreen', LiveOpsHubScreen],
  ['LiveOpsMapScreen', LiveOpsMapScreen],
  ['LiveTrackingScreen', LiveTrackingScreen],
  ['LocationHistoryScreen', LocationHistoryScreen],
  ['LoginScreen', LoginScreen],
  ['LowStockAlertsScreen', LowStockAlertsScreen],
  ['MaintenanceAlertsScreen', MaintenanceAlertsScreen],
  ['MaintenanceModeScreen', MaintenanceModeScreen],
  ['MaintenancePlanScreen', MaintenancePlanScreen],
  ['MaintenancePlansScreen', MaintenancePlansScreen],
  ['ManagerCommandCenterScreen', ManagerCommandCenterScreen],
  ['ManagerScreen', ManagerScreen],
  ['MapScreen', MapScreen],
  ['MaterialFormScreen', MaterialFormScreen],
  ['MaterialsScreen', MaterialsScreen],
  ['MessagesScreen', MessagesScreen],
  ['MockLocationAlertsScreen', MockLocationAlertsScreen],
  ['ModulesScreen', ModulesScreen],
  ['NcAssignmentScreen', NcAssignmentScreen],
  ['NcPhotoEvidenceScreen', NcPhotoEvidenceScreen],
  ['NewQuoteScreen', NewQuoteScreen],
  ['NewServiceScreen', NewServiceScreen],
  ['NewWorkOrderScreen', NewWorkOrderScreen],
  ['NfcCheckinScreen', NfcCheckinScreen],
  ['NonConformityScreen', NonConformityScreen],
  ['NonconformitiesScreen', NonconformitiesScreen],
  ['NotificationHubScreen', NotificationHubScreen],
  ['NotificationPreferencesScreen', NotificationPreferencesScreen],
  ['NotificationStatsScreen', NotificationStatsScreen],
  ['NotificationsScreen', NotificationsScreen],
  ['OfficeBoardScreen', OfficeBoardScreen],
  ['OfficeBoardsScreen', OfficeBoardsScreen],
  ['OfficeHubScreen', OfficeHubScreen],
  ['OfficeMeetingScreen', OfficeMeetingScreen],
  ['OfficeMeetingsScreen', OfficeMeetingsScreen],
  ['OfficePageScreen', OfficePageScreen],
  ['OfficePagesScreen', OfficePagesScreen],
  ['OfflineOpDetailScreen', OfflineOpDetailScreen],
  ['OfflineQueueScreen', OfflineQueueScreen],
  ['OperationReplayScreen', OperationReplayScreen],
  ['OpsHealthScoreScreen', OpsHealthScoreScreen],
  ['OrdAnalyticsScreen', OrdAnalyticsScreen],
  ['OrdDetailScreen', OrdDetailScreen],
  ['OrdFormScreen', OrdFormScreen],
  ['OrdHubScreen', OrdHubScreen],
  ['OrdListScreen', OrdListScreen],
  ['OrdRecurringScreen', OrdRecurringScreen],
  ['OsosAutomationScreen', OsosAutomationScreen],
  ['OsosHubScreen', OsosHubScreen],
  ['OsosImportScreen', OsosImportScreen],
  ['OsosReadingsScreen', OsosReadingsScreen],
  ['PackagesScreen', PackagesScreen],
  ['ParasutSettingsScreen', ParasutSettingsScreen],
  ['PaymentDetailScreen', PaymentDetailScreen],
  ['PaymentFormScreen', PaymentFormScreen],
  ['PaymentsScreen', PaymentsScreen],
  ['PayrollDetailScreen', PayrollDetailScreen],
  ['PayrollHubScreen', PayrollHubScreen],
  ['PayrollRunsScreen', PayrollRunsScreen],
  ['PendingApprovalScreen', PendingApprovalScreen],
  ['PerformanceMetricsScreen', PerformanceMetricsScreen],
  ['PeriodicCheckQuoteScreen', PeriodicCheckQuoteScreen],
  ['PermissionsScreen', PermissionsScreen],
  ['PersonnelAvailabilityScreen', PersonnelAvailabilityScreen],
  ['PersonnelTrackingHubScreen', PersonnelTrackingHubScreen],
  ['PhotoAnalysisScreen', PhotoAnalysisScreen],
  ['PivotExportScreen', PivotExportScreen],
  ['PlatformHubScreen', PlatformHubScreen],
  ['PortalUserFormScreen', PortalUserFormScreen],
  ['PortalUsersScreen', PortalUsersScreen],
  ['PozLibraryScreen', PozLibraryScreen],
  ['PriceListVersionsScreen', PriceListVersionsScreen],
  ['ProductCatalogScreen', ProductCatalogScreen],
  ['ProductItemDetailScreen', ProductItemDetailScreen],
  ['ProductItemFormScreen', ProductItemFormScreen],
  ['ProductItemsScreen', ProductItemsScreen],
  ['ProfileScreen', ProfileScreen],
  ['ProfitableCustomersScreen', ProfitableCustomersScreen],
  ['ProposalsHubScreen', ProposalsHubScreen],
  ['QaApiErrorsScreen', QaApiErrorsScreen],
  ['QaConsoleScreen', QaConsoleScreen],
  ['QaHubScreen', QaHubScreen],
  ['QaModulesScreen', QaModulesScreen],
  ['QaPerformanceScreen', QaPerformanceScreen],
  ['QaQueriesScreen', QaQueriesScreen],
  ['QaReportScreen', QaReportScreen],
  ['QaSharedScreen', QaSharedScreen],
  ['QaTypesScreen', QaTypesScreen],
  ['QaUiStatesScreen', QaUiStatesScreen],
  ['QaUnusedScreen', QaUnusedScreen],
  ['QualityDashboardScreen', QualityDashboardScreen],
  ['QualityHubScreen', QualityHubScreen],
  ['QuoteAcceptScreen', QuoteAcceptScreen],
  ['QuoteApprovalsScreen', QuoteApprovalsScreen],
  ['QuoteCalculatorScreen', QuoteCalculatorScreen],
  ['QuoteConversionScreen', QuoteConversionScreen],
  ['QuoteDetailScreen', QuoteDetailScreen],
  ['QuoteEmailScreen', QuoteEmailScreen],
  ['QuoteFlowHubScreen', QuoteFlowHubScreen],
  ['QuoteOutcomesScreen', QuoteOutcomesScreen],
  ['QuoteRevisionCompareScreen', QuoteRevisionCompareScreen],
  ['QuoteRevisionsScreen', QuoteRevisionsScreen],
  ['QuoteShareScreen', QuoteShareScreen],
  ['QuoteTemplatesScreen', QuoteTemplatesScreen],
  ['QuoteToOrderScreen', QuoteToOrderScreen],
  ['QuoteWinLossScreen', QuoteWinLossScreen],
  ['QuotesScreen', QuotesScreen],
  ['RecentPozScreen', RecentPozScreen],
  ['RecurringTasksScreen', RecurringTasksScreen],
  ['RegionFormScreen', RegionFormScreen],
  ['RegionHeatmapScreen', RegionHeatmapScreen],
  ['RegionsScreen', RegionsScreen],
  ['ReleaseNotesScreen', ReleaseNotesScreen],
  ['ReportComparisonScreen', ReportComparisonScreen],
  ['ReportDetailScreen', ReportDetailScreen],
  ['ReportingHubScreen', ReportingHubScreen],
  ['ReportsScreen', ReportsScreen],
  ['ResetPasswordScreen', ResetPasswordScreen],
  ['RestoreTestsScreen', RestoreTestsScreen],
  ['RevenueKpiScreen', RevenueKpiScreen],
  ['RiskAssessmentScreen', RiskAssessmentScreen],
  ['RoleMatrixScreen', RoleMatrixScreen],
  ['RoleMatrixV2Screen', RoleMatrixV2Screen],
  ['RouteDeviationAlertsScreen', RouteDeviationAlertsScreen],
  ['RouteOptimizerScreen', RouteOptimizerScreen],
  ['SaasBillingScreen', SaasBillingScreen],
  ['SaasBrandingScreen', SaasBrandingScreen],
  ['SaasHealthScreen', SaasHealthScreen],
  ['SaasHubScreen', SaasHubScreen],
  ['SaasIsolationScreen', SaasIsolationScreen],
  ['SaasLicensesScreen', SaasLicensesScreen],
  ['SaasModulesScreen', SaasModulesScreen],
  ['SaasPackagesScreen', SaasPackagesScreen],
  ['SaasSuperAdminScreen', SaasSuperAdminScreen],
  ['SaasTenantsScreen', SaasTenantsScreen],
  ['SaasUsageLimitsScreen', SaasUsageLimitsScreen],
  ['SafetyChecklistsScreen', SafetyChecklistsScreen],
  ['SalesVisitFormScreen', SalesVisitFormScreen],
  ['SalesVisitsScreen', SalesVisitsScreen],
  ['SatisfactionSurveysScreen', SatisfactionSurveysScreen],
  ['ScheduledEmailsScreen', ScheduledEmailsScreen],
  ['SecClassificationScreen', SecClassificationScreen],
  ['SecDevicesScreen', SecDevicesScreen],
  ['SecHealthScreen', SecHealthScreen],
  ['SecHubScreen', SecHubScreen],
  ['SectorHubScreen', SectorHubScreen],
  ['ServiceCardScreen', ServiceCardScreen],
  ['ServicesScreen', ServicesScreen],
  ['SessionLogsScreen', SessionLogsScreen],
  ['ShareLinkDetailScreen', ShareLinkDetailScreen],
  ['ShareLinkFormScreen', ShareLinkFormScreen],
  ['ShareLinksScreen', ShareLinksScreen],
  ['ShiftHistoryScreen', ShiftHistoryScreen],
  ['ShiftScreen', ShiftScreen],
  ['SignupScreen', SignupScreen],
  ['SiteEventLogsScreen', SiteEventLogsScreen],
  ['SlaScreen', SlaScreen],
  ['SlaTrackingScreen', SlaTrackingScreen],
  ['SmartPozSuggestScreen', SmartPozSuggestScreen],
  ['SmartQuoteHubScreen', SmartQuoteHubScreen],
  ['SmartRouteSuggestScreen', SmartRouteSuggestScreen],
  ['StaffPerformanceScreen', StaffPerformanceScreen],
  ['StockConsumptionScreen', StockConsumptionScreen],
  ['StockHubScreen', StockHubScreen],
  ['StockMovementScreen', StockMovementScreen],
  ['StockMovementsScreen', StockMovementsScreen],
  ['StockScreen', StockScreen],
  ['StockSummaryScreen', StockSummaryScreen],
  ['StockTurnoverScreen', StockTurnoverScreen],
  ['SurveyDetailScreen', SurveyDetailScreen],
  ['SurveyFormDetailScreen', SurveyFormDetailScreen],
  ['SurveyFormsScreen', SurveyFormsScreen],
  ['SuspiciousActivityScreen', SuspiciousActivityScreen],
  ['SuspiciousLoginsScreen', SuspiciousLoginsScreen],
  ['SyncHistoryScreen', SyncHistoryScreen],
  ['SyncStatusScreen', SyncStatusScreen],
  ['SystemHealthScreen', SystemHealthScreen],
  ['TaskAnalyticsScreen', TaskAnalyticsScreen],
  ['TaskDetailScreen', TaskDetailScreen],
  ['TaskFormScreen', TaskFormScreen],
  ['TaskHubScreen', TaskHubScreen],
  ['TaskKanbanScreen', TaskKanbanScreen],
  ['TasksScreen', TasksScreen],
  ['TeamPerformanceLayerScreen', TeamPerformanceLayerScreen],
  ['TenantFormScreen', TenantFormScreen],
  ['TenantMembersScreen', TenantMembersScreen],
  ['TenantSettingsScreen', TenantSettingsScreen],
  ['TenantsScreen', TenantsScreen],
  ['TestPlanScreen', TestPlanScreen],
  ['TimesheetScreen', TimesheetScreen],
  ['TodoScreen', TodoScreen],
  ['TransformerProposalFormScreen', TransformerProposalFormScreen],
  ['TransformerProposalsScreen', TransformerProposalsScreen],
  ['TwoFactorScreen', TwoFactorScreen],
  ['UatAdminScreen', UatAdminScreen],
  ['UatCustomerScreen', UatCustomerScreen],
  ['UatFieldScreen', UatFieldScreen],
  ['UatHubScreen', UatHubScreen],
  ['UatLocationScreen', UatLocationScreen],
  ['UatManagerScreen', UatManagerScreen],
  ['UatNotificationScreen', UatNotificationScreen],
  ['UatQuoteScreen', UatQuoteScreen],
  ['UatReportScreen', UatReportScreen],
  ['UatStockScreen', UatStockScreen],
  ['UatWorkOrderScreen', UatWorkOrderScreen],
  ['UsageLimitsScreen', UsageLimitsScreen],
  ['UsageScoreScreen', UsageScoreScreen],
  ['UserApprovalsScreen', UserApprovalsScreen],
  ['UsersAdminScreen', UsersAdminScreen],
  ['VehicleAlertsScreen', VehicleAlertsScreen],
  ['VehicleCostAnalysisScreen', VehicleCostAnalysisScreen],
  ['VehicleDamageFormScreen', VehicleDamageFormScreen],
  ['VehicleDamagesScreen', VehicleDamagesScreen],
  ['VehicleDetailScreen', VehicleDetailScreen],
  ['VehicleEfficiencyScreen', VehicleEfficiencyScreen],
  ['VehicleFormScreen', VehicleFormScreen],
  ['VehicleFuelStatsScreen', VehicleFuelStatsScreen],
  ['VehicleHubScreen', VehicleHubScreen],
  ['VehicleLogFormScreen', VehicleLogFormScreen],
  ['VehicleLogsScreen', VehicleLogsScreen],
  ['VehicleRouteScreen', VehicleRouteScreen],
  ['VehiclesScreen', VehiclesScreen],
  ['VisionScannerScreen', VisionScannerScreen],
  ['VoiceNoteScreen', VoiceNoteScreen],
  ['VoiceReportScreen', VoiceReportScreen],
  ['WarehouseDetailScreen', WarehouseDetailScreen],
  ['WarehouseFormScreen', WarehouseFormScreen],
  ['WarehousesScreen', WarehousesScreen],
  ['WarrantyTrackingScreen', WarrantyTrackingScreen],
  ['WebAdminScreen', WebAdminScreen],
  ['WebhooksScreen', WebhooksScreen],
  ['WeeklyReportDetailScreen', WeeklyReportDetailScreen],
  ['WeeklyReportsScreen', WeeklyReportsScreen],
  ['WorkOrderCostDashboardScreen', WorkOrderCostDashboardScreen],
  ['WorkOrderDetailScreen', WorkOrderDetailScreen],
  ['WorkOrderFlowHubScreen', WorkOrderFlowHubScreen],
  ['WorkOrderFormsScreen', WorkOrderFormsScreen],
  ['WorkOrderKanbanScreen', WorkOrderKanbanScreen],
  ['WorkOrdersScreen', WorkOrdersScreen],
];

describe('TÜM ekranlar smoke-render (482)', () => {
  it.each(SCREENS)('%s çökmeden mount olur', async (_name, Screen) => {
    const { json } = await renderScreen(Screen);
    expect(json !== undefined).toBe(true);
  });
});
