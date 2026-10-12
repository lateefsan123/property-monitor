import "react-native-url-polyfill/auto";
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, ScrollView, StatusBar, Switch, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { supabase } from '../supabase';
import AuthScreen from '../screens/AuthScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import NavigationDrawer from '../workspace/navigation-drawer';
import { Button, Card, Field, Feedback } from '../workspace/ui';
import { useThemePreference } from '../hooks/useThemePreference';
import { getTheme } from '../theme';
import { connectOutreachGmail, outreachRequest } from './client';
import { OUTREACH_SENDER, OUTREACH_TEMPLATES } from '../../../shared/email-outreach';

const TOP = [{id:'home',label:'Home',icon:'home',kind:'nav'}];
const NAV = [
  {id:'contacts',label:'Contacts',icon:'users',kind:'nav'},
  {id:'templates',label:'Email templates',icon:'message',kind:'nav'},
  {id:'schedule',label:'Schedule',icon:'calendar',kind:'nav'},
];
const TITLES = {home:'Home',contacts:'Contacts',templates:'Email templates',schedule:'Schedule',settings:'Settings'};
export default function OutreachApp() {
  const [loaded,error]=useFonts(Ionicons.font);
  if(error)return <SafeAreaProvider><View style={{flex:1,justifyContent:'center',padding:24,gap:12,backgroundColor:'#fff'}}><Text accessibilityRole="alert" style={{fontSize:20,color:'#111'}}>Could not load the app's icons</Text><Text selectable style={{color:'#555'}}>Close and reopen the app. If this continues, share this detail: {error.message}</Text></View></SafeAreaProvider>;
  return <SafeAreaProvider>{loaded ? <OutreachSession /> : <ActivityIndicator accessibilityLabel="Loading app" />}</SafeAreaProvider>;
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
  if(session===undefined)return <ActivityIndicator accessibilityLabel="Restoring your account" />;
  if(recovering)return <ResetPasswordScreen onComplete={()=>setRecovering(false)} />;
  if(!session)return <AuthScreen authScheme="repeat-outreach" onPasswordRecovery={()=>setRecovering(true)} />;
  return <Campaign key={session.user.id} userId={session.user.id} email={session.user.email} displayName={session.user.user_metadata?.full_name || 'Lateef'} theme={theme} setTheme={setTheme} />;
}
export function Campaign({userId,email,displayName,theme,setTheme}) {
  const colors=getTheme(theme),[page,setPage]=useState('home');
  const heading={color:colors.textName,fontSize:20,fontWeight:'600'};
  const body={color:colors.text,fontSize:15,lineHeight:23};
  const muted={color:colors.textMuted,fontSize:14,lineHeight:21};
  useEffect(()=>{const listener=BackHandler.addEventListener('hardwareBackPress',()=>{if(page==='home')return false;setPage('home');return true;});return ()=>listener.remove();},[page]);
  const [campaign,setCampaign]=useState(null),[templates,setTemplates]=useState(OUTREACH_TEMPLATES),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    outreachRequest(userId,{action:'status'},controller.signal).then(result=>{setCampaign(result.campaign);if(result.campaign)setTemplates(result.campaign.templates);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return ()=>controller.abort();
  },[userId]);
  async function run(action) {
    setBusy(true);setError('');
    try {const result=await action();if(result?.campaign){setCampaign(result.campaign);setTemplates(result.campaign.templates);}}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function importFile() {
    const picked=await DocumentPicker.getDocumentAsync({type:['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],copyToCacheDirectory:true});
    if(picked.canceled)return;
    const XLSX=await import('xlsx');
    const file=new File(picked.assets[0].uri);const book=XLSX.read(await file.arrayBuffer());
    const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:''});
    let result, rejected=0;
    for(let i=0;i<rows.length;i+=500){result=await outreachRequest(userId,{action:'import',contacts:rows.slice(i,i+500)});rejected+=result.errors?.length || 0;setCampaign(result.campaign);}
    if(rejected)Alert.alert('Import complete',`${rejected} invalid rows were skipped. Valid contacts are saved; duplicate addresses are excluded.`);
    return result;
  }
  function start() {Alert.alert('Start this email sequence?',`Send these three emails from ${OUTREACH_SENDER}. Start at 5 emails/day, ramp to 30 including follow-ups, weekdays 9â€“17 Dubai time. Replies stop the sequence. A send already in progress may finish after pausing.`,[{text:'Cancel',style:'cancel'},{text:'Start',onPress:()=>run(()=>outreachRequest(userId,{action:'configure',active:true}))}]);}
  const locked=busy || Boolean(campaign?.lastAttemptAt) || campaign?.status==='active';
  const signOut=()=>Alert.alert('Sign out of Repeat AI?','',[{text:'Cancel',style:'cancel'},{text:'Sign out',onPress:()=>run(async()=>{const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;})}]);
  return <><StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} /><NavigationDrawer userId={userId} page={page} headerTitle={TITLES[page]} hideCreate colors={colors} topNavigation={TOP} mainNavigation={NAV} showSetup={false} onNavigate={setPage} onAction={id=>id==='signout' ? signOut() : setPage(id)}>
    <ScrollView contentContainerStyle={{padding:20,gap:18,paddingBottom:40}} keyboardShouldPersistTaps="handled">
      <Feedback colors={colors} error={error} />
      {page==='home' && <>
        <Text style={{...heading,fontSize:26}}>Welcome back, {displayName.split(' ')[0]}</Text>
        <Text style={muted}>Your email outreach, in one place.</Text>
        <Card colors={colors}><Text style={heading}>Campaign {campaign?.status || 'loading'}</Text><Text style={body}>{(campaign?.total || 0).toLocaleString()} contacts</Text><Text style={muted}>{campaign?.counts?.sent || 0} awaiting follow-up · {campaign?.counts?.done || 0} finished</Text>{campaign?.issue ? <Text style={{...body,color:colors.errorText}}>{campaign.issue}</Text> : null}
          {campaign?.status==='active' ? <Button colors={colors} disabled={busy} onPress={()=>run(()=>outreachRequest(userId,{action:'configure',active:false}))}>Pause sending</Button> : <Button colors={colors} primary disabled={busy || !campaign?.total || Boolean(campaign?.counts?.held || campaign?.counts?.sending) || JSON.stringify(templates)!==JSON.stringify(campaign?.templates)} onPress={start}>Review and start</Button>}
        </Card>
        <Card colors={colors}><Text style={heading}>Outreach inbox</Text><Text style={body}>{OUTREACH_SENDER}</Text><Button colors={colors} icon="mail" disabled={busy} onPress={()=>run(()=>connectOutreachGmail(userId))}>Connect Gmail</Button></Card>
        <Button colors={colors} onPress={()=>setPage('templates')}>Review email templates</Button>
        <Button colors={colors} disabled={busy} onPress={()=>run(()=>outreachRequest(userId,{action:'status'}))}>Refresh status</Button>
      </>}
      {page==='contacts' && <>
        <Text style={heading}>{(campaign?.total || 0).toLocaleString()} contacts</Text><Text style={muted}>Showing the first {campaign?.contacts?.length || 0} contacts. Existing conversations and excluded contacts are checked before sending.</Text>
        <Button colors={colors} icon="table" disabled={busy || campaign?.status==='active'} onPress={()=>run(importFile)}>Import broker CSV</Button>
        {campaign?.contacts?.map(c=><Card key={c.email} colors={colors}><Text style={heading}>{c.name}</Text><Text style={muted}>{c.agency}</Text><Text style={body}>{c.email}</Text><Text style={muted}>{c.status} · {c.step}/3 emails</Text>{c.status==='held' ? <Button colors={colors} disabled={busy} onPress={()=>run(()=>outreachRequest(userId,{action:'exclude',emails:[c.email]}))}>Exclude from further emails</Button> : null}</Card>)}
      </>}
      {page==='templates' && <>
        <Text style={heading}>Your email sequence</Text><Text style={muted}>Personalise with {'{first_name}'} and {'{agency}'}. Any reply stops follow-ups.</Text>
        {templates.map((t,i)=><Card colors={colors} key={i}><Text style={heading}>Email {i+1}</Text><Text style={muted}>{i===0 ? 'Introduction' : i===1 ? '3 days after the introduction' : '7 days after email 2'}</Text><Field colors={colors} label={`Email ${i+1} subject`} editable={!locked} value={t.subject} onChangeText={v=>setTemplates(ts=>ts.map((x,j)=>j===i ? {...x,subject:v} : x))} /><Field colors={colors} label={`Email ${i+1} body`} multiline numberOfLines={9} editable={!locked} value={t.body} onChangeText={v=>setTemplates(ts=>ts.map((x,j)=>j===i ? {...x,body:v} : x))} /></Card>)}
        <Button colors={colors} primary disabled={locked || !campaign} onPress={()=>run(()=>outreachRequest(userId,{action:'templates',templates}))}>Save email drafts</Button><Text style={muted}>A reply-unsubscribe footer is included in every email.</Text>
      </>}
      {page==='schedule' && <><Text style={heading}>Sending schedule</Text><Card colors={colors}><Text style={body}>Monday–Friday · 9am–5pm Dubai</Text><Text style={muted}>Week 1: 5 emails/day{ '\n' }Week 2: 10 emails/day{ '\n' }Week 3: 20 emails/day{ '\n' }Week 4 onward: 30 emails/day</Text><Text style={muted}>Follow-ups count toward the daily limit. Emails are spaced at least 30 minutes apart.</Text></Card><Text style={muted}>Replies, opt-outs and bounces stop further contact. Unconfirmed sends pause for review.</Text></>}
      {page==='settings' && <><Text style={heading}>Account</Text><Card colors={colors}><Text style={body}>{email}</Text><Text style={muted}>Repeat AI Outreach</Text></Card><Card colors={colors}><Text style={heading}>Appearance</Text><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={body}>Dark mode</Text><Switch accessibilityLabel="Dark mode" value={colors.isDark} onValueChange={v=>setTheme(v ? 'dark' : 'light')} /></View></Card><Card colors={colors}><Text style={heading}>Sending inbox</Text><Text style={body}>{OUTREACH_SENDER}</Text><Button colors={colors} disabled={busy} onPress={()=>run(()=>connectOutreachGmail(userId))}>Connect Gmail</Button></Card><Button colors={colors} onPress={signOut}>Sign out</Button></>}
    </ScrollView>
  </NavigationDrawer></>;
}
