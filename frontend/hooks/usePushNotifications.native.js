import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
// import * as Notifications from 'expo-notifications';
const Notifications = {}; // Dummy object for Expo Go
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { registerDeviceToken } from '../api/core';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// if (!isExpoGo) {
//   Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//       shouldShowAlert: true,
//       shouldPlaySound: true,
//       shouldSetBadge: true,
//     }),
//   });
// }

export function usePushNotifications(user) {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!user || isExpoGo) return;

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Send to our Django backend
        registerDeviceToken(token, Platform.OS.toUpperCase())
          .catch(err => console.error("Failed to register device token on backend:", err));
      }
    });

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
      });
    } catch (e) {
      console.log('Failed to attach push notification listeners');
    }

    return () => {
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (e) {}
    };
  }, [user]);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  if (isExpoGo) return null;

  let token;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (e) {}
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } catch (e) {
      console.log('Push tokens not supported in this environment');
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
