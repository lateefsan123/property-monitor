import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { supabase } from '../supabase';
import { connectOutreachGmail, outreachRequest } from './client';
import { OUTREACH_SENDER, OUTREACH_TEMPLATES } from '../../../shared/email-outreach';
import brandIcon from '../../assets/repeat-ai-icon.png';

function Action({children,onPress,disabled}) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button,disabled && {opacity:0.45}]}><Text style={styles.buttonText}>{children}</Text></Pressable>; }
export default function OutreachApp() { return <SafeAreaProvider><OutreachSession /></SafeAreaProvider>; }
function OutreachSession() {
  const [session,setSession]=useState(undefined);
  useEffect(()=>{
    let live=true;
    supabase.auth.getSession().then(({data})=>{if(live)setSession(data.session);});
    const {data}=supabase.auth.onAuthStateChange((_,next)=>{if(live)setSession(next);});
    return ()=>{live=false;data.subscription.unsubscribe();};
  },[]);
  return <SafeAreaView style={styles.root}>{session === undefined ? <ActivityIndicator /> : session ? <Campaign key={session.user.id} userId={session.user.id} /> : <SignIn />}</SafeAreaView>;
}
function SignIn() {
  const [email,setEmail]=useState('lateefsanusiwork@gmail.com'),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function login() {
    setBusy(true);setError('');
    try {const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;}
    catch {setError('Could not sign in. Use your existing Repeat AI account.');}
    finally {setBusy(false);}
  }
  return <ScrollView contentContainerStyle={styles.content}><Brand /><Text style={styles.subtitle}>Sign in to your existing Repeat AI account to manage outreach.</Text><TextInput accessibilityLabel="Repeat AI account email" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" /><TextInput accessibilityLabel="Password" style={styles.input} secureTextEntry value={password} onChangeText={setPassword} /><Action disabled={busy} onPress={login}>Sign in</Action>{error ? <Text accessibilityRole="alert">{error}</Text> : null}</ScrollView>;
}
function Brand() {return <View style={styles.brand}><Image source={brandIcon} style={{width:48,height:48,borderRadius:12}} /><View><Text style={styles.title}>Repeat AI Outreach</Text><Text style={styles.subtitle}>Your broker email campaigns</Text></View></View>;}
function Campaign({userId}) {
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
  function start() {Alert.alert('Start this email sequence?',`Send these three emails from ${OUTREACH_SENDER}. Start at 5 emails/day, ramp to 30 including follow-ups, weekdays 9–17 Dubai time. Replies stop the sequence. A send already in progress may finish after pausing.`,[{text:'Cancel',style:'cancel'},{text:'Start',onPress:()=>run(()=>outreachRequest(userId,{action:'configure',active:true}))}]);}
  return <ScrollView contentContainerStyle={styles.content}><Brand /><Text style={styles.subtitle}>{OUTREACH_SENDER}</Text>
    <View style={styles.card}><Text style={styles.heading}>{campaign?.status || 'Not set up'}</Text><Text>{campaign?.total || 0} contacts · {campaign?.counts?.sent || 0} awaiting follow-up · {campaign?.counts?.done || 0} finished</Text><Text style={styles.subtitle}>Weekdays, 9am–5pm Dubai. 5 → 10 → 20 → 30 emails/day. Follow-ups count toward the limit.</Text>{campaign?.issue ? <Text accessibilityRole="alert">{campaign.issue}</Text> : null}</View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Action disabled={busy} onPress={()=>run(()=>connectOutreachGmail(userId))}>Connect outreach Gmail</Action>
    <Action disabled={busy || campaign?.status === 'active'} onPress={()=>run(importFile)}>Import broker CSV</Action>
    <Action disabled={busy} onPress={()=>run(()=>outreachRequest(userId,{action:'status'}))}>Refresh status</Action>
    {campaign?.status === 'active' ? <Action disabled={busy} onPress={()=>run(()=>outreachRequest(userId,{action:'configure',active:false}))}>Pause sending</Action> : <Action disabled={busy || !campaign?.total || Boolean(campaign?.counts?.held || campaign?.counts?.sending) || JSON.stringify(templates)!==JSON.stringify(campaign?.templates)} onPress={start}>Review and start</Action>}
    <Text style={styles.heading}>Email sequence</Text><Text style={styles.subtitle}>Draft wording. Personalise with {'{first_name}'} and {'{agency}'}. Any reply stops further emails.</Text>
    {templates.map((t,i)=><View style={styles.card} key={i}><Text style={styles.heading}>Email {i+1}{i===1 ? ' · 3 days later' : i===2 ? ' · 7 days after email 2' : ''}</Text><TextInput accessibilityLabel={`Email ${i+1} subject`} style={styles.input} editable={!busy && !campaign?.lastAttemptAt && campaign?.status !== 'active'} value={t.subject} onChangeText={v=>setTemplates(ts=>ts.map((x,j)=>j===i ? {...x,subject:v} : x))} /><TextInput accessibilityLabel={`Email ${i+1} body`} style={[styles.input,{minHeight:180}]} multiline editable={!busy && !campaign?.lastAttemptAt && campaign?.status !== 'active'} value={t.body} onChangeText={v=>setTemplates(ts=>ts.map((x,j)=>j===i ? {...x,body:v} : x))} /></View>)}
    <Action disabled={busy || !campaign || Boolean(campaign.lastAttemptAt) || campaign.status === 'active'} onPress={()=>run(()=>outreachRequest(userId,{action:'templates',templates}))}>Save email drafts</Action>
    <Text style={styles.subtitle}>A reply-unsubscribe footer is added to every email. Unconfirmed sends pause for manual review and are never retried automatically.</Text>
    {campaign?.contacts?.map(c=><View key={c.email} style={styles.card}><Text style={styles.heading}>{c.name}</Text><Text>{c.agency}</Text><Text>{c.status} · {c.step}/3</Text>{c.status==='held' ? <Action disabled={busy} onPress={()=>run(()=>outreachRequest(userId,{action:'exclude',emails:[c.email]}))}>Exclude from further emails</Action> : null}</View>)}
    <Action disabled={busy} onPress={()=>supabase.auth.signOut()}>Sign out</Action>
  </ScrollView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#f7f7f8'},content:{padding:22,gap:14,paddingBottom:50},brand:{flexDirection:'row',gap:12,alignItems:'center'},title:{fontSize:23,fontWeight:'700',color:'#111'},subtitle:{fontSize:14,lineHeight:21,color:'#666'},heading:{fontSize:17,fontWeight:'600',marginBottom:7},card:{padding:16,backgroundColor:'#fff',borderRadius:16,gap:6},input:{borderWidth:1,borderColor:'#ddd',padding:12,borderRadius:10,backgroundColor:'#fff',fontSize:15,textAlignVertical:'top'},button:{padding:14,borderRadius:12,backgroundColor:'#111',alignItems:'center'},buttonText:{color:'#fff',fontSize:15,fontWeight:'600'},error:{color:'#b42318'}});
