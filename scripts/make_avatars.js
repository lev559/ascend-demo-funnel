const { createAvatar } = require('@dicebear/core'); const c = require('@dicebear/collection'); const fs=require('fs');
const v=(n)=>'variant'+String(n).padStart(2,'0');
const F={
 nora:{bg:'b9a8ff',hair:28,lips:23,eyes:1,body:12},
 ines:{bg:'7cc6b8',hair:48,lips:17,eyes:4,body:13,glasses:11},
 max:{bg:'ffd166',hair:20,lips:5,eyes:5,body:22,gesture:'waveLongArm'},
 theo:{bg:'ffb36b',hair:6,lips:17,eyes:4,body:6,beard:2},
};
const out=__dirname+'/../public/avatars/'; // npm i @dicebear/core @dicebear/collection, then: node scripts/make_avatars.js
for(const [id,o] of Object.entries(F)){
 const svg=createAvatar(c.notionists,{beardProbability:o.beard?100:0,glassesProbability:o.glasses?100:0,gestureProbability:o.gesture?100:0,bodyIconProbability:0,
  hair:[v(o.hair)],lips:[v(o.lips)],eyes:[v(o.eyes)],brows:[v(1)],nose:[v(1)],body:[v(o.body)],
  ...(o.beard?{beard:[v(o.beard)]}:{}),...(o.glasses?{glasses:[v(o.glasses)]}:{}),...(o.gesture?{gesture:[o.gesture]}:{}),backgroundColor:[o.bg],radius:50}).toString();
 fs.writeFileSync(out+id+'.svg',svg);
}
