import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { en, registerTranslation } from 'react-native-paper-dates';
import { AuthProvider } from './src/context/AuthProvider';
import { useAuth } from './src/context/AuthContext';
import { SplashScreen } from './src/screens/auth/SplashScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { theme } from './src/theme/theme';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SalesCoordinatorScreen } from './src/screens/SalesCoordinatorScreen';
import { CrmOnboardingScreen } from './src/screens/CrmOnboardingScreen';
import { AssignedLeadsScreen } from './src/screens/AssignedLeadsScreen';
import { LegalDocsScreen, type LegalPageKind } from './src/components/LegalPage';
import { LoginFormValues } from './src/utils/authValidation';
import { getRoleNavigationConfig } from './src/navigation/navigationConfig';
import { getRoleExperience, isSalesWorkspaceExperience } from './src/navigation/roleExperience';
import { LeadScreen } from './src/modules/leads/LeadScreen';
import { LeadDetailsScreen } from './src/modules/leads/details/LeadDetailsScreen';
import { AddFollowupScreen } from './src/modules/leads/followup/FollowupScreen';
import { followupItems as defaultFollowupItems, type FollowupItem } from './src/modules/leads/details/leadDetailsData';
import { TeamMappingScreen } from './src/modules/teamMapping/TeamMappingScreen';
import { UsersRolesScreen } from './src/modules/usersRoles/UsersRolesScreen';
import { ReportsScreen } from './src/modules/reports/ReportsScreen';
import type { NavigationRoute } from './src/navigation/navigationConfig';
import { AppShell as ErpShell } from './src/layout/AppShell';
import type { ModuleItem, ModuleKey, TopTabItem, TopTabKey } from './src/layout/navigationTypes';
import { ComingSoon } from './src/components/ComingSoon';
import { DashboardListScreen } from './src/modules/salesManager/dashboard/components/DashboardListScreen';
import { dashboardListsData } from './src/modules/salesManager/dashboard/mock/dashboardListsData';
import type { DashboardListCard } from './src/modules/salesManager/dashboard/types/dashboard';
import { SalesManagerTasksScreen } from './src/modules/salesManager/tasks/SalesManagerTasksScreen';
import { ClientWorkFollowScreen } from './src/screens/ClientWorkFollowScreen';
import { ClientMeetingScheduleForm } from './src/components/ClientMeetingScheduleForm';
import LeadWorkflowForm from './src/modules/salesManager/forms/LeadWorkflowForm';
import { getTaskLeadIdentifier, type SalesTask } from './src/modules/salesManager/tasks/types/tasks';
import { SalesManagerLeadDetailScreen } from './src/modules/salesManager/tasks/SalesManagerLeadDetailScreen';
import { leadService } from './src/services/LeadService';
import { leadSearchService } from './src/services/LeadSearchService';
import { meetingService } from './src/services/MeetingService';
import { meetingApi } from './src/api/meeting';
import type { CreateLeadRequest } from './src/types/lead';
import type { MeetingFormSubmission } from './src/types/meeting';
import { PwaInstallPrompt } from './src/components/PwaInstallPrompt';
import { darkPalette, ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';

import { toMeetingWorkflow } from './src/utils/meetingWorkflow';
import { getTopTabsForExperience, getModuleItemsForExperience } from './src/navigation/shellConfig';

registerTranslation('en', en);

type ScreenState =
  | 'splash'
  | 'login'
  | 'dashboard'
  | 'reports'
  | 'dashboard-list'
  | 'sales-task-details'
  | 'coming-soon'
  | NavigationRoute;

type SalesTaskView = 'all-task' | 'task-to-do' | 'today-task' | 'pending-task' | 'future-3-days' | 'all-leads';

export default function App() {
  return (
    <ThemeProvider>
      <ThemeAwarePaperProvider />
    </ThemeProvider>
  );
}

function ThemeAwarePaperProvider() {
  const { isDark } = useAppTheme();
  const paperTheme = isDark && Platform.OS !== 'web'
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: '#60A5FA',
          secondary: '#A78BFA',
          surface: darkPalette.surface,
          surfaceVariant: darkPalette.surfaceRaised,
          background: darkPalette.page,
          onSurface: darkPalette.bodyText,
          onBackground: darkPalette.bodyText,
          outline: darkPalette.border,
        },
      }
    : MD3LightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <AppShell />
        <PwaInstallPrompt />
      </AuthProvider>
    </PaperProvider>
  );
}

