// frontend/app/index.js
// Decides where to go at start-up: into the app if a session was restored, else login.
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '../store/authSlice';

export default function Index() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  if (isAuthenticated && user) {
    return <Redirect href="/(app)/dashboard" />;
  }
  return <Redirect href="/(auth)/login" />;
}
