import "react-native-url-polyfill/auto";
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StatusBar, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { supabase } from '../supabase';
import AuthScreen from '../screens/AuthScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import NavigationDrawer from '../workspace/navigation-drawer';
import MotionScreen from '../components/MotionScreen';
import BottomSheet from '../components/BottomSheet';
import { Button, Feedback } from '../workspace/ui';
import { mobileQueryDefaults } from '../query-cache';
import { useThemePreference } from '../hooks/useThemePreference';
import { getTheme } from '../theme';
import { useOutreach } from './outreach-data';
import OutreachHome from './outreach-home';
import OutreachContacts from './outreach-contacts';
import OutreachTemplates from './outreach-templates';
import OutreachSchedule from './outreach-schedule';
import OutreachSettings from './outreach-settings';

const TOP = [{id:'home',label:'Home',icon:'home',kind:'nav'}];
const NAV = [
  {id:'contacts',label:'Contacts',icon:'users',kind:'nav'},
  {id:'templates',label:'Email templates',icon:'mail',kind:'nav'},
  {id:'schedule',label:'Schedule',icon:'calendar',kind:'nav'},
];
const TITLES = {home:'Home',contacts:'Contacts',templates:'Templates',schedule:'Schedule',settings:'Settings'};
const queryClient = new QueryClient({ defaultOptions: { queries: mobileQueryDefaults } });
export default function OutreachApp() {
  const [loaded,error]=useFonts(Ionicons.font);
  if(error)return <SafeAreaProvider><View style={{flex:1,justifyContent:'center',padding:24,gap:12,backgroundColor:'#fff'}}><Text accessibilityRole="alert" style={{fontSize:20,color:'#111'}}>Could not load the app's icons</Text><Text selectable style={{color:'#555'}}>Close and reopen the app. If this continues, share this detail: {error.message}</Text></View></SafeAreaProvider>;
  return <SafeAreaProvider><QueryClientProvider client={queryClient}>{loaded ? <OutreachSession /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Loading app" /></View>}</QueryClientProvider></SafeAreaProvider>;
}
function OutreachSession() {
  const [session,setSession]=useState(undefined),[recovering,setRecovering]=useState(false),[error,setError]=useState('');
  const [theme,setTheme]=useThemePreference();
  useEffect(()=>{
    let live=true;
    supabase.auth.getSession().then(({data,error})=>{if(live){setSession(data.session);if(error)setError(error.message);}});
    const {data}=supabase.auth.onAuthStateChange((event,next)=>{if(live){setSession(next);if(event==='PASSWORD_RECOVERY')setRecovering(true);}});
    return ()=>{live=false;data.subscription.unsubscribe();};
  },[]);
  if(error)return <Text accessibilityRole="alert">{error}</Text>;
  if(session===undefined)return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Restoring your account" /></View>;
  if(recovering)return <ResetPasswordScreen onComplete={()=>setRecovering(false)} />;
  if(!session)return <AuthScreen authScheme="repeat-outreach" onPasswordRecovery={()=>setRecovering(true)} />;
  return <OutreachWorkspace key={session.user.id} userId={session.user.id} email={session.user.email} displayName={session.user.user_metadata?.username?.trim() || session.user.user_metadata?.full_name?.trim().split(' ')[0] || ''} theme={theme} setTheme={setTheme} />;
}
// The outreach workspace, built like the original WorkspaceShell: the same
// drawer, page transitions, header add button and sign-out sheet.
export function OutreachWorkspace({userId,email,displayName,theme,setTheme}) {
  const colors=getTheme(theme);
  const outreach=useOutreach(userId);
  const [page,setPage]=useState('home');
  const [visited,setVisited]=useState(['home']);
  const [signoutOpen,setSignoutOpen]=useState(false);
  const [signoutError,setSignoutError]=useState(null);
  const [signingOut,setSigningOut]=useState(false);
  const [importing,setImporting]=useState(false);
  const navigate=useCallback(id=>{setPage(id);setVisited(previous=>previous.includes(id) ? previous : [...previous,id]);},[]);
  const toggleTheme=useCallback(()=>setTheme(theme==='dark' ? 'light' : 'dark'),[theme,setTheme]);
  useEffect(()=>{const listener=BackHandler.addEventListener('hardwareBackPress',()=>{if(signoutOpen){setSignoutOpen(false);return true;}if(page==='home')return false;setPage('home');return true;});return ()=>listener.remove();},[page,signoutOpen]);
  async function importFile() {
    const picked=await DocumentPicker.getDocumentAsync({type:['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],copyToCacheDirectory:true});
    if(picked.canceled)return;
    setImporting(true);
    try {
      const XLSX=await import('xlsx');
      const file=new File(picked.assets[0].uri);const book=XLSX.read(await file.arrayBuffer());
      const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:''});
      let rejected=0;
      for(let i=0;i<rows.length;i+=500){const result=await outreach.run({action:'import',contacts:rows.slice(i,i+500)});rejected+=result.errors?.length || 0;}
      Alert.alert('Import complete',rejected ? `${rejected} rows without a valid name, agency or email were skipped. Duplicate addresses are excluded.` : 'Your contacts are saved. Duplicate addresses are excluded.');
    } catch(cause) { Alert.alert('Could not import',cause.message); }
    finally { setImporting(false); }
  }
  async function signOut() {
    setSigningOut(true);setSignoutError(null);
    try {const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;}
    catch(cause){setSignoutError(cause instanceof Error ? cause.message : 'Could not sign out. Please try again.');}
    finally{setSigningOut(false);}
  }
  const common={colors,outreach,onNavigate:navigate};
  return <><StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} />
    <NavigationDrawer userId={userId} page={page} headerTitle={TITLES[page]} hideCreate colors={colors} topNavigation={TOP} mainNavigation={NAV} showSetup={false} onToggleTheme={toggleTheme} onNavigate={navigate}
      onAction={id=>id==='signout' ? setSignoutOpen(true) : navigate(id)}>
      {visited.map(id=><MotionScreen key={id} active={page===id}>
        {id==='home' ? <OutreachHome {...common} displayName={displayName} />
          : id==='contacts' ? <OutreachContacts {...common} importing={importing} onImport={importFile} />
          : id==='templates' ? <OutreachTemplates {...common} />
          : id==='schedule' ? <OutreachSchedule {...common} />
          : <OutreachSettings {...common} displayName={displayName} email={email} theme={theme} onToggleTheme={toggleTheme} />}
      </MotionScreen>)}
      <BottomSheet visible={signoutOpen} onClose={()=>!signingOut && setSignoutOpen(false)} colors={colors}>
        <View style={{padding:20,gap:12}}>
          <Text style={{color:colors.text}}>Sign out of Repeat AI?</Text>
          <Feedback colors={colors} error={signoutError} />
          <Button colors={colors} disabled={signingOut} onPress={signOut}>Sign out</Button>
          <Button colors={colors} disabled={signingOut} onPress={()=>setSignoutOpen(false)}>Cancel</Button>
        </View>
      </BottomSheet>
    </NavigationDrawer></>;
}
