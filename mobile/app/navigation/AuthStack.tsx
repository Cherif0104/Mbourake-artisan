import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from '../screens/AuthScreen';
import OnboardRoleScreen from '../screens/OnboardRoleScreen';

export type AuthStackParamList = {
  OnboardRole: undefined;
  Auth: { mode: 'login' | 'signup'; role?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardRole" component={OnboardRoleScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}
