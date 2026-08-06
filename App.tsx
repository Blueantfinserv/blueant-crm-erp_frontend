import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { en, registerTranslation } from 'react-native-paper-dates';
import { AuthProvider } from './src/context/AuthProvider';
import { useAuth } from './src/context/AuthContext';
import { SplashScreen } from './src/screens/auth/SplashScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { CreateAccountScreen } from './src/screens/auth/CreateAccountScreen';
import { ForgotPasswordScreen } from './src/screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/auth/ResetPasswordScreen';
import { theme } from './src/theme/theme';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LegalDocsScreen, type LegalPageKind } from './src/components/LegalPage';
import { AuthRole, ForgotPasswordCredentials, RegisterCredentials, ResetPasswordCredentials } from './src/types/auth';
import { LoginFormValues } from './src/utils/authValidation';
import { getRoleNavigationConfig } from './src/navigation/navigationConfig';
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
import LeadWorkflowForm from './src/modules/salesManager/forms/LeadWorkflowForm';
import type { SalesTask } from './src/modules/salesManager/tasks/types/tasks';
import { SalesManagerLeadDetailScreen } from './src/modules/salesManager/tasks/SalesManagerLeadDetailScreen';
import { leadService } from './src/services/LeadService';
import type { CreateLeadRequest } from './src/types/lead';

registerTranslation('en', en);

// TODO: Remove this development override once Sales Manager test accounts are available from the backend.
const ENABLE_DEV_SALES_MANAGER_ROLE_OVERRIDE = true;

const getUiRole = (backendRole: AuthRole | null | undefined): AuthRole | null | undefined => {
  if (__DEV__ && ENABLE_DEV_SALES_MANAGER_ROLE_OVERRIDE && backendRole === 'SUPER_ADMIN') {
    return 'SALES_MANAGER';
  }
  return backendRole;
};

type ScreenState =
  | 'splash'
  | 'login'
  | 'createAccount'
  | 'forgotPassword'
  | 'resetPassword'
  | 'dashboard'
  | 'reports'
  | 'dashboard-list'
  | 'sales-task-details'
  | 'coming-soon'
  | NavigationRoute;

const baseTopTabs: TopTabItem[] = [
  { key: 'dashboard', label: 'Dashboard', route: 'dashboard' },
  { key: 'reports', label: 'Reports', route: 'reports' },
  { key: 'team-mapping', label: 'Team Mapping', route: 'team-mapping' },
  { key: 'users-roles', label: 'Users & Roles', route: 'users-roles' },
  { key: 'all-tasks', label: 'All Tasks', route: 'leads' },
  { key: 'more', label: 'More', route: 'lead-details' },
];

const baseModuleItems: ModuleItem[] = [
  { key: 'sales', label: 'Sales', icon: 'SA', route: 'dashboard' },
  { key: 'new-onboarding', label: 'New Onboarding', icon: 'NO', route: 'coming-soon' },
  { key: 'rm-crm', label: 'RM & CRM', icon: 'RC', route: 'coming-soon' },
  { key: 'helpdesk', label: 'Helpdesk', icon: 'HD', route: 'coming-soon' },
  { key: 'accounts', label: 'Accounts', icon: 'AC', route: 'coming-soon' },
  { key: 'hr', label: 'HR', icon: 'HR', route: 'coming-soon' },
];

const getTopTabsForRole = (role: AuthRole | null | undefined): TopTabItem[] => {
  if (role === 'SALES_MANAGER') {
    return [
      { key: 'dashboard', label: 'Dashboard', route: 'dashboard' },
      { key: 'all-tasks', label: 'Your Task', route: 'leads' },
    ];
  }

  return baseTopTabs;
};

const getModuleItemsForRole = (role: AuthRole | null | undefined): ModuleItem[] => {
  if (role === 'SALES_MANAGER') {
    return [];
  }

  return baseModuleItems;
};

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </PaperProvider>
  );
}