function AppShell() {
  const { isDark } = useAppTheme();
  const auth = useAuth();
  const backendRole = auth.user?.role;
  const experience = getRoleExperience(backendRole);
  const [screen, setScreen] = useState<ScreenState>('splash');
  const [message, setMessage] = useState<string | null>(null);
  const [legalPage, setLegalPage] = useState<LegalPageKind | null>(null);
  const [followups, setFollowups] = useState<FollowupItem[]>(defaultFollowupItems);
  const [activeTab, setActiveTab] = useState<TopTabKey>('dashboard');
  const [activeModule, setActiveModule] = useState<ModuleKey>('sales');
  const [comingSoonModule, setComingSoonModule] = useState<string>('Module');
  const [selectedDashboardListId, setSelectedDashboardListId] = useState<DashboardListCard['id'] | null>(null);
  const [leadForm, setLeadForm] = useState<{
    type: 'new-lead' | 'meeting';
    lead?: SalesTask;
  } | null>(null);
  const [selectedSalesTask, setSelectedSalesTask] = useState<SalesTask | null>(null);
  const [clientMeetingTask, setClientMeetingTask] = useState<SalesTask | null>(null);
  const [salesTaskFilter, setSalesTaskFilter] = useState<'Today' | 'Pending' | 'Future 3 Days'>('Today');
  const [salesTaskView, setSalesTaskView] = useState<SalesTaskView>('task-to-do');
  const [salesTaskScreenKey, setSalesTaskScreenKey] = useState(0);
  const screenHistory = useRef<ScreenState[]>([]);
  const fade = useRef(new Animated.Value(0)).current;
  const authenticatedUserKey = auth.isAuthenticated && auth.user
    ? `${auth.user.role}:${auth.user.id}`
    : null;

  const openTaskWorkflowForm = async (task: SalesTask) => {
    setMessage(null);
    if (task.taskKind === 'CLIENT') {
      if (task.verificationPending) {
        setMessage('Verification is pending for this client. The update form will be available after Process Coordinator verification.');
        return;
      }
      setClientMeetingTask(task);
      return;
    }
    if (task.verificationPending) {
      setMessage('Verification is pending for this prospect. The update form will be available after Process Coordinator verification.');
      return;
    }
    const existingMeetingCode = task.meetingCode?.trim();
    if (existingMeetingCode) {
      const detail = await meetingApi.getMeeting(existingMeetingCode).catch(() => null);
      setLeadForm({
        type: 'meeting',
        lead: { ...task, meetingCode: existingMeetingCode, scheduledAt: detail?.data?.meetingDate ?? task.scheduledAt },
      });
      return;
    }

    const leadId = getTaskLeadIdentifier(task);
    if (!leadId) {
      setMessage('No backend prospect identifier is available for this meeting.');
      return;
    }
    try {
      const meetingCode = await meetingService.resolveActiveMeetingCode(leadId);
      if (!meetingCode) {
        setMessage('No active meeting is available for this prospect.');
        return;
      }
      const detail = await meetingApi.getMeeting(meetingCode).catch(() => null);
      const resolvedTask = { ...task, meetingCode, scheduledAt: detail?.data?.meetingDate ?? task.scheduledAt };
      setSelectedSalesTask((current) => current?.id === task.id ? resolvedTask : current);
      setLeadForm({ type: 'meeting', lead: resolvedTask });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Active meeting could not be loaded.');
    }
  };

  useEffect(() => {
    const isIndividualSalesWorkspace = isSalesWorkspaceExperience(getRoleExperience(backendRole));
    const assignedUserId = isIndividualSalesWorkspace && typeof auth.user?.id === 'number'
      ? auth.user.id
      : null;
    const employeeCode = isIndividualSalesWorkspace
      ? auth.user?.employeeId?.trim() || null
      : null;
    leadSearchService.setAssignedUserScope(assignedUserId, employeeCode);
    meetingService.setEmployeeScope(employeeCode);
    leadService.reset();
    leadSearchService.reset();
    meetingService.reset();
    setFollowups(defaultFollowupItems);
    setSelectedDashboardListId(null);
    setSelectedSalesTask(null);
    setLeadForm(null);
    if (isSalesWorkspaceExperience(getRoleExperience(backendRole))) {
      setSalesTaskView('task-to-do');
      setSalesTaskScreenKey(0);
    }
  }, [authenticatedUserKey, backendRole]);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade, screen]);

  useEffect(() => {
    if (!auth.isInitialized) {
      setScreen('splash');
      return;
    }
    if (auth.isAuthenticated && auth.user?.role) {
      if (screen === 'splash' || screen === 'login') {
        setScreen(isSalesWorkspaceExperience(experience) ? 'leads' : 'dashboard');
      }
      return;
    }
    if (screen !== 'login') {
      screenHistory.current = [];
      setScreen('login');
    }
  }, [auth.isAuthenticated, auth.isInitialized, auth.user?.role, experience, screen]);

  useEffect(() => {
    if (isSalesWorkspaceExperience(experience)) {
      setActiveModule('sales');
    }
  }, [experience]);

  useEffect(() => {
    if (screen === 'dashboard' || screen === 'dashboard-list') setActiveTab('dashboard');
    if (screen === 'reports') setActiveTab('reports');
    if (screen === 'users-roles') setActiveTab('users-roles');
    if (screen === 'team-mapping') setActiveTab('team-mapping');
    if (screen === 'leads' || screen === 'lead-details' || screen === 'add-followup' || screen === 'sales-task-details') setActiveTab('all-tasks');
    if (screen === 'coming-soon') setActiveTab('dashboard');
  }, [screen]);

  const navigate = (next: ScreenState) => {
    setMessage(null);
    if (screen !== next) {
      screenHistory.current.push(screen);
    }
    setScreen(next);
  };

  const goBack = () => {
    setMessage(null);
    const previous = screenHistory.current.pop();
    if (previous) {
      setScreen(previous);
    }
  };

  const openLegalPage = (next: LegalPageKind) => {
    setMessage(null);
    setLegalPage(next);
  };

  const runAction = async (action: () => Promise<unknown>, next?: ScreenState) => {
    setMessage(null);
    try {
      await action();
      if (next) {
        setScreen(next);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  const handleLogout = () => {
    void runAction(() => auth.logout(), 'login');
  };

  const submitNewLead = async (request: CreateLeadRequest) => {
    await leadService.createLead(request);
    return leadService.getState().success ?? 'Prospect created successfully.';
  };

  const submitMeeting = async (form: MeetingFormSubmission) => {
    const task = leadForm?.lead;
    if (!task) throw new Error('Prospect task is unavailable.');
    const meetingCode = form.meetingCode?.trim() || task.meetingCode?.trim() || null;
    if (!meetingCode) {
      throw new Error('No active meeting is available for this prospect. Please refresh and try again.');
    }
    const submission = toMeetingWorkflow({ ...form, meetingCode });
    await meetingService.submitWorkflow(submission.meetingCode, submission.workflow);
    if (form.leadStatus === 'Converted as Client' || form.leadStatus === 'Already Blueant Client') {
      const leadIdentity = {
        leadId: task.leadId,
        leadCode: task.leadCode,
        uniqueLeadId: task.uniqueLeadId,
      };
      leadSearchService.hideLeadFromTasks(leadIdentity);
      meetingService.hideLeadFromTasks(leadIdentity);
    }
    await leadSearchService.loadLeads();
    return 'Meeting submitted successfully.';
  };

  const content = useMemo(() => {
    const roleNavigation = getRoleNavigationConfig(backendRole);
    const topTabs = getTopTabsForExperience(experience);
    const moduleItems = getModuleItemsForExperience(experience);
    const salesPersonMenu = [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'all-task', label: 'All Task' },
      { key: 'task-to-do', label: 'Task To Do' },
      { key: 'today-task', label: "Today's Task" },
      { key: 'pending-task', label: 'Pending Task' },
      { key: 'future-3-days', label: 'Future 3 Days' },
      { key: 'all-leads', label: 'All Prospects' },
      ...(backendRole === 'RELATIONSHIP_MANAGER' || backendRole === 'SALES_COORDINATOR' ? [{ key: 'all-clients', label: 'All Clients' }] : []),
      { key: 'profile', label: 'My Profile' },
    ] as const;
    const onSalesPersonMenuSelect = (key: string) => {
      if (key === 'dashboard') {
        setActiveTab('dashboard');
        navigate('dashboard');
        return;
      }
      if (key === 'all-clients') {
        setActiveTab('all-tasks');
        navigate('client-work-follow');
        return;
      }
      const taskView = key as SalesTaskView;
      if (!['all-task', 'task-to-do', 'today-task', 'pending-task', 'future-3-days', 'all-leads'].includes(taskView)) return;
      if (key === 'today-task') setSalesTaskFilter('Today');
      if (key === 'pending-task') setSalesTaskFilter('Pending');
      if (key === 'future-3-days') setSalesTaskFilter('Future 3 Days');
      setSalesTaskView(taskView);
      setSalesTaskScreenKey((current) => current + 1);
      setActiveTab('all-tasks');
      navigate('leads');
    };
    const currentDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());

    const renderShell = (children: ReactNode, options: {
      salesMenu?: boolean;
      scrollable?: boolean;
      bare?: boolean;
      onModulePress?: (module: ModuleItem) => void;
    } = {}) => (
      <ErpShell
        currentDate={currentDate}
        {...(!options.bare ? {
          tabs: topTabs,
          activeTab,
          onTabPress: (tab: TopTabItem) => { setActiveTab(tab.key); navigate(tab.route); },
        } : {})}
        {...(options.salesMenu && isSalesWorkspaceExperience(experience)
          ? { salesPersonMenu, onSalesPersonMenuSelect }
          : {})}
        contentScrollable={options.scrollable}
        onLogout={handleLogout}
        modules={moduleItems}
        activeModule={activeModule}
        onModulePress={options.onModulePress ?? ((module) => {
          setActiveModule(module.key);
          if (module.key === 'sales') {
            navigate('dashboard');
            return;
          }
          setComingSoonModule(module.label);
          navigate('coming-soon');
        })}
      >
        {children}
      </ErpShell>
    );

    switch (screen) {
      case 'splash':
        return <SplashScreen />;
      case 'login':
        return (
          <LoginScreen
            onLogin={(credentials: LoginFormValues) => {
              void runAction(() => auth.login(credentials));
            }}
            onForgotPassword={(credentials) => auth.forgotPassword(credentials)}
            onResetPassword={(credentials) => auth.resetPassword(credentials)}
            onHelp={() => openLegalPage('help')}
            onContact={() => openLegalPage('contact')}
            onPrivacyPolicy={() => openLegalPage('privacyPolicy')}
            onTerms={() => openLegalPage('terms')}
            loading={auth.isLoading || auth.isRefreshing}
            errorMessage={message ?? auth.error}
            successMessage={auth.success}
          />
        );
      case 'dashboard':
        return renderShell(
          experience === 'SALES_COORDINATOR' ? (
            <SalesCoordinatorScreen permissions={auth.user?.permissions} />
          ) : experience === 'CRM_ONBOARDING' ? (
            <CrmOnboardingScreen />
          ) : activeModule === 'sales' ? (
            <DashboardScreen
              role={roleNavigation.role}
              experience={experience}
              title={roleNavigation.title}
              subtitle={roleNavigation.subtitle}
              menuItems={roleNavigation.menuItems}
              user={auth.user}
              onMenuItemPress={(item) => navigate(item.route)}
              onLogout={() => runAction(() => auth.logout(), 'login')}
              onOpenDashboardList={(listId) => {
                setSelectedDashboardListId(listId);
                navigate('dashboard-list');
              }}
              onOpenTaskFilter={(filter) => {
                setSalesTaskView(filter === 'Today' ? 'today-task' : 'pending-task');
                setSalesTaskFilter(filter);
                setSalesTaskScreenKey((current) => current + 1);
                navigate('leads');
              }}
            />
          ) : (
            <ComingSoon title={comingSoonModule} />
          ),
          { salesMenu: true, scrollable: experience !== 'SALES_COORDINATOR' }
        );
      case 'dashboard-list': {
        const selectedList = dashboardListsData.find((list) => list.id === selectedDashboardListId);
        if (!selectedList) {
          return null;
        }

        return renderShell(
          <DashboardListScreen
            list={selectedList}
            userName={auth.user?.fullName ?? 'Salesperson'}
            userId={typeof auth.user?.id === 'number' ? auth.user.id : undefined}
            employeeCode={auth.user?.employeeId}
            onBack={goBack}
          />,
          { salesMenu: true, scrollable: false, onModulePress: (module) => { setActiveModule(module.key); navigate('dashboard'); } }
        );
      }
      case 'reports':
        return renderShell(
          <ReportsScreen />,
          { onModulePress: (module) => { setActiveModule(module.key); if (module.key === 'sales') { navigate('reports'); return; } setComingSoonModule(module.label); navigate('coming-soon'); } }
        );
      case 'users-roles':
        return renderShell(<UsersRolesScreen />);
      case 'team-mapping':
        return renderShell(<TeamMappingScreen />);
      case 'leads':
        return renderShell(
          experience === 'CRM_ONBOARDING' ? (
            <CrmOnboardingScreen />
          ) : isSalesWorkspaceExperience(experience) ? (
            <SalesManagerTasksScreen
              key={salesTaskScreenKey}
              initialTaskType={salesTaskFilter}
              allTaskMode={salesTaskView === 'all-task'}
              taskToDoMode={salesTaskView === 'task-to-do'}
              todaysTaskMode={salesTaskView === 'today-task'}
              pendingTaskMode={salesTaskView === 'pending-task'}
              future3DaysTaskMode={salesTaskView === 'future-3-days'}
              allLeadsMode={salesTaskView === 'all-leads'}
              onCreateNewLead={() => setLeadForm({ type: 'new-lead' })}
              onUpdateMeeting={(lead) => void openTaskWorkflowForm(lead)}
              onOpenLeadDetails={(lead) => {
                setSelectedSalesTask(lead);
                navigate('sales-task-details');
              }}
            />
          ) : (
            <LeadScreen onOpenLeadDetails={() => navigate('lead-details')} />
          ),
          { salesMenu: true, scrollable: !isSalesWorkspaceExperience(experience) }
        );
      case 'client-work-follow':
        return renderShell(
          <ClientWorkFollowScreen
            refreshKey={salesTaskScreenKey}
            onUpdateMeeting={(client) => void openTaskWorkflowForm(client)}
            onOpenDetails={(client) => {
              setSelectedSalesTask(client);
              navigate('sales-task-details');
            }}
          />,
          { salesMenu: true, scrollable: false, onModulePress: (module) => { setActiveModule(module.key); navigate('dashboard'); } }
        );
      case 'assigned-tasks':
        return renderShell(
          <AssignedLeadsScreen />,
          { salesMenu: true, scrollable: false, onModulePress: () => navigate('dashboard') }
        );
      case 'sales-task-details':
        if (!selectedSalesTask) return null;
        return renderShell(
          <SalesManagerLeadDetailScreen
            lead={selectedSalesTask}
            onBack={goBack}
            onUpdateMeeting={(lead) => void openTaskWorkflowForm(lead)}
          />,
          { salesMenu: true, scrollable: false, onModulePress: (module) => { setActiveModule(module.key); navigate('dashboard'); } }
        );
      case 'lead-details':
        return renderShell(<LeadDetailsScreen onBack={goBack} followups={followups} onAddFollowup={() => navigate('add-followup')} />);
      case 'add-followup':
        return renderShell(
          <AddFollowupScreen
            onCancel={goBack}
            onSave={(followup) => {
              setFollowups((current) => [followup, ...current]);
            }}
          />
        );
      case 'coming-soon':
        return renderShell(
          <ComingSoon title={comingSoonModule} />,
          { bare: true }
        );
      default:
        return null;
    }
  }, [activeModule, activeTab, auth, backendRole, comingSoonModule, experience, followups, message, salesTaskFilter, salesTaskScreenKey, salesTaskView, screen, selectedDashboardListId, selectedSalesTask]);

  return (
    <SafeAreaView style={[styles.root, isDark && Platform.OS !== 'web' && styles.rootDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? darkPalette.page : theme.colors.secondary} />
      <Animated.View style={[styles.animatedShell, { opacity: fade }]}>
        {content}
        <LegalDocsScreen
          kind={legalPage}
          onClose={() => setLegalPage(null)}
          onNavigate={(next) => setLegalPage(next)}
        />
        <Modal
          transparent
          visible={Boolean(leadForm)}
          animationType="fade"
          onRequestClose={() => setLeadForm(null)}
        >
          <Pressable style={styles.newLeadBackdrop} onPress={() => setLeadForm(null)}>
            <Pressable style={styles.newLeadModal} onPress={() => {}}>
              {leadForm ? (
                <LeadWorkflowForm
                  key={`${leadForm.type}-${leadForm.lead?.id ?? 'new'}-${backendRole ?? 'unknown'}`}
                  type={leadForm.type}
                  lead={leadForm.lead}
                  role={backendRole}
                  onClose={() => setLeadForm(null)}
                  onSubmit={leadForm.type === 'new-lead' ? submitNewLead : submitMeeting}
                />
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
        <Modal transparent visible={Boolean(clientMeetingTask)} animationType="fade" onRequestClose={() => setClientMeetingTask(null)}>
          <Pressable style={styles.newLeadBackdrop} onPress={() => setClientMeetingTask(null)}>
            <Pressable style={styles.newLeadModal} onPress={() => {}}>
              {clientMeetingTask ? <ClientMeetingScheduleForm client={clientMeetingTask} onClose={() => setClientMeetingTask(null)} onSuccess={() => { setClientMeetingTask(null); setSalesTaskScreenKey((current) => current + 1); }} /> : null}
            </Pressable>
          </Pressable>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  rootDark: {
    backgroundColor: darkPalette.page,
  },
  animatedShell: {
    flex: 1,
  },
  newLeadBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
  },
  newLeadModal: {
    width: '100%',
    maxWidth: 470,
    height: '92%',
    maxHeight: 900,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
  },
});
