import test from 'node:test';
import assert from 'node:assert/strict';
import { BROKER_INTRO, brokerPhone, prepareBrokerContacts, renderBrokerMessage, isBrokerOptOut } from '../shared/broker-campaign.js';
test('normalises international phones and excludes duplicates and prior outreach',()=>{
  const a={name:'Alex',agency:'Agency',phone:'+971 (0)52 123 4567'};
  assert.equal(brokerPhone(a.phone),'971521234567');
  assert.equal(prepareBrokerContacts([a,{...a,phone:'00971521234567'}]).length,1);
  assert.deepEqual(prepareBrokerContacts([a],[{phone:'971521234567'}]),[]);
  assert.throws(()=>brokerPhone('123'));
});
test('personalised broker copy focuses on seller follow-ups and rejects unsafe drafts',()=>{
  const contact={name:'Alex',agency:'Acme'};
  const text=renderBrokerMessage(BROKER_INTRO,contact,'https://repeatai.org');
  assert.ok(text.includes('Hi Alex'));
  assert.ok(text.includes('Acme website'));
  assert.ok(text.includes('follows up with your sellers'));
  assert.throws(()=>renderBrokerMessage('{unknown}',contact,''));
  assert.throws(()=>renderBrokerMessage('x'.repeat(1025),contact,''));
});
test('recognises opt-outs without treating a normal question as an opt-out',()=>{
  assert.equal(isBrokerOptOut('Please remove me'),true);
  assert.equal(isBrokerOptOut('not interested thanks'),true);
  assert.equal(isBrokerOptOut('What does it cost?'),false);
});
