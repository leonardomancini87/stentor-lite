import test from 'node:test';
import assert from 'node:assert/strict';
import { getCueText, getCueTextStyle, getCueTypography, patchCueTextStyle } from '../src/utils/cueTextStyle.js';
import { updateTranslation, updateCue } from '../src/utils/subtitleActions.js';
import { normalizeProject } from '../src/utils/projectSchema.js';
import { readProjectFile, writeProjectFileHandle } from '../src/utils/projectFiles.js';
import { buildProjectionPayload, getProjectionText } from '../src/utils/projectionTargets.js';
import { getRevealScrollTop } from '../src/utils/listScroll.js';

function fixture() {
  return normalizeProject({id:'test-contextual',title:'Contextual',languages:['it','en'],activeLanguage:'it',primaryLanguage:'it',settings:{},cues:[
    {id:'a',original:'Originale',translations:{it:'Italiano',en:'English'},note:'Solo regia',renderStyle:'normal'},
    {id:'b',translations:{it:'Altra',en:'Other'},note:'Nota B',renderStyle:'italic'},
  ]});
}
const screen={id:'it',name:'Italiano',publicLanguage:'it'};

test('contextual: compact and expanded fields share the same translation',()=>{
  let project=fixture();
  project=updateTranslation(project,'a','it','Primo aggiornamento');
  assert.equal(getCueText(project.cues[0],'it'),'Primo aggiornamento');
  project=updateTranslation(project,'a','it','Secondo aggiornamento');
  assert.equal(project.cues[0].translations.it,getCueText(project.cues[0],'it'));
  assert.equal(project.cues[0].original,'Originale');
});
test('contextual: editing one language does not overwrite another',()=>{
  const project=updateTranslation(fixture(),'a','en','New English');
  assert.equal(getCueText(project.cues[0],'en'),'New English');
  assert.equal(getCueText(project.cues[0],'it'),'Italiano');
});
test('contextual: deliberate empty text is not replaced by original text',()=>{
  const cue=updateTranslation(fixture(),'a','it','').cues[0];
  assert.equal(getCueText(cue,'it'),'');
  assert.equal(getProjectionText(cue,'it'),'');
  assert.equal(buildProjectionPayload({cue,screen}).text,'');
});
test('contextual: legacy missing translations still fall back to original',()=>{
  assert.equal(getCueText({original:'Legacy'},'it'),'Legacy');
  assert.equal(getCueText(null,'it'),'');
});
test('contextual: per-cue style changes are immutable and local',()=>{
  const original=fixture();
  const result=updateCue(original,'b',cue=>patchCueTextStyle(cue,{bold:false,align:'right'}));
  assert.equal(result.cues[0],original.cues[0]);
  assert.equal(original.cues[1].textStyle,undefined);
  assert.deepEqual(result.cues[1].textStyle,{bold:false,align:'right'});
  assert.deepEqual(result.settings,original.settings);
});
test('contextual: changing alignment preserves bold and future style metadata',()=>{
  const cue={textStyle:{bold:false,align:'left',futureValue:'preserved'}};
  const next=patchCueTextStyle(cue,{align:'center'});
  assert.deepEqual(next.textStyle,{bold:false,align:'center',futureValue:'preserved'});
});
test('contextual: style rejects unsupported property values',()=>{
  const next=patchCueTextStyle({}, {align:'url(javascript:alert(1))',bold:'true',color:'red'});
  assert.deepEqual(next.textStyle,{});
  assert.deepEqual(getCueTextStyle({textStyle:{align:'justify',bold:'false'}}),{align:'center',bold:true});
});
test('contextual: legacy weight, italic and alignment defaults are preserved',()=>{
  assert.deepEqual(getCueTypography({renderStyle:'italic'}),{fontWeight:800,fontStyle:'italic',textAlign:'center'});
  assert.equal(getCueTypography({},720).fontWeight,720);
  assert.equal(getCueTypography({textStyle:{bold:false}}).fontWeight,400);
  assert.equal(getCueTypography({textStyle:{bold:true}}).fontWeight,800);
});
test('contextual: notes do not alter translations or projection payload',()=>{
  const project=updateCue(fixture(),'a',cue=>({...cue,note:'DO NOT PROJECT THIS NOTE'}));
  const payload=buildProjectionPayload({cue:project.cues[0],screen});
  assert.equal(payload.text,'Italiano');
  assert.equal(JSON.stringify(payload).includes('DO NOT PROJECT'),false);
  assert.equal(project.cues[0].translations.it,'Italiano');
});
test('contextual: actual projection payload contains the per-cue style (always centred in Lite) and preserves screen settings',()=>{
  const cue={...fixture().cues[0],renderStyle:'italic',textStyle:{bold:false,align:'right'}};
  const target={...screen,publicFontSize:'72px',publicBackground:'#000000',publicVerticalAlign:'top'};
  const payload=buildProjectionPayload({cue,screen:target});
  assert.deepEqual(payload.cueTextStyle,{bold:false,align:'center'});
  assert.equal(payload.cueStyle,'italic');
  assert.equal(payload.settings.fontSize,'72px');
  assert.equal(payload.settings.verticalAlign,'top');
});
test('contextual: blackout still suppresses the projected text',()=>{
  const payload=buildProjectionPayload({cue:{...fixture().cues[0],textStyle:{bold:true,align:'left'}},screen,blackout:true});
  assert.equal(payload.text,'');assert.equal(payload.blackout,true);
});
test('contextual: file serialization and reopen preserve every language, styles and note',async()=>{
  const project=fixture();
  project.cues[0]={...project.cues[0],translations:{it:'\nTesto\ncon righe',en:''},renderStyle:'italic',textStyle:{bold:false,align:'left'},note:'Nota non pubblica'};
  let bytes='';
  await writeProjectFileHandle({createWritable:async()=>({write:async text=>{bytes=text},close:async()=>{}})},project);
  const reopened=await readProjectFile({text:async()=>bytes});
  assert.deepEqual(reopened.cues,project.cues);
  assert.deepEqual(reopened.languages,project.languages);
});
test('contextual: tall expanded item reveals its header, not the page',()=>{
  assert.equal(getRevealScrollTop({scrollTop:0,viewportHeight:280,scrollHeight:1800,itemTop:500,itemHeight:480}),492);
});
test('contextual: already visible expanded item keeps the current scroll position',()=>{
  assert.equal(getRevealScrollTop({scrollTop:200,viewportHeight:600,scrollHeight:1800,itemTop:230,itemHeight:380}),200);
});
