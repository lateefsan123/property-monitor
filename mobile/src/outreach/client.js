/* global process */
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';
import { integrationRequest } from '../workspace/integration-client';

export async function outreachRequest(userId,body,signal) {
  const {data,error}=await supabase.auth.getSession();
  if (error || !data.session || data.session.user.id !== userId) throw new Error('Sign in again to manage your outreach.');
  const origin=process.env.EXPO_PUBLIC_OUTREACH_API_ORIGIN || 'https://repeatai.org';
  const response=await fetch(`${origin}/api/outreach`,{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>null);
  if (!response.ok || !result) throw new Error(result?.error || 'Could not load outreach.');
  return result;
}

export async function connectOutreachGmail(userId) {
  const start=await integrationRequest({action:'begin',provider:'google',feature:'email',capability:'send',client:'outreach'},undefined,userId);
  const url=new URL(start.authorizationUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'accounts.google.com') throw new Error('Invalid connection destination');
  const state=url.searchParams.get('state');
  const response=await WebBrowser.openAuthSessionAsync(url.href,'repeat-outreach://integrations');
  if (response.type !== 'success') return;
  const callback=new URL(response.url);
  if (callback.protocol !== 'repeat-outreach:' || callback.hostname !== 'integrations' || callback.searchParams.get('provider') !== 'google' || callback.searchParams.get('state') !== state) throw new Error('Connection did not match');
  return integrationRequest({action:'complete',provider:'google',state,code:callback.searchParams.get('code'),error:callback.searchParams.get('error')},undefined,userId);
}
