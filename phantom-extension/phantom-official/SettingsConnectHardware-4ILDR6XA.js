import{a as N,c as D,d as F,g as G}from"./chunk-OH7QOVHP.js";import{a as f}from"./chunk-UVU2DFLU.js";import"./chunk-SWWYIJEC.js";import{a as T}from"./chunk-EL5AUATM.js";import"./chunk-NQWEBYJD.js";import"./chunk-2ZXVKCJQ.js";import"./chunk-WD6CRZ7D.js";import"./chunk-7M6V623U.js";import"./chunk-Q7EFTJLZ.js";import"./chunk-QQL7KG33.js";import"./chunk-MDZMKEZM.js";import"./chunk-PTJHYG2U.js";import"./chunk-P4ZL5KWS.js";import{a as L}from"./chunk-CEZMY2VY.js";import"./chunk-TRAXC57E.js";import"./chunk-252ILOVK.js";import"./chunk-IV2YAN4G.js";import"./chunk-SCZD5JNT.js";import"./chunk-HRPW7DWY.js";import"./chunk-FFNPQTO5.js";import"./chunk-3KWWVBRC.js";import"./chunk-PSYLTVFG.js";import"./chunk-QGYMCRC7.js";import"./chunk-UNPIHQLD.js";import"./chunk-FXCMZB3P.js";import"./chunk-WZIUK5ED.js";import"./chunk-KXXMDE73.js";import{c as _}from"./chunk-TN4WWJWX.js";import{a as u}from"./chunk-4CYOLQKB.js";import"./chunk-M2JZP6J5.js";import"./chunk-NPFU243X.js";import{a as S}from"./chunk-IZ6TKT6W.js";import"./chunk-6R5SHFYO.js";import"./chunk-77BBM4YY.js";import"./chunk-QWMCWRVK.js";import"./chunk-YVR742VV.js";import"./chunk-RP4HT6XN.js";import"./chunk-BYWSHP5V.js";import"./chunk-JJOKJNIW.js";import"./chunk-HETLV2MV.js";import"./chunk-LP7JNY3B.js";import"./chunk-4Z7SMQUN.js";import"./chunk-AUAJXQXU.js";import"./chunk-K5HHPSTF.js";import{p as s,w as O}from"./chunk-6C52MCLT.js";import"./chunk-OERJXOXU.js";import"./chunk-UCBZOSRF.js";import"./chunk-IKQYPAXW.js";import"./chunk-PFNJNBM2.js";import"./chunk-55Q6ZFSF.js";import"./chunk-XEI5RGHZ.js";import"./chunk-GZVOHEMO.js";import"./chunk-TMK4CY5E.js";import"./chunk-QPRXGMQJ.js";import"./chunk-BR4JE5OD.js";import"./chunk-BRFTXGI6.js";import"./chunk-R4TGE3F2.js";import"./chunk-HYOCMEEG.js";import"./chunk-U6X5ZLHM.js";import"./chunk-7X5IGQSF.js";import{Ad as B,Hd as E}from"./chunk-M4V43KDP.js";import"./chunk-7LN3AER5.js";import"./chunk-46FGAK6J.js";import{H as e,Q as P,S as $}from"./chunk-HG4P4WCJ.js";import"./chunk-Q24656HF.js";import"./chunk-7KFKYD5L.js";import"./chunk-VU23O6LP.js";import"./chunk-RFTHTXRF.js";import{d as v}from"./chunk-YTFWYDJ6.js";import{a as H}from"./chunk-O2FNG2JZ.js";import"./chunk-TVMPABNZ.js";import"./chunk-4M6V6BRQ.js";import"./chunk-O2N6PUOM.js";import"./chunk-UNDMYLJW.js";import{f as A,h as n,n as i}from"./chunk-3KENBVE7.js";n();i();var t=A(H());n();i();var a=A(H());n();i();var I=s(u)`
  cursor: pointer;
  width: 24px;
  height: 24px;
  transition: background-color 200ms ease;
  background-color: ${o=>o.$isExpanded?e.colors.legacy.black:e.colors.legacy.bgButton} !important;
  :hover {
    background-color: ${e.colors.legacy.gray};
    svg {
      fill: white;
    }
  }
  svg {
    fill: ${o=>o.$isExpanded?"white":e.colors.legacy.textSecondary};
    transition: fill 200ms ease;
    position: relative;
    ${o=>o.top?`top: ${o.top}px;`:""}
    ${o=>o.right?`right: ${o.right}px;`:""}
  }
`;var V=s(L).attrs({justify:"space-between"})`
  background-color: ${e.colors.legacy.bgWallet};
  padding: 10px 16px;
  border-bottom: 1px solid ${e.colors.legacy.borderSecondary};
  height: 46px;
  opacity: ${o=>o.opacity??"1"};
`,q=s.div`
  display: flex;
  margin-left: 10px;
  > * {
    margin-right: 10px;
  }
`,M=s.div`
  width: 24px;
  height: 24px;
`,W=({onBackClick:o,totalSteps:c,currentStepIndex:l,isHidden:d,showBackButtonOnFirstStep:r,showBackButton:g=!0})=>a.default.createElement(V,{opacity:d?0:1},g&&(r||l!==0)?a.default.createElement(I,{right:1,onClick:o},a.default.createElement(O,null)):a.default.createElement(M,null),a.default.createElement(q,null,v(c).map(p=>{let m=p<=l?e.colors.legacy.accentPrimary:e.colors.legacy.bgButton;return a.default.createElement(u,{key:p,diameter:12,color:m})})),a.default.createElement(M,null));n();i();var K=()=>{let{mutateAsync:o}=E(),{hardwareStepStack:c,pushStep:l,popStep:d,currentStep:r,setOnConnectHardwareAccounts:g,setOnConnectHardwareDone:y,setExistingAccounts:p}=N(),{data:m=[],isFetched:x,isError:k}=B(),C=_(c,(h,U)=>h?.length===U.length),X=c.length>(C??[]).length,b=C?.length===0,j={initial:{x:b?0:X?150:-150,opacity:b?1:0},animate:{x:0,opacity:1},exit:{opacity:0},transition:{duration:.2}},J=(0,t.useCallback)(()=>{r()?.props.preventBack||(r()?.props.onBackCallback&&r()?.props.onBackCallback?.(),d())},[r,d]);return T(()=>{g(async h=>{await o(h),await S.set(f,!await S.get(f))}),y(()=>self.close()),l(t.default.createElement(G,null))},c.length===0),(0,t.useEffect)(()=>{p({data:m,isFetched:x,isError:k})},[m,x,k,p]),t.default.createElement(D,null,t.default.createElement(W,{totalSteps:3,onBackClick:J,showBackButton:!r()?.props.preventBack,currentStepIndex:c.length-1}),t.default.createElement(P,{mode:"wait"},t.default.createElement($.div,{style:{display:"flex",flexGrow:1},key:`${c.length}_${C?.length}`,...j},t.default.createElement(F,null,r()))))},Po=K;export{Po as default};
//# sourceMappingURL=SettingsConnectHardware-4ILDR6XA.js.map
