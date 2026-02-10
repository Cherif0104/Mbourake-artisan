import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatScreen from '../screens/ChatScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProjectCompletionScreen from '../screens/ProjectCompletionScreen';
import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';
import ProjectListScreen from '../screens/ProjectListScreen';
import ProjectPaymentScreen from '../screens/ProjectPaymentScreen';
import ProjectWorkScreen from '../screens/ProjectWorkScreen';

export type MainStackParamList = {
  Dashboard: undefined;
  ProjectList: undefined;
  ProjectDetails: { projectId: string };
  ProjectPayment: { projectId: string };
  ProjectWork: { projectId: string };
  ProjectCompletion: { projectId: string };
  Chat: { projectId: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tableau de bord' }} />
      <Stack.Screen name="ProjectList" component={ProjectListScreen} options={{ title: 'Mes projets' }} />
      <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} options={{ title: 'Détails projet' }} />
      <Stack.Screen name="ProjectPayment" component={ProjectPaymentScreen} options={{ title: 'Paiement' }} />
      <Stack.Screen name="ProjectWork" component={ProjectWorkScreen} options={{ title: 'Travaux' }} />
      <Stack.Screen name="ProjectCompletion" component={ProjectCompletionScreen} options={{ title: 'Clôture' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
    </Stack.Navigator>
  );
}
