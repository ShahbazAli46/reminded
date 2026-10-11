import 'fast-text-encoding';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useColorScheme, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAppStore } from './src/store/useAppStore';
import { NotificationService } from './src/services/notificationService';
import { IncomingTaskToast } from './src/components/common/IncomingTaskToast';

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  React.useEffect(() => {
    // 1. Initialize session, local database, and register FCM token
    useAppStore.getState().initSession().then(() => {
      // Check cold-start notification response (if app was launched by tapping a notification from killed state)
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          const content = response.notification.request.content;
          const data = content.data as Record<string, any> | undefined;
          console.log('🚀 [App] Cold start launched via notification:', content.title, data);

          if (data?.type === 'new_task') {
            NotificationService.handleIncomingTaskNotification(data, content.title, content.body).then((task) => {
              if (task) {
                useAppStore.getState().receiveAssignedTask(task);
                useAppStore.getState().selectTask(task.id);
              }
            });
          } else if (data?.type === 'task_tick_update' && data?.taskId && data?.readState) {
            useAppStore.getState().updateTaskDeliveryStatus(data.taskId, data.readState);
          } else if (data?.taskId) {
            useAppStore.getState().selectTask(data.taskId);
          }
        }
      }).catch(() => {});
    });

    // 2. Setup AppState change listener for foreground resume
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const store = useAppStore.getState();
        NotificationService.flushPendingAcks().catch(() => {});
        NotificationService.reconcileDueAlarms(store.tasks).catch(() => {});
      }
    });

    // 3. Setup Notification Receiving Service listeners
    const unsubscribeNotifications = NotificationService.setupNotificationListeners({
      onReceived: async (notification) => {
        const content = notification.request.content;
        const data = content.data as Record<string, any> | undefined;
        console.log('🔔 [App] Notification received in foreground:', content.title, data);

        // A. New task assignment push
        if (data?.type === 'new_task') {
          const taskItem = await NotificationService.handleIncomingTaskNotification(
            data,
            content.title,
            content.body
          );
          if (taskItem) {
            useAppStore.getState().receiveAssignedTask(taskItem);
          }
        }
        // B. 3-Tier Tick update push (delivered / notified / opened)
        else if (data?.type === 'task_tick_update' && data?.taskId && data?.readState) {
          useAppStore.getState().updateTaskDeliveryStatus(data.taskId, data.readState);
        }
        // C. Task status or due date update push
        else if (data?.type === 'task_update' && data?.taskId) {
          const store = useAppStore.getState();
          if (data.status) {
            store.updateTaskStatus(data.taskId, data.status as any);
          }
        }
        // D. First-contact request push
        else if (data?.type === 'new_request' || data?.type === 'contact_request') {
          useAppStore.getState().openIncomingModal();
        }
      },
      onResponse: async (response) => {
        const content = response.notification.request.content;
        const data = content.data as Record<string, any> | undefined;
        console.log('📲 [App] User tapped notification alert:', content.title, data);

        if (data?.type === 'new_task') {
          const taskItem = await NotificationService.handleIncomingTaskNotification(
            data,
            content.title,
            content.body
          );
          if (taskItem) {
            useAppStore.getState().receiveAssignedTask(taskItem);
            useAppStore.getState().selectTask(taskItem.id);
          } else if (data?.taskId) {
            useAppStore.getState().selectTask(data.taskId);
          }
        } else if (data?.type === 'task_tick_update' && data?.taskId && data?.readState) {
          useAppStore.getState().updateTaskDeliveryStatus(data.taskId, data.readState);
          useAppStore.getState().selectTask(data.taskId);
        } else if (data?.taskId) {
          useAppStore.getState().selectTask(data.taskId);
        } else if (data?.type === 'new_request' || data?.type === 'requests') {
          useAppStore.getState().navigateTo('Requests');
        } else {
          useAppStore.getState().navigateTo('TaskList');
        }
      },
    });

    return () => {
      appStateSubscription.remove();
      unsubscribeNotifications();
    };
  }, []);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={[styles.appContainer, { backgroundColor: isDark ? '#0B141A' : '#FFFFFF' }]} />;
  }

  return (
    <View style={[styles.appContainer, { backgroundColor: isDark ? '#0B141A' : '#FFFFFF' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <IncomingTaskToast />
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
});
