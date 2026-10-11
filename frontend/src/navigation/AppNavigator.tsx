import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  BackHandler,
  PanResponder,
} from 'react-native';
import { useAppStore, AppScreen } from '../store/useAppStore';
import { SplashScreen } from '../screens/SplashScreen';
import { PhoneEntryScreen } from '../screens/PhoneEntryScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
import { TaskListScreen } from '../screens/TaskListScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { CreateTaskScreen } from '../screens/CreateTaskScreen';
import { WebInvitePage } from '../screens/WebInvitePage';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RequestsScreen } from '../screens/RequestsScreen';
import { IncomingRequestModal } from '../screens/IncomingRequestModal';
import { BlockConfirmationModal } from '../screens/BlockConfirmationModal';
import { ImageViewerModal } from '../screens/ImageViewerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PUSHED_SCREENS = new Set<AppScreen>(['CreateTask', 'TaskDetail']);

export const AppNavigator: React.FC = () => {
  const { currentScreen, navigateTo } = useAppStore();

  const [baseScreen, setBaseScreen] = useState<AppScreen>('TaskList');
  const [pushedScreen, setPushedScreen] = useState<AppScreen | null>(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (PUSHED_SCREENS.has(currentScreen)) {
      // Pushing a new screen onto the stack
      setPushedScreen(currentScreen);
      slideAnim.setValue(SCREEN_WIDTH);
      isAnimatingRef.current = true;
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false;
      });
    } else {
      // Navigated to a base screen
      if (pushedScreen && !isAnimatingRef.current) {
        // Slide out if previously showing a pushed screen
        isAnimatingRef.current = true;
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          useNativeDriver: true,
        }).start(() => {
          isAnimatingRef.current = false;
          setPushedScreen(null);
          setBaseScreen(currentScreen);
        });
      } else if (!pushedScreen) {
        setBaseScreen(currentScreen);
      }
    }
  }, [currentScreen]);

  useEffect(() => {
    const onBackPress = () => {
      if (pushedScreen || PUSHED_SCREENS.has(currentScreen)) {
        handleDismissPushed('TaskList');
        return true;
      }
      if (currentScreen === 'Requests' || currentScreen === 'Profile' || currentScreen === 'WebInvite') {
        navigateTo('TaskList');
        return true;
      }
      if (currentScreen === 'OtpVerification') {
        navigateTo('PhoneEntry');
        return true;
      }
      if (currentScreen === 'ProfileSetup') {
        navigateTo('OtpVerification');
        return true;
      }
      return false; // Let Android exit app on root TaskList or Splash
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [pushedScreen, currentScreen, baseScreen]);

  const handleDismissPushed = (target: AppScreen = baseScreen) => {
    isAnimatingRef.current = true;
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: true,
    }).start(() => {
      isAnimatingRef.current = false;
      setPushedScreen(null);
      navigateTo(target);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only activate if horizontal swipe to the right starting from left edge
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
        const isSwipingRight = gestureState.dx > 15;
        return isHorizontal && isSwipingRight && gestureState.x0 < SCREEN_WIDTH * 0.35;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SCREEN_WIDTH * 0.3 || gestureState.vx > 0.5) {
          handleDismissPushed('TaskList');
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

  const renderBaseScreen = (screen: AppScreen) => {
    switch (screen) {
      case 'Splash':
        return <SplashScreen />;
      case 'PhoneEntry':
        return <PhoneEntryScreen />;
      case 'OtpVerification':
        return <OtpVerificationScreen />;
      case 'ProfileSetup':
        return <ProfileSetupScreen />;
      case 'TaskList':
        return <TaskListScreen />;
      case 'Requests':
        return <RequestsScreen />;
      case 'Profile':
        return <ProfileScreen />;
      case 'WebInvite':
        return <WebInvitePage />;
      default:
        return <TaskListScreen />;
    }
  };

  const renderPushedScreen = (screen: AppScreen) => {
    switch (screen) {
      case 'CreateTask':
        return <CreateTaskScreen onBack={() => handleDismissPushed('TaskList')} />;
      case 'TaskDetail':
        return <TaskDetailScreen onBack={() => handleDismissPushed('TaskList')} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Underlying Base Screen Layer with iOS Parallax Shift */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          pushedScreen
            ? {
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, SCREEN_WIDTH],
                      outputRange: [-SCREEN_WIDTH * 0.25, 0],
                    }),
                  },
                ],
              }
            : null,
        ]}
      >
        {renderBaseScreen(baseScreen)}
      </Animated.View>

      {/* 2. Dimming Backdrop Scrim over Base Screen */}
      {pushedScreen && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000000',
              opacity: slideAnim.interpolate({
                inputRange: [0, SCREEN_WIDTH],
                outputRange: [0.35, 0],
              }),
            },
          ]}
        />
      )}

      {/* 3. Pushed Screen Layer with iOS Slide from Right & Edge Shadow */}
      {pushedScreen && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.pushedLayer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {renderPushedScreen(pushedScreen)}
        </Animated.View>
      )}

      {/* 4. Global Modals & Overlays */}
      <IncomingRequestModal />
      <BlockConfirmationModal />
      <ImageViewerModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pushedLayer: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 12,
  },
});