function AppShell() {
  const auth = useAuth();
  const uiRole = getUiRole(auth.user?.role);
  const [screen, setScreen] = useState<ScreenState>('splash');
  const [message, setMessage] = useState<string | null>(null);
  const [legalPage, setLegalPage] = useState<LegalPageKind | null>(null);
  const [followups, setFollowups] = useState<FollowupItem[]>(defaultFollowupItems);
  const [activeTab, setActiveTab] = useState<TopTabKey>('dashboard');
  const [activeModule, setActiveModule] = useState<ModuleKey>('sales');
  const [comingSoonModule, setComingSoonModule] = useState<string>('Module');
  const [selectedDashboardListId, setSelectedDashboardListId] = useState<DashboardListCard['id'] | null>(null);
  const [leadForm, setLeadForm] = useState<{
    type: 'new-lead' | 'first-meeting' | 'followup-meeting';
    lead?: SalesTask;
  } | null>(null);
  const [selectedSalesTask, setSelectedSalesTask] = useState<SalesTask | null>(null);
  const screenHistory = useRef<ScreenState[]>([]);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade, screen]);

  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => setScreen('login'), 2400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [screen]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.role) {
      setScreen('dashboard');
    }
  }, [auth.isAuthenticated, auth.user?.role]);

  useEffect(() => {
    if (uiRole === 'SALES_MANAGER') {
      setActiveModule('sales');
    }
  }, [uiRole]);

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

  const content = useMemo(() => {
    const roleNavigation = getRoleNavigationConfig(uiRole);
    const topTabs = getTopTabsForRole(uiRole);
    const moduleItems = getModuleItemsForRole(uiRole);
    const currentDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());

    switch (screen) {
      case 'splash':
        return <SplashScreen />;
      case 'login':
        return (
          <LoginScreen
            onLogin={(credentials: LoginFormValues) => {
              void runAction(() => auth.login(credentials));
            }}
            onForgotPassword={() => navigate('forgotPassword')}
            onForgotPasswordSubmit={(credentials: ForgotPasswordCredentials) => {
              void runAction(() => auth.forgotPassword(credentials));
            }}
            onCreateAccount={(credentials) => {
              void runAction(() => auth.createAccount(credentials), 'dashboard');
            }}
            onHelp={() => openLegalPage('help')}
            onContact={() => openLegalPage('contact')}
            onPrivacyPolicy={() => openLegalPage('privacyPolicy')}
            onTerms={() => openLegalPage('terms')}
            loading={auth.isLoading || auth.isRefreshing}
            errorMessage={message ?? auth.error}
            successMessage={auth.success}
          />
        );
      case 'createAccount':
        return (
          <CreateAccountScreen
            onBack={() => navigate('login')}
            onCreateAccount={(credentials: RegisterCredentials) => {
              void runAction(() => auth.createAccount(credentials), 'login');
            }}
            onLogin={() => navigate('login')}
            loading={auth.isLoading || auth.isRefreshing}
            errorMessage={message ?? auth.error}
          />
        );
      case 'forgotPassword':
        return (
          <ForgotPasswordScreen
            onBack={() => navigate('login')}
            onSendResetLink={(credentials: ForgotPasswordCredentials) => {
              void runAction(() => auth.forgotPassword(credentials));
            }}
            loading={auth.isLoading || auth.isRefreshing}
            errorMessage={message ?? auth.error}
            onSuccess={() => navigate('login')}
          />
        );
      case 'resetPassword':
        return (
          <ResetPasswordScreen
            onBack={() => navigate('login')}
            loading={auth.isLoading || auth.isRefreshing}
            errorMessage={message ?? auth.error}
            onUpdatePassword={(credentials: ResetPasswordCredentials) => {
              void runAction(() => auth.resetPassword(credentials), 'login');
            }}
          />
        );
      case 'dashboard':
        return (
          <ErpShell
            currentDate={currentDate}
            tabs={topTabs}
            activeTab={activeTab}
            onLogout={handleLogout}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
              navigate(tab.route);
            }}
            modules={moduleItems}
            activeModule={activeModule}
            onModulePress={(module) => {
              setActiveModule(module.key);
              if (module.key === 'sales') {
                navigate('dashboard');
                return;
              }
              setComingSoonModule(module.label);
              navigate('coming-soon');
            }}
          >
            {activeModule === 'sales' ? (
              <DashboardScreen
                role={roleNavigation.role}
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
                onCreateNewLead={() => setLeadForm({ type: 'new-lead' })}
              />
            ) : (
              <ComingSoon title={comingSoonModule} />
            )}
          </ErpShell>
        );
      case 'dashboard-list': {
        const selectedList = dashboardListsData.find((list) => list.id === selectedDashboardListId);
        if (!selectedList) {
          return null;
        }

        return (
          <ErpShell
            currentDate={currentDate}
            contentScrollable={false}
            tabs={topTabs}
            activeTab={activeTab}
            onLogout={handleLogout}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
              navigate(tab.route);
            }}
            modules={moduleItems}
            activeModule={activeModule}
            onModulePress={(module) => {
              setActiveModule(module.key);
              navigate('dashboard');
            }}
          >
            <DashboardListScreen list={selectedList} userName={auth.user?.fullName ?? 'Salesperson'} onBack={goBack} />
          </ErpShell>
        );
      }
      case 'reports':
        return (
          <ErpShell
            currentDate={currentDate}
            tabs={topTabs}
            activeTab={activeTab}
            onLogout={handleLogout}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
              navigate(tab.route);
            }}
            modules={moduleItems}
            activeModule={activeModule}
            onModulePress={(module) => {
              setActiveModule(module.key);
              if (module.key === 'sales') {
                navigate('reports');
                return;
              }
              setComingSoonModule(module.label);
              navigate('coming-soon');
            }}
          >
            <ReportsScreen />
          </ErpShell>
        );
      case 'users-roles':
        return (
          <ErpShell
            currentDate={currentDate}
            tabs={topTabs}
            activeTab={activeTab}
            onLogout={handleLogout}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
              navigate(tab.route);
            }}
            modules={moduleItems}
            activeModule={activeModule}
            onModulePress={(module) => {
              setActiveModule(module.key);
              if (module.key === 'sales') {
                navigate('dashboard');
                return;
              }
              setComingSoonModule(module.label);
              navigate('coming-soon');
            }}
          >
            <UsersRolesScreen />
          </ErpShell>
        );
      case 'team-mapping':
        return (
          <ErpShell
            currentDate={currentDate}
            tabs={topTabs}
            activeTab={activeTab}
            onLogout={handleLogout}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
              navigate(tab.route);
            }}
            modules={moduleItems}
            activeModule={activeModule}
            onModulePress={(module) => {
              setActiveModule(module.key);
              if (module.key === 'sales') {
                navigate('dashboard');
                return;
              }
              setComingSoonModule(module.label);
              navigate('coming-soon');
            }}
          >
            <TeamMappingScreen />
          </ErpShell>
        );
      case 'leads':
        return (
          <ErpShell
            currentDate={currentDate}
            contentScrollable={uiRole !== 'SALES_MANAGER'}
            tabs={topTabs}
            activeTab={activeTab}
            onLogout={handleLogout}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
              navigate(tab.route);
            }}
            modules={moduleItems}
            activeModule={activeModule}
            onModulePress={(module) => {
              setActiveModule(module.key);
              if (module.key === 'sales') {
                navigate('dashboard');
                return;
              }
              setComingSoonModule(module.label);
              navigate('coming-soon');
            }}
          >
            {uiRole === 'SALES_MANAGER' ? (
              <SalesManagerTasksScreen
                onCreateNewLead={() => setLeadForm({ type: 'new-lead' })}
                onUpdateMeeting={(lead) => setLeadForm({
                  type: lead.meetingStage === '1st Meeting' ? 'first-meeting' : 'followup-meeting',
                  lead,
                })}
                onOpenLeadDetails={(lead) => {
                  setSelectedSalesTask(lead);
                  navigate('sales-task-details');
                }}
              />
            ) : (
              <LeadScreen onOpenLeadDetails={() => navigate('lead-details')} />
            )}
          </ErpShell>
        );
      case 'sales-task-details':
        if (!selectedSalesTask) return null;
        return (
          <ErpShell
            currentDate={currentDate}
            contentScrollable={false}
            tabs={topTabs}
            activeTab={activeTab}
            onLogout={handleLogout}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
              navigate(tab.route);
            }}
            modules={moduleItems}
            activeModule={activeModule}
            onModulePress={(module) => {
              setActiveModule(module.key);
              navigate('dashboard');
            }}
          >
            <SalesManagerLeadDetailScreen
              lead={selectedSalesTask}
              onBack={goBack}
              onUpdateMeeting={(lead) => setLeadForm({
                type: lead.meetingStage === '1st Meeting' ? 'first-meeting' : 'followup-meeting',
                lead,
              })}
            />
          </ErpShell>
        );
      case 'lead-details':
        return (
          <ErpShell
            currentDate={currentDate}
            tabs={topTabs}
            activeTab={activeTab}
            onLogout={handleLogout}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
              navigate(tab.route);
            }}
            modules={moduleItems}
            activeModule={activeModule}
            onModulePress={(module) => {
              setActiveModule(module.key);
              if (module.key === 'sales') {
                navigate('dashboard');
                return;
              }
              setComingSoonModule(module.label);
              navigate('coming-soon');
            }}
          >
            <LeadDetailsScreen onBack={goBack} followups={followups} onAddFollowup={() => navigate('add-followup')} />
          </ErpShell>
        );
      case 'add-followup':
        return (
          <ErpShell
            currentDate={currentDate}
            tabs={topTabs}
            activeTab={activeTab}
            onLogout={handleLogout}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
              navigate(tab.route);
            }}
            modules={moduleItems}
            activeModule={activeModule}
            onModulePress={(module) => {
              setActiveModule(module.key);
              if (module.key === 'sales') {
                navigate('dashboard');
                return;
              }
              setComingSoonModule(module.label);
              navigate('coming-soon');
            }}
          >
            <AddFollowupScreen
              onCancel={goBack}
              onSave={(followup) => {
                setFollowups((current) => [followup, ...current]);
              }}
            />
          </ErpShell>
        );
      case 'coming-soon':
        return (
          <ErpShell
            currentDate={currentDate}
            modules={moduleItems}
            activeModule={activeModule}
            onLogout={handleLogout}
            onModulePress={(module) => {
              setActiveModule(module.key);
              if (module.key === 'sales') {
                navigate('dashboard');
                return;
              }
              setComingSoonModule(module.label);
              navigate('coming-soon');
            }}
          >
            <ComingSoon title={comingSoonModule} />
          </ErpShell>
        );
      default:
        return null;
    }
  }, [activeModule, activeTab, auth, comingSoonModule, followups, message, screen, selectedDashboardListId, selectedSalesTask, uiRole]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.secondary} />
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
                  key={`${leadForm.type}-${leadForm.lead?.id ?? 'new'}`}
                  type={leadForm.type}
                  lead={leadForm.lead}
                  onClose={() => setLeadForm(null)}
                  onSubmit={leadForm.type === 'new-lead'
                    ? async (request: CreateLeadRequest) => {
                        await leadService.createLead(request);
                        return leadService.getState().success ?? 'Lead created successfully.';
                      }
                    : undefined}
                />
              ) : null}
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
