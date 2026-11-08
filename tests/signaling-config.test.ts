import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signalingConfig} from '../lib/signaling-config.ts';
import {allowedSignalingOrigin} from '../lib/signaling-origin.ts';
test('Vercel does not fall back to a missing same-origin Socket.IO server',()=>{
  assert.ok('error' in signalingConfig({VERCEL:'1'}));
  assert.deepEqual(signalingConfig({}),{url:null});
  const databaseURL='postgresql://user:private-password@example.com/database';
  const config=signalingConfig({VERCEL:'1',DATABASE_URL:databaseURL});
  assert.deepEqual(config,{transport:'http',url:null});
  assert.ok(!JSON.stringify(config).includes('private-password'));
  assert.deepEqual(signalingConfig({VERCEL:'1',SIGNALING_SERVER_URL:'https://signal.example.com/'}),{url:'https://signal.example.com'});
  for(const url of ['http://signal.example.com','https://user:pass@signal.example.com','https://signal.example.com/socket.io','https://signal.example.com?token=secret','broken']){
    assert.ok('error' in signalingConfig({VERCEL:'1',SIGNALING_SERVER_URL:url}));
  }
});
test('separate signaling service allows only explicitly configured browser origins',()=>{
  const allowed='https://test-xyom.vercel.app, https://photos.example.com';
  assert.equal(allowedSignalingOrigin('https://test-xyom.vercel.app','signal.example.com',allowed),true);
  assert.equal(allowedSignalingOrigin('https://photos.example.com','signal.example.com',allowed),true);
  assert.equal(allowedSignalingOrigin('https://evil.example.com','signal.example.com',allowed),false);
  assert.equal(allowedSignalingOrigin('https://test-xyom.vercel.app.evil.com',undefined,allowed),false);
  assert.equal(allowedSignalingOrigin('null',undefined,allowed),false);
  assert.equal(allowedSignalingOrigin('http://localhost:3000','localhost:3000',undefined),true);
});
