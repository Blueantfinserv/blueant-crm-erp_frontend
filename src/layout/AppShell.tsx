import { PropsWithChildren, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../theme/theme';
import { ContentContainer } from './ContentContainer';
import { NavigationTabs } from './NavigationTabs';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import type { ModuleItem, ModuleKey, TopTabItem } from './navigationTypes';
import { useAuth } from '../context/AuthContext';

type Props = PropsWithChildren<{
  currentDate: string;
  tabs?: TopTabItem[];
  activeTab?: TopTabItem['key'];
  onTabPress?: (tab: TopTabItem) => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  onLogout?: () => void;
  modules: ModuleItem[];
  activeModule: ModuleKey;
  onModulePress: (module: ModuleItem) => void;
  showTabs?: boolean;
  contentScrollable?: boolean;
}>;

export function AppShell({
  currentDate,
  tabs,
  activeTab,
  onTabPress,
  onNotificationsPress,
  onProfilePress,
  onLogout,
  modules,
  activeModule,
  onModulePress,
  showTabs = true,
  contentScrollable = true,
  children,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  return (
    <View style={styles.shell}>
      {showTabs && tabs && activeTab && onTabPress ? (
        <TopNavigation
          currentDate={currentDate}
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={onTabPress}
          onNotificationsPress={onNotificationsPress}
          onProfilePress={onProfilePress}
          onLogout={onLogout}
          user={user}
        />
      ) : null}
      <View style={styles.body}>
        {modules.length ? (
          <Sidebar
            modules={modules}
            activeModule={activeModule}
            onModulePress={onModulePress}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((current) => !current)}
          />
        ) : null}
        <ContentContainer collapsed={modules.length > 0 && collapsed}>
          {contentScrollable ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentScroll}>
              {children}
            </ScrollView>
          ) : (
            <View style={styles.fixedContent}>{children}</View>
          )}
        </ContentContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  contentScroll: {
    flexGrow: 1,
    alignItems: 'stretch',
    paddingBottom: 24,
  },
  fixedContent: {
    flex: 1,
    minHeight: 0,
  },
});
